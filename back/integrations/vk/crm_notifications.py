from django.conf import settings

from users.models import Application, Notification, Profile

from .services import VKAPIError, VKConfigurationError, resolve_vk_user_id, send_vk_message


TESTING_STATUS_NAME = "Прохождение тестирования"


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
                f'Не удалось отправить VK-сообщение проектанту {student_name} '
                f'по заявке на мероприятие "{event_name}". Причина: {reason}'
            ),
            link="/requests",
        )


def notify_application_testing_started(application: Application, previous_status_id: int | None = None) -> int | None:
    if not settings.VK_ENABLED:
        return None

    if application.status_id == previous_status_id:
        return None

    if not application.status_id or application.status.name != TESTING_STATUS_NAME:
        return None

    profile = Profile.objects.filter(user=application.user).only("vk").first()
    vk_value = profile.vk if profile else ""
    try:
        vk_user_id = resolve_vk_user_id(vk_value)
    except (VKConfigurationError, VKAPIError) as exc:
        notify_organizers_about_vk_error(application, str(exc))
        return None

    if not vk_user_id:
        notify_organizers_about_vk_error(application, "у проектанта не указан корректный VK")
        return None

    try:
        return send_vk_message(user_id=vk_user_id, message=build_testing_started_message(application))
    except (VKConfigurationError, VKAPIError, ValueError) as exc:
        notify_organizers_about_vk_error(application, str(exc))
        return None
