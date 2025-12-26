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

from .models import Application, Direction, Event, Profile, Project, Specialization, Status


class UserSerializer(ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = ("id", "email", "username", "first_name", "last_name")


class RegisterUserSerializer(ModelSerializer):
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

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirmation"):
            raise serializers.ValidationError({"password_confirmation": "Пароли не совпадают"})
        password_validation.validate_password(attrs.get("password"))
        if not attrs.get("username"):
            attrs["username"] = attrs["email"]
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirmation")
        user = get_user_model().objects.create_user(
            **validated_data, is_active=False
        )

        token = default_token_generator.make_token(user)
        request = self.context.get("request")
        confirmation_path = reverse("email-confirmation")
        confirmation_link = (
            request.build_absolute_uri(f"{confirmation_path}?email={user.email}&token={token}")
            if request
            else f"{confirmation_path}?email={user.email}&token={token}"
        )

        send_mail(
            subject="Подтверждение регистрации",
            message=f"Для подтверждения аккаунта перейдите по ссылке: {confirmation_link}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email],
            fail_silently=True,
        )

        return user


class LoginUserSerializer(Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data.get("email"), password=data.get("password"))
        if user and user.is_active:
            return user
        raise serializers.ValidationError("неверно")


class PasswordResetRequestSerializer(Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        try:
            user = get_user_model().objects.get(email=value)
        except get_user_model().DoesNotExist:
            raise serializers.ValidationError("Пользователь с таким email не найден")

        if not user.is_active:
            raise serializers.ValidationError("Аккаунт не подтверждён")

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
            subject="Сброс пароля",
            message=f"Для сброса пароля перейдите по ссылке: {reset_link}",
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
            raise serializers.ValidationError({"email": "Пользователь с таким email не найден"})

        if not default_token_generator.check_token(user, attrs.get("token")):
            raise serializers.ValidationError({"token": "Недействительный или истёкший токен"})

        if attrs.get("new_password") != attrs.get("new_password_confirmation"):
            raise serializers.ValidationError({"new_password_confirmation": "Пароли не совпадают"})

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
            raise serializers.ValidationError({"email": "Пользователь с таким email не найден"})

        if user.is_active:
            raise serializers.ValidationError({"email": "Аккаунт уже подтверждён"})

        if not default_token_generator.check_token(user, attrs.get("token")):
            raise serializers.ValidationError({"token": "Недействительный или истёкший токен"})

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
        )


class EventSerializer(ModelSerializer):
    class Meta:
        model = Event
        fields = (
            "id",
            "specialization",
            "name",
            "description",
            "stage",
            "start_date",
            "end_date",
            "end_app_date",
        )


class DirectionSerializer(ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Direction
        fields = (
            "id",
            "name",
            "description",
            "event",
            "leader",
        )

    def create(self, validated_data):
        event = self.context.get("event")
        if not event:
            raise serializers.ValidationError({"event": "Мероприятие не найдено"})

        validated_data["event"] = event
        return super().create(validated_data)


class ProjectSerializer(ModelSerializer):
    direction = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "direction",
            "curator",
            "teams",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "direction")

    def create(self, validated_data):
        direction = self.context.get("direction")
        if not direction:
            raise serializers.ValidationError({"direction": "Направление не найдено"})

        validated_data["direction"] = direction
        return super().create(validated_data)

class ApplicationCreateSerializer(ModelSerializer):
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
            "event",
            "project",
            "project_ref",
        )
        read_only_fields = ("id", "date_sub", "date_end", "direction", "event")

    def create(self, validated_data):
        event = self.context.get("event")
        direction = self.context.get("direction")
        if not event or not direction:
            raise serializers.ValidationError({"direction": "Направление или мероприятие не найдено"})

        if timezone.now() > event.end_app_date:
            raise serializers.ValidationError(
                {"event": "Дедлайн подачи заявок истёк"}
            )

        if Application.objects.filter(user=self.context["request"].user, direction=direction).exists():
            raise serializers.ValidationError(
                {"direction": "Заявка на это направление уже создана"}
            )

        try:
            return Application.objects.create(
                **validated_data,
                user=self.context["request"].user,
                event=event,
                direction=direction,
                date_sub=timezone.now(),
                date_end=event.end_app_date,
            )
        except IntegrityError:
            raise serializers.ValidationError(
                {"direction": "Заявка на это направление уже создана"}
            )
    def validate(self, attrs):
        project_input = self.initial_data.get("project")
        project_ref_input = self.initial_data.get("project_ref")

        if (
            project_input
            and project_ref_input
            and str(project_input) != str(project_ref_input)
        ):
            raise serializers.ValidationError(
                {"project": "project и project_ref должны совпадать"}
            )

        return super().validate(attrs)

class ApplicationSerializer(ModelSerializer):
    """Serializer for viewing and moderating applications."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True)
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
    projectId = serializers.IntegerField(source="project.id", read_only=True)
    projectTitle = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Application
        fields = (
            "id",
            "message",
            "is_link",
            "is_approved",
            "comment",
            "date_sub",
            "date_end",
            "user",
            "user_email",
            "direction",
            "direction_name",
            "event",
            "event_name",
            "project",
            "project_ref",
            "projectId",
            "projectTitle",
            "specialization",
            "status",
            "team_id",
            "tests_assigned",
            "tests_assigned_at",
            "test_session_id",
        )
        read_only_fields = ("id", "user", "direction", "event", "date_sub")
        
    def validate(self, attrs):
        project_input = self.initial_data.get("project")
        project_ref_input = self.initial_data.get("project_ref")

        if (
            project_input
            and project_ref_input
            and str(project_input) != str(project_ref_input)
        ):
            raise serializers.ValidationError(
                {"project": "project и project_ref должны совпадать"}
            )

        return super().validate(attrs)
    
class StatusSerializer(ModelSerializer):
    class Meta:
        model = Status
        fields = ("id", "name", "description", "is_positive")


class SpecializationSerializer(ModelSerializer):
    class Meta:
        model = Specialization
        fields = ("id", "name", "description")