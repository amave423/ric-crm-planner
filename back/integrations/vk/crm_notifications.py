from django.conf import settings
from django.core import signing
from django.urls import reverse

from users.models import Application, Notification, Profile, Status

from .services import VKAPIError, VKConfigurationError, send_vk_message
from users.vk_profiles import refresh_profile_vk_user_id


TESTING_STATUS_NAME = "Прохождение тестирования"
CHAT_LINK_SENT_STATUS_NAME = "Отправлена ссылка на орг. чат"
CHAT_JOINED_STATUS_NAME = "Добавился в орг. чат"
CHAT_LINK_SALT = "vk-application-chat-link"
CHAT_LINK_PLACEHOLDER = "{chat_link}"


def build_testing_started_message(application: Application) -> str:
    event_name = application.event.name if application.event_id else "мероприятие"
    return (
        f'Ваша заявка на мероприятие "{event_name}" переведена на этап тестирования. '
        "Ожидайте инструкции по прохождению теста."
    )


def get_application_organizers(application: Application):
    if not application.event_id:
        return []

    recipients = list(application.event.organizers.all())
    if application.event.leader_id and all(recipient.id != application.event.leader_id for recipient in recipients):
        recipients.append(application.event.leader)
    return [recipient for recipient in recipients if recipient]


def notify_organizers_about_vk_error(application: Application, reason: str) -> None:
    student_name = application.user.get_full_name() or application.user.email or str(application.user)
    event_name = application.event.name if application.event_id else "мероприятие"

    for organizer in get_application_organizers(application):
        Notification.objects.create(
            user=organizer,
            title="Ошибка отправки VK",
            message=(
                f"Не удалось отправить VK-сообщение проектанту {student_name} "
                f'по заявке на мероприятие "{event_name}". Причина: {reason}'
            ),
            link="/requests",
        )


def notify_organizers_about_chat_join(application: Application) -> None:
    student_name = application.user.get_full_name() or application.user.email or str(application.user)
    event_name = application.event.name if application.event_id else "мероприятие"

    for organizer in get_application_organizers(application):
        Notification.objects.create(
            user=organizer,
            title="Проектант перешел в орг.чат",
            message=f'Проектант {student_name} перешел по ссылке на орг.чат мероприятия "{event_name}".',
            link="/requests",
        )


def build_application_chat_link(application: Application, request=None, chat_url: str = "") -> str:
    payload = {"application_id": application.id}
    event_chat_url = application.event.org_chat_url if application.event_id and application.event else ""
    target_url = chat_url or event_chat_url or settings.VK_ORG_CHAT_URL
    if target_url:
        payload["chat_url"] = target_url

    token = signing.dumps(payload, salt=CHAT_LINK_SALT)
    url = reverse("vk-chat-link-redirect", kwargs={"token": token})
    if settings.VK_CHAT_LINK_BASE_URL:
        return f"{settings.VK_CHAT_LINK_BASE_URL.rstrip('/')}{url}"
    if request is None:
        return url
    return request.build_absolute_uri(url)


def inject_application_chat_link(message: str, application: Application, request=None, chat_url: str = "") -> str:
    chat_link = build_application_chat_link(application, request, chat_url=chat_url)
    if CHAT_LINK_PLACEHOLDER in message:
        return message.replace(CHAT_LINK_PLACEHOLDER, chat_link)
    return f"{message}\n\nСсылка на орг.чат: {chat_link}"


def resolve_chat_joined_status() -> Status:
    status_obj = Status.objects.filter(name=CHAT_JOINED_STATUS_NAME).order_by("id").first()
    if status_obj:
        return status_obj

    return Status.objects.create(
        name=CHAT_JOINED_STATUS_NAME,
        description="Проектант перешел по индивидуальной ссылке на организационный чат.",
        is_positive=True,
    )


def mark_application_chat_link_opened(token: str) -> tuple[Application, str]:
    payload = signing.loads(
        token,
        salt=CHAT_LINK_SALT,
        max_age=settings.VK_CHAT_LINK_MAX_AGE_SECONDS,
    )
    application = Application.objects.select_related("user", "event", "event__leader").prefetch_related(
        "event__organizers"
    ).get(pk=payload["application_id"])
    event_chat_url = application.event.org_chat_url if application.event_id and application.event else ""
    redirect_url = payload.get("chat_url") or event_chat_url or settings.VK_ORG_CHAT_URL
    if not redirect_url:
        return application, ""

    if not application.status_id or application.status.name != CHAT_LINK_SENT_STATUS_NAME:
        return application, redirect_url

    joined_status = resolve_chat_joined_status()
    if application.status_id != joined_status.id:
        previous_status = application.status.name if application.status_id else ""
        application.status = joined_status
        application.save(update_fields=["status"])
        notify_organizers_about_chat_join(application)
        from users.automation_engine import run_crm_automation

        run_crm_automation(
            application,
            "notification.chat_link_opened",
            previous_status=previous_status,
        )

    return application, redirect_url


def send_application_vk_message(application: Application, message: str, keyboard: dict | None = None) -> int:
    profile = Profile.objects.filter(user=application.user).only("vk", "vk_user_id", "vk_confirmed_at").first()
    vk_user_id = refresh_profile_vk_user_id(profile) if profile else None
    if not vk_user_id:
        raise ValueError("у проектанта не указан корректный VK")
    if profile and not profile.vk_confirmed_at:
        raise ValueError("проектант не подтвердил VK-бота")

    return send_vk_message(user_id=vk_user_id, message=message, keyboard=keyboard)


def notify_application_testing_started(application: Application, previous_status_id: int | None = None) -> int | None:
    if not settings.VK_ENABLED:
        return None

    if application.status_id == previous_status_id:
        return None

    if not application.status_id or application.status.name != TESTING_STATUS_NAME:
        return None

    try:
        return send_application_vk_message(application, build_testing_started_message(application))
    except (VKConfigurationError, VKAPIError, ValueError) as exc:
        notify_organizers_about_vk_error(application, str(exc))
        return None
