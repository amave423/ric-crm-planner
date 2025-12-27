from django.conf import settings
import secrets
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import get_object_or_404
from rest_framework import status
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from users.permissions import (
    CuratorOrAdminPermission,
    ProjectantOnlyPermission,
    ProjectantReadCuratorAdminWritePermission,
)
from users.serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    DirectionSerializer,
    EmailConfirmationSerializer,
    EventSerializer,
    LoginUserSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    ProjectSerializer,
    RegisterUserSerializer,
    UserSerializer,
    SpecializationSerializer,
    StatusSerializer,
)
from users.models import Application, Direction, Event, Profile, Project, Specialization, Status


class UserInfoView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserRegistrationView(CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterUserSerializer

class UserListView(ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer
    queryset = get_user_model().objects.all()

def _set_auth_cookies(response, access_token: str, refresh_token: RefreshToken | None = None):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
    )

    if refresh_token is not None:
        response.set_cookie(
            key="refresh_token",
            value=str(refresh_token),
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite=settings.SESSION_COOKIE_SAMESITE,
        )


def _set_csrf_cookie(response):
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="csrftoken",
        value=csrf_token,
        httponly=False,
        secure=settings.CSRF_COOKIE_SECURE,
        samesite=settings.CSRF_COOKIE_SAMESITE,
    )
    return csrf_token

class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            response = Response({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)

            _set_auth_cookies(response, access_token, refresh)
            _set_csrf_cookie(response)

            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except Exception as e:
                return Response({"error": "Ошибка" + str(e)}, status=status.HTTP_400_BAD_REQUEST)

        response = Response({"message": "Successfully loged out"}, status=status.HTTP_200_OK)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = (AllowAny,)

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response({"error": "Refresh token not provided"}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(data={"refresh": refresh_token})

        try:
            serializer.is_valid(raise_exception=True)
        except InvalidToken:
            return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)
        token_data = serializer.validated_data
        access_token = token_data.get("access")
        rotated_refresh = token_data.get("refresh")

        response = Response(token_data, status=status.HTTP_200_OK)
        _set_auth_cookies(response, access_token, rotated_refresh)
        _set_csrf_cookie(response)
        return response


class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            serializer.save(request=request)
            return Response({"message": "Инструкции по сбросу отправлены на почту"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        email = request.query_params.get("email")
        token = request.query_params.get("token")

        if not email or not token:
            return Response(
                {"detail": "Не указан email или токен"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            return Response(
                {"email": "Пользователь с таким email не найден"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"token": "Недействительный или истёкший токен"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": "Токен подтверждён"}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Пароль успешно обновлён"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailConfirmationView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        serializer = EmailConfirmationSerializer(data=request.query_params)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Аккаунт подтверждён"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        serializer = EmailConfirmationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Аккаунт подтверждён"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ProfileSerializer

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "surname": self.request.user.last_name or "",
                "name": self.request.user.first_name or "",
                "patronymic": "",
                "telegram": "",
                "email": self.request.user.email,
                "course": 0,
                "university": "",
                "vk": "",
                "job": "",
            },
        )
        return profile


class EventListCreateView(ListCreateAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = EventSerializer
    queryset = Event.objects.all()
    lookup_url_kwarg = "event_id"


class EventDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = EventSerializer
    queryset = Event.objects.all()
    lookup_url_kwarg = "event_id"

class StatusListView(ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = StatusSerializer
    queryset = Status.objects.all()


class SpecializationListView(ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = SpecializationSerializer
    queryset = Specialization.objects.all()
    
class DirectionListCreateView(ListCreateAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = DirectionSerializer

    def get_queryset(self):
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        return Direction.objects.filter(event=event)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["event"] = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        return context


class DirectionDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = DirectionSerializer
    lookup_url_kwarg = "direction_id"

    def get_queryset(self):
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        return Direction.objects.filter(event=event)

class ProjectListCreateView(ListCreateAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = ProjectSerializer

    def get_queryset(self):
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        direction = get_object_or_404(
            Direction, pk=self.kwargs.get("direction_id"), event=event
        )
        return Project.objects.filter(direction=direction)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        direction = get_object_or_404(
            Direction, pk=self.kwargs.get("direction_id"), event=event
        )
        context["direction"] = direction
        return context


class ProjectDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = ProjectSerializer
    lookup_url_kwarg = "project_id"
    queryset = Project.objects.select_related("direction", "curator", "direction__event")

class UserProjectListCreateView(ListCreateAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = ProjectSerializer
    queryset = Project.objects.select_related("direction", "curator", "direction__event")


class UserDirectionListView(ListAPIView):
    permission_classes = (ProjectantReadCuratorAdminWritePermission,)
    serializer_class = DirectionSerializer
    queryset = Direction.objects.select_related("event", "leader")

class ApplicationListView(ListCreateAPIView):
    """List and create applications."""

    filter_parameters = [
        openapi.Parameter(
            "event",
            openapi.IN_QUERY,
            description="ID мероприятия",
            type=openapi.TYPE_INTEGER,
        ),
        openapi.Parameter(
            "direction",
            openapi.IN_QUERY,
            description="ID направления",
            type=openapi.TYPE_INTEGER,
        ),
        openapi.Parameter(
            "specialization",
            openapi.IN_QUERY,
            description="ID специализации",
            type=openapi.TYPE_INTEGER,
        ),
        openapi.Parameter(
            "status",
            openapi.IN_QUERY,
            description="ID статуса",
            type=openapi.TYPE_INTEGER,
        ),
        openapi.Parameter(
            "user",
            openapi.IN_QUERY,
            description="ID пользователя",
            type=openapi.TYPE_INTEGER,
        ),
        openapi.Parameter(
            "is_approved",
            openapi.IN_QUERY,
            description="Фильтр по признаку одобрения заявки",
            type=openapi.TYPE_BOOLEAN,
        ),
        openapi.Parameter(
            "tests_assigned",
            openapi.IN_QUERY,
            description="Фильтр по назначению тестов",
            type=openapi.TYPE_BOOLEAN,
        ),
    ]
    def get_permissions(self):
        if self.request.method.lower() == "get":
            permissions = (CuratorOrAdminPermission,)
        else:
            permissions = (ProjectantOnlyPermission,)
        return [permission() for permission in permissions]

    def get_serializer_class(self):
        if self.request.method.lower() == "post":
            return ApplicationCreateSerializer
        return ApplicationSerializer
    @swagger_auto_schema(manual_parameters=filter_parameters)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Application.objects.select_related(
            "user", "direction", "event", "specialization", "status", "project"
        ).order_by("-date_sub")

        filters = {
            "event": "event_id",
            "direction": "direction_id",
            "specialization": "specialization_id",
            "status": "status_id",
            "user": "user_id",
        }

        for param, field in filters.items():
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})

        boolean_params = {
            "is_approved": "is_approved",
            "tests_assigned": "tests_assigned",
        }
        for param, field in boolean_params.items():
            value = self.request.query_params.get(param)
            if value is not None:
                normalized = value.lower() in {"true", "1", "yes", "t"}
                queryset = queryset.filter(**{field: normalized})

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method.lower() == "post":
            event_id = self.request.data.get("event")
            direction_id = self.request.data.get("direction")

            if event_id:
                context["event"] = get_object_or_404(Event, pk=event_id)
            if direction_id:
                context["direction"] = get_object_or_404(Direction, pk=direction_id)

        return context
    
class ApplicationDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a specific application."""

    serializer_class = ApplicationSerializer
    lookup_url_kwarg = "application_id"
    def get_permissions(self):
        if self.request.method.lower() in {"get", "patch", "delete"}:
            permissions = (CuratorOrAdminPermission,)
        else:
            permissions = (IsAuthenticated,)
        return [permission() for permission in permissions]

    @swagger_auto_schema(operation_description="Получение заявки")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="Обновление заявки")
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="Удаление заявки")
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Application.objects.select_related(
            "user", "direction", "event", "specialization", "status", "project"
        )

        if CuratorOrAdminPermission().has_permission(self.request, self):
            return queryset

        if self.request.method.lower() == "put" and not (
            self.request.user.is_staff or self.request.user.is_superuser
        ):
            return queryset.filter(user=self.request.user)

        return queryset


class DirectionApplicationCreateView(CreateAPIView):
    permission_classes = (ProjectantOnlyPermission,)
    serializer_class = ApplicationCreateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        direction = get_object_or_404(
            Direction, pk=self.kwargs.get("direction_id"), event=event
        )
        context.update({"event": event, "direction": direction})
        return context

