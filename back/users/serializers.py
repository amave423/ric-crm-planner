from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.urls import reverse
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, Serializer

from .models import CRMRole, ROLE_PROJECTANT, ROLE_CURATOR, ROLE_ADMIN
from .models import (
    Application,
    Direction,
    Event,
    EventSpecialization,
    Notification,
    Profile,
    Project,
    Specialization,
    Status,
)


DEFAULT_APPLICATION_STATUS_NAME = "Прислал заявку"
DEFAULT_APPLICATION_STATUS_NAMES = (
    "Прислал заявку",
    "Прохождение тестирования",
    "Добавился в орг чат",
    "Приступил к ПШ",
)


def build_user_display_name(user) -> str:
    if not user:
        return ""

    parts = [getattr(user, "last_name", ""), getattr(user, "first_name", "")]
    return " ".join(part for part in parts if part).strip()


def resolve_application_status() -> Status | None:
    for status_name in DEFAULT_APPLICATION_STATUS_NAMES:
        Status.objects.get_or_create(
            name=status_name,
            defaults={"description": "", "is_positive": True},
        )

    status_obj = Status.objects.filter(name=DEFAULT_APPLICATION_STATUS_NAME).first()
    if status_obj:
        return status_obj

    status_obj, _ = Status.objects.get_or_create(
        name=DEFAULT_APPLICATION_STATUS_NAME,
        defaults={"description": "", "is_positive": True},
    )
    return status_obj


class FlexibleSpecializationField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        if data in (None, ""):
            return None

        if isinstance(data, str):
            normalized = data.strip()
            if not normalized:
                return None

            if not normalized.isdigit():
                specialization = self.get_queryset().filter(name__iexact=normalized).first()
                if specialization:
                    return specialization
                raise serializers.ValidationError("Unknown specialization.")

        return super().to_internal_value(data)


class FlexibleStatusField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        if data in (None, ""):
            return None

        if isinstance(data, str):
            normalized = data.strip()
            if not normalized:
                return None

            if not normalized.isdigit():
                status_obj = self.get_queryset().filter(name__iexact=normalized).first()
                if status_obj:
                    return status_obj
                raise serializers.ValidationError("Unknown status.")

        return super().to_internal_value(data)


class UserSerializer(ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ("id", "email", "username", "first_name", "last_name", "role")

    def get_role(self, obj):
        if getattr(obj, "is_superuser", False) or getattr(obj, "is_staff", False):
            return "organizer"

        role_obj = CRMRole.objects.filter(user=obj).first()
        if not role_obj:
            return "student"
        if role_obj.role_type == ROLE_PROJECTANT:
            return "student"
        if role_obj.role_type in (ROLE_CURATOR, ROLE_ADMIN):
            return "organizer"
        return "student"


class RegisterUserSerializer(ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)
    password_confirmation = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = get_user_model()
        fields = (
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirmation",
        )
        extra_kwargs = {
            "password": {"write_only": True},
            "username": {"required": False},
        }

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        user_model = get_user_model()

        if user_model.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")

        if user_model.objects.filter(username__iexact=normalized_email).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")

        return normalized_email

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirmation"):
            raise serializers.ValidationError({"password_confirmation": "Passwords do not match."})
        if not attrs.get("username"):
            attrs["username"] = attrs["email"]

        user_candidate = get_user_model()(
            email=attrs.get("email", ""),
            username=attrs.get("username", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        password_validation.validate_password(attrs.get("password"), user=user_candidate)
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirmation", None)
        try:
            with transaction.atomic():
                user = get_user_model().objects.create_user(**validated_data, is_active=True)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"email": "Пользователь с таким email уже существует."}
            ) from exc
        return user


class LoginUserSerializer(Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data.get("email"), password=data.get("password"))
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials.")


class PasswordResetRequestSerializer(Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        try:
            user = get_user_model().objects.get(email=value)
        except get_user_model().DoesNotExist:
            raise serializers.ValidationError("User with this email was not found.")

        if not user.is_active:
            raise serializers.ValidationError("Account is not active.")

        self.context["user"] = user
        return value

    def create(self, validated_data):
        user = self.context["user"]
        token = default_token_generator.make_token(user)

        request = self.context.get("request")
        reset_path = reverse("password-reset-confirm")
        reset_link = (
            request.build_absolute_uri(f"{reset_path}?email={user.email}&token={token}")
            if request
            else f"{reset_path}?email={user.email}&token={token}"
        )

        send_mail(
            subject="Password reset",
            message=f"Use this link to reset your password: {reset_link}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email],
            fail_silently=True,
        )

        return {"email": user.email}


class PasswordResetConfirmSerializer(Serializer):
    email = serializers.EmailField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    new_password_confirmation = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        try:
            user = get_user_model().objects.get(email=attrs.get("email"))
        except get_user_model().DoesNotExist:
            raise serializers.ValidationError({"email": "User with this email was not found."})

        if not default_token_generator.check_token(user, attrs.get("token")):
            raise serializers.ValidationError({"token": "Token is invalid or expired."})

        if attrs.get("new_password") != attrs.get("new_password_confirmation"):
            raise serializers.ValidationError({"new_password_confirmation": "Passwords do not match."})

        password_validation.validate_password(attrs.get("new_password"), user)

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        with transaction.atomic():
            user.set_password(self.validated_data["new_password"])
            user.save(update_fields=["password"])
        return user


class EmailConfirmationSerializer(Serializer):
    email = serializers.EmailField(required=True)
    token = serializers.CharField(required=True)

    def validate(self, attrs):
        try:
            user = get_user_model().objects.get(email=attrs.get("email"))
        except get_user_model().DoesNotExist:
            raise serializers.ValidationError({"email": "User with this email was not found."})

        if user.is_active:
            raise serializers.ValidationError({"email": "Account is already active."})

        if not default_token_generator.check_token(user, attrs.get("token")):
            raise serializers.ValidationError({"token": "Token is invalid or expired."})

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.is_active = True
        user.save(update_fields=["is_active"])
        return user


class ProfileSerializer(ModelSerializer):
    class Meta:
        model = Profile
        fields = (
            "surname",
            "name",
            "patronymic",
            "telegram",
            "email",
            "course",
            "university",
            "vk",
            "job",
            "workplace",
            "specialty",
            "about",
        )


class EventSerializer(ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)
    startDate = serializers.DateField(source="start_date", read_only=True)
    endDate = serializers.DateField(source="end_date", read_only=True)
    applyDeadline = serializers.DateTimeField(source="end_app_date", read_only=True)
    organizer = serializers.IntegerField(source="leader_id", read_only=True)
    organizerName = serializers.SerializerMethodField()
    specializations = serializers.PrimaryKeyRelatedField(
        queryset=Specialization.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "specialization",
            "specializations",
            "leader",
            "organizer",
            "organizerName",
            "name",
            "description",
            "stage",
            "startDate",
            "start_date",
            "endDate",
            "end_date",
            "applyDeadline",
            "end_app_date",
        )
        read_only_fields = (
            "id",
            "title",
            "startDate",
            "endDate",
            "applyDeadline",
            "organizer",
            "organizerName",
        )

    def get_organizerName(self, obj):
        return build_user_display_name(obj.leader) or None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        specializations = list(
            Specialization.objects.filter(event_specializations__event=instance).distinct()
        )
        if not specializations and instance.specialization_id:
            specializations = [instance.specialization]
        data["specializations"] = SpecializationSerializer(specializations, many=True).data
        return data

    def _resolve_specializations(self, validated_data):
        multi_value = validated_data.pop("specializations", serializers.empty)
        single_value = validated_data.get("specialization", serializers.empty)

        if multi_value is not serializers.empty:
            return list(multi_value)
        if single_value is serializers.empty:
            return None
        if single_value is None:
            return []
        return [single_value]

    def _sync_specializations(self, event, chosen_specializations):
        EventSpecialization.objects.filter(event=event).delete()
        if not chosen_specializations:
            return

        EventSpecialization.objects.bulk_create(
            [
                EventSpecialization(event=event, specialization=specialization)
                for specialization in chosen_specializations
            ],
            ignore_conflicts=True,
        )

    def create(self, validated_data):
        chosen_specializations = self._resolve_specializations(validated_data)
        if chosen_specializations:
            validated_data["specialization"] = chosen_specializations[0]

        event = super().create(validated_data)
        if chosen_specializations is not None:
            self._sync_specializations(event, chosen_specializations)
        return event

    def update(self, instance, validated_data):
        chosen_specializations = self._resolve_specializations(validated_data)
        if chosen_specializations is not None:
            validated_data["specialization"] = chosen_specializations[0] if chosen_specializations else None

        event = super().update(instance, validated_data)
        if chosen_specializations is not None:
            self._sync_specializations(event, chosen_specializations)
        return event


class DirectionSerializer(ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(read_only=True)
    title = serializers.CharField(source="name", read_only=True)
    eventId = serializers.IntegerField(source="event_id", read_only=True)
    organizer = serializers.IntegerField(source="leader_id", read_only=True)
    organizerName = serializers.SerializerMethodField()

    class Meta:
        model = Direction
        fields = (
            "id",
            "title",
            "name",
            "description",
            "event",
            "eventId",
            "leader",
            "organizer",
            "organizerName",
        )

    def get_organizerName(self, obj):
        return build_user_display_name(obj.leader) or None

    def create(self, validated_data):
        event = self.context.get("event")
        if not event:
            raise serializers.ValidationError({"event": "Event was not found."})

        validated_data["event"] = event
        return super().create(validated_data)


class ProjectSerializer(ModelSerializer):
    direction = serializers.PrimaryKeyRelatedField(read_only=True)
    title = serializers.CharField(source="name", read_only=True)
    directionId = serializers.IntegerField(source="direction_id", read_only=True)
    curatorId = serializers.IntegerField(source="curator_id", read_only=True)
    curatorName = serializers.SerializerMethodField()
    direction_id = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), write_only=True, source="direction", required=False
    )

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "name",
            "description",
            "direction",
            "directionId",
            "direction_id",
            "curator",
            "curatorId",
            "curatorName",
            "teams",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "direction")

    def get_curatorName(self, obj):
        return build_user_display_name(obj.curator) or None

    def create(self, validated_data):
        direction = validated_data.get("direction") or self.context.get("direction")
        if not direction:
            raise serializers.ValidationError({"direction": "Direction was not found."})

        validated_data["direction"] = direction
        return super().create(validated_data)


class ApplicationCreateSerializer(ModelSerializer):
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(), write_only=True, source="event", required=False
    )
    direction_id = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), write_only=True, source="direction", required=False
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), required=False, allow_null=True
    )
    project_ref = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
        source="project",
    )
    specialization = FlexibleSpecializationField(
        queryset=Specialization.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Application
        fields = (
            "id",
            "message",
            "is_link",
            "comment",
            "date_sub",
            "date_end",
            "direction",
            "direction_id",
            "event",
            "event_id",
            "project",
            "project_ref",
            "specialization",
        )
        read_only_fields = ("id", "date_sub", "date_end", "direction", "event")

    def create(self, validated_data):
        payload = dict(validated_data)
        event = payload.get("event") or self.context.get("event")
        direction = payload.get("direction") or self.context.get("direction")
        project = payload.get("project")
        user = self.context["request"].user

        if not event:
            raise serializers.ValidationError({"event": "Event is required."})

        if project and direction is None:
            direction = project.direction

        if direction and direction.event_id != event.id:
            raise serializers.ValidationError({"direction": "Direction does not belong to event."})

        if project and project.direction.event_id != event.id:
            raise serializers.ValidationError({"project": "Project does not belong to event."})

        if project and direction and project.direction_id != direction.id:
            raise serializers.ValidationError({"project": "Project does not belong to direction."})

        if timezone.now() > event.end_app_date:
            raise serializers.ValidationError({"event": "Application deadline has expired."})

        if Application.objects.filter(user=user, event=event).exists():
            raise serializers.ValidationError({"event": "Application for this event already exists."})

        payload.pop("event", None)
        payload.pop("direction", None)

        try:
            application = Application.objects.create(
                **payload,
                user=user,
                event=event,
                direction=direction,
                date_sub=timezone.now(),
                date_end=event.end_app_date,
                status=resolve_application_status(),
            )
            if event.leader_id:
                student_name = build_user_display_name(user) or user.email
                Notification.objects.create(
                    user=event.leader,
                    title="Новая заявка",
                    message=f'{student_name} подал(а) заявку на мероприятие "{event.name}".',
                    link="/requests",
                )
            return application
        except IntegrityError:
            raise serializers.ValidationError({"event": "Application for this event already exists."})

    def validate(self, attrs):
        project_input = self.initial_data.get("project")
        project_ref_input = self.initial_data.get("project_ref")

        if (
            project_input
            and project_ref_input
            and str(project_input) != str(project_ref_input)
        ):
            raise serializers.ValidationError(
                {"project": "project and project_ref must match."}
            )

        return super().validate(attrs)


class ApplicationSerializer(ModelSerializer):
    ownerId = serializers.IntegerField(source="user_id", read_only=True)
    studentName = serializers.SerializerMethodField()
    userName = serializers.SerializerMethodField()
    userEmail = serializers.EmailField(source="user.email", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    eventId = serializers.IntegerField(source="event_id", read_only=True)
    eventTitle = serializers.CharField(source="event.name", read_only=True)
    eventName = serializers.CharField(source="event.name", read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True)
    directionId = serializers.IntegerField(source="direction_id", read_only=True)
    direction_name = serializers.CharField(source="direction.name", read_only=True)
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), required=False, allow_null=True
    )
    project_ref = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
        source="project",
    )
    specialization = FlexibleSpecializationField(
        queryset=Specialization.objects.all(),
        required=False,
        allow_null=True,
    )
    status = FlexibleStatusField(
        queryset=Status.objects.all(),
        required=False,
        allow_null=True,
    )
    specializationId = serializers.IntegerField(source="specialization_id", read_only=True)
    statusId = serializers.IntegerField(source="status_id", read_only=True)
    projectId = serializers.IntegerField(source="project.id", read_only=True)
    projectTitle = serializers.CharField(source="project.name", read_only=True)
    createdAt = serializers.DateTimeField(source="date_sub", read_only=True)
    dateSub = serializers.DateTimeField(source="date_sub", read_only=True)

    class Meta:
        model = Application
        fields = (
            "id",
            "message",
            "is_link",
            "is_approved",
            "comment",
            "date_sub",
            "dateSub",
            "createdAt",
            "date_end",
            "user",
            "ownerId",
            "studentName",
            "userName",
            "userEmail",
            "user_email",
            "direction",
            "directionId",
            "direction_name",
            "event",
            "eventId",
            "eventTitle",
            "eventName",
            "event_name",
            "project",
            "project_ref",
            "projectId",
            "projectTitle",
            "specialization",
            "specializationId",
            "status",
            "statusId",
            "team_id",
            "tests_assigned",
            "tests_assigned_at",
            "test_session_id",
        )
        read_only_fields = ("id", "user", "direction", "event", "date_sub")

    def get_studentName(self, obj):
        return build_user_display_name(obj.user) or obj.user.email

    def get_userName(self, obj):
        return self.get_studentName(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["specialization"] = (
            SpecializationSerializer(instance.specialization).data
            if instance.specialization_id
            else None
        )
        data["status"] = instance.status.name if instance.status_id else None
        return data

    def validate(self, attrs):
        project_input = self.initial_data.get("project")
        project_ref_input = self.initial_data.get("project_ref")

        if (
            project_input
            and project_ref_input
            and str(project_input) != str(project_ref_input)
        ):
            raise serializers.ValidationError(
                {"project": "project and project_ref must match."}
            )

        return super().validate(attrs)


class StatusSerializer(ModelSerializer):
    class Meta:
        model = Status
        fields = ("id", "name", "description", "is_positive")


class NotificationSerializer(ModelSerializer):
    userId = serializers.IntegerField(source="user_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "userId", "title", "message", "link", "read", "createdAt")
        read_only_fields = ("id", "userId", "createdAt")


class NotificationCreateSerializer(ModelSerializer):
    class Meta:
        model = Notification
        fields = ("title", "message", "link")

    def create(self, validated_data):
        return Notification.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )


class SpecializationSerializer(ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)

    class Meta:
        model = Specialization
        fields = ("id", "name", "title", "description")
