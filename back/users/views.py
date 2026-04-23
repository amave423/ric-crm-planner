from django.conf import settings
import secrets
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
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
from rest_framework.mixins import CreateModelMixin
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from users.permissions import (
    CuratorOrAdminPermission,
    PublicReadCuratorAdminWritePermission,
    ProjectantOnlyPermission,
)
from users.serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    DirectionSerializer,
    EmailConfirmationSerializer,
    EventSerializer,
    LoginUserSerializer,
    NotificationCreateSerializer,
    NotificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    ProjectSerializer,
    RegisterUserSerializer,
    UserSerializer,
    SpecializationSerializer,
    StatusSerializer,
)
from users.models import (
    Application,
    Direction,
    Event,
    Notification,
    Profile,
    Project,
    Specialization,
    Status,
)

TAG_AUTH = "Auth"
TAG_USERS = "Users"
TAG_PROFILE = "Profile"
TAG_EVENTS = "Events"
TAG_DIRECTIONS = "Directions"
TAG_PROJECTS = "Projects"
TAG_APPLICATIONS = "Applications"
TAG_NOTIFICATIONS = "Уведомления"
TAG_REFERENCE = "Reference"

MESSAGE_RESPONSE_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"message": openapi.Schema(type=openapi.TYPE_STRING)},
)

ERROR_RESPONSE_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    additional_properties=openapi.Schema(type=openapi.TYPE_STRING),
)

LOGIN_RESPONSE_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"user": openapi.Schema(type=openapi.TYPE_OBJECT)},
)

REFRESH_RESPONSE_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        "access": openapi.Schema(type=openapi.TYPE_STRING),
        "refresh": openapi.Schema(type=openapi.TYPE_STRING),
    },
)


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_USERS],
        operation_summary="Get current user info",
        operation_description="Get current user info",
        responses={200: UserSerializer, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
class UserInfoView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Register user",
        operation_description="Register user",
        request_body=RegisterUserSerializer,
        responses={201: UserSerializer, 400: ERROR_RESPONSE_SCHEMA},
    ),
)
class UserRegistrationView(CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterUserSerializer

@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_USERS],
        operation_summary="List users",
        operation_description="List users",
        responses={200: UserSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA},
    ),
)
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

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Login",
        operation_description="Login",
        request_body=LoginUserSerializer,
        responses={200: LOGIN_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA},
    )
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

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Logout",
        operation_description="Logout",
        responses={200: MESSAGE_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    )
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

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Refresh access token",
        operation_description="Refresh access token",
        responses={200: REFRESH_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    )
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

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Request password reset",
        operation_description="Request password reset",
        request_body=PasswordResetRequestSerializer,
        responses={200: MESSAGE_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA},
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            serializer.save(request=request)
            return Response({"message": "Инструкции по сбросу отправлены на почту"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Validate password reset token",
        operation_description="Validate password reset token",
        manual_parameters=[
            openapi.Parameter("email", openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("token", openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True),
        ],
        responses={200: MESSAGE_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA},
    )
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

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Confirm password reset",
        operation_description="Confirm password reset",
        request_body=PasswordResetConfirmSerializer,
        responses={200: MESSAGE_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA},
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Пароль успешно обновлён"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailConfirmationView(APIView):
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Confirm email by query params",
        operation_description="Confirm email by query params",
        manual_parameters=[
            openapi.Parameter("email", openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("token", openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True),
        ],
        responses={200: MESSAGE_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA},
    )
    def get(self, request):
        serializer = EmailConfirmationSerializer(data=request.query_params)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Аккаунт подтверждён"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        tags=[TAG_AUTH],
        operation_summary="Confirm email by body",
        operation_description="Confirm email by body",
        request_body=EmailConfirmationSerializer,
        responses={200: MESSAGE_RESPONSE_SCHEMA, 400: ERROR_RESPONSE_SCHEMA},
    )
    def post(self, request):
        serializer = EmailConfirmationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Аккаунт подтверждён"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PROFILE],
        operation_summary="Get current profile",
        operation_description="Get current profile",
        responses={200: ProfileSerializer, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="put",
    decorator=swagger_auto_schema(
        tags=[TAG_PROFILE],
        operation_summary="Replace current profile",
        operation_description="Replace current profile",
        request_body=ProfileSerializer,
        responses={200: ProfileSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_PROFILE],
        operation_summary="Update current profile",
        operation_description="Update current profile",
        request_body=ProfileSerializer,
        responses={200: ProfileSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
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
                "workplace": "",
                "specialty": "",
                "about": "",
            },
        )
        return profile


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_EVENTS],
        operation_summary="List events",
        operation_description="List events",
        responses={200: EventSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_EVENTS],
        operation_summary="Create event",
        operation_description="Create event",
        request_body=EventSerializer,
        responses={201: EventSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    ),
)
class EventListCreateView(ListCreateAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = EventSerializer
    queryset = Event.objects.select_related("leader", "specialization")
    lookup_url_kwarg = "event_id"


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_EVENTS],
        operation_summary="Get event",
        operation_description="Get event",
        responses={200: EventSerializer, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="put",
    decorator=swagger_auto_schema(
        tags=[TAG_EVENTS],
        operation_summary="Replace event",
        operation_description="Replace event",
        request_body=EventSerializer,
        responses={200: EventSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_EVENTS],
        operation_summary="Update event",
        operation_description="Update event",
        request_body=EventSerializer,
        responses={200: EventSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="delete",
    decorator=swagger_auto_schema(
        tags=[TAG_EVENTS],
        operation_summary="Delete event",
        operation_description="Delete event",
        responses={204: "No content", 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class EventDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = EventSerializer
    queryset = Event.objects.select_related("leader", "specialization")
    lookup_url_kwarg = "event_id"

@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_REFERENCE],
        operation_summary="List statuses",
        operation_description="List statuses",
        responses={200: StatusSerializer(many=True)},
    ),
)
class StatusListView(ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = StatusSerializer
    queryset = Status.objects.all()


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_REFERENCE],
        operation_summary="List specializations",
        operation_description="List specializations",
        responses={200: SpecializationSerializer(many=True)},
    ),
)
class SpecializationListView(ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = SpecializationSerializer
    queryset = Specialization.objects.all()
    
@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="List directions in event",
        operation_description="List directions in event",
        responses={200: DirectionSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="Create direction in event",
        operation_description="Create direction in event",
        request_body=DirectionSerializer,
        responses={201: DirectionSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class DirectionListCreateView(ListCreateAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = DirectionSerializer

    def get_queryset(self):
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        return Direction.objects.filter(event=event).select_related("event", "leader")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["event"] = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        return context


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="Get direction",
        operation_description="Get direction",
        responses={200: DirectionSerializer, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="put",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="Replace direction",
        operation_description="Replace direction",
        request_body=DirectionSerializer,
        responses={200: DirectionSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="Update direction",
        operation_description="Update direction",
        request_body=DirectionSerializer,
        responses={200: DirectionSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="delete",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="Delete direction",
        operation_description="Delete direction",
        responses={204: "No content", 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class DirectionDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = DirectionSerializer
    lookup_url_kwarg = "direction_id"

    def get_queryset(self):
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        return Direction.objects.filter(event=event).select_related("event", "leader")

@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="List projects in direction",
        operation_description="List projects in direction",
        responses={200: ProjectSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="Create project in direction",
        operation_description="Create project in direction",
        request_body=ProjectSerializer,
        responses={201: ProjectSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class ProjectListCreateView(ListCreateAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = ProjectSerializer

    def get_queryset(self):
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        direction = get_object_or_404(
            Direction, pk=self.kwargs.get("direction_id"), event=event
        )
        return Project.objects.filter(direction=direction).select_related(
            "direction", "curator", "direction__event"
        )
        

    def get_serializer_context(self):
        context = super().get_serializer_context()
        event = get_object_or_404(Event, pk=self.kwargs.get("event_id"))
        direction = get_object_or_404(
            Direction, pk=self.kwargs.get("direction_id"), event=event
        )
        context["direction"] = direction
        return context


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="Get project",
        operation_description="Get project",
        responses={200: ProjectSerializer, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="put",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="Replace project",
        operation_description="Replace project",
        request_body=ProjectSerializer,
        responses={200: ProjectSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="Update project",
        operation_description="Update project",
        request_body=ProjectSerializer,
        responses={200: ProjectSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="delete",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="Delete project",
        operation_description="Delete project",
        responses={204: "No content", 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class ProjectDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = ProjectSerializer
    lookup_url_kwarg = "project_id"
    queryset = Project.objects.select_related("direction", "curator", "direction__event")

@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="List all projects",
        operation_description="List all projects",
        responses={200: ProjectSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_PROJECTS],
        operation_summary="Create project",
        operation_description="Create project",
        request_body=ProjectSerializer,
        responses={201: ProjectSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    ),
)
class UserProjectListCreateView(ListCreateAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
    serializer_class = ProjectSerializer
    queryset = Project.objects.select_related("direction", "curator", "direction__event")


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_DIRECTIONS],
        operation_summary="List all directions",
        operation_description="List all directions",
        responses={200: DirectionSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    ),
)
class UserDirectionListView(ListAPIView):
    permission_classes = (PublicReadCuratorAdminWritePermission,)
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
            permissions = (IsAuthenticated,)
        else:
            permissions = (ProjectantOnlyPermission,)
        return [permission() for permission in permissions]

    def get_serializer_class(self):
        if self.request.method.lower() == "post":
            return ApplicationCreateSerializer
        return ApplicationSerializer
    @swagger_auto_schema(
        tags=[TAG_APPLICATIONS],
        operation_summary="List applications",
        operation_description="List applications",
        manual_parameters=filter_parameters,
        responses={200: ApplicationSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=[TAG_APPLICATIONS],
        operation_summary="Create application",
        operation_description="Create application",
        request_body=ApplicationCreateSerializer,
        responses={201: ApplicationSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA},
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        output = ApplicationSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        queryset = Application.objects.select_related(
            "user", "direction", "event", "project", "specialization", "status"
        ).order_by("-date_sub")
        
        if not CuratorOrAdminPermission().has_permission(self.request, self):
            queryset = queryset.filter(user=self.request.user)

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
            event_id = self.request.data.get("event") or self.request.data.get("event_id")
            direction_id = self.request.data.get("direction") or self.request.data.get("direction_id")

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
        if self.request.method.lower() == "get":
            permissions = (IsAuthenticated,)
        elif self.request.method.lower() in {"put", "patch"}:
            permissions = (IsAuthenticated,)
        else:
            permissions = (IsAuthenticated,)
        return [permission() for permission in permissions]

    @swagger_auto_schema(
        tags=[TAG_APPLICATIONS],
        operation_summary="Get application",
        operation_description="Получение заявки",
        responses={200: ApplicationSerializer, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=[TAG_APPLICATIONS],
        operation_summary="Update application",
        operation_description="Обновление заявки",
        request_body=ApplicationSerializer,
        responses={200: ApplicationSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=[TAG_APPLICATIONS],
        operation_summary="Delete application",
        operation_description="Удаление заявки",
        responses={204: "No content", 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    )
    def delete(self, request, *args, **kwargs):
        application = self.get_object()
        is_curator_or_admin = CuratorOrAdminPermission().has_permission(request, self)
        is_owner = application.user_id == request.user.id

        if not (is_curator_or_admin or is_owner):
            return Response(status=status.HTTP_403_FORBIDDEN)

        self.perform_destroy(application)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        queryset = Application.objects.select_related(
            "user", "direction", "event", "project", "specialization", "status"
        )

        if CuratorOrAdminPermission().has_permission(self.request, self):
            return queryset

        return queryset.filter(user=self.request.user)


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_NOTIFICATIONS],
        operation_summary="Список уведомлений",
        operation_description="Получение уведомлений текущего пользователя",
        responses={200: NotificationSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_NOTIFICATIONS],
        operation_summary="Создать уведомление",
        operation_description="Создание уведомления для текущего пользователя",
        request_body=NotificationCreateSerializer,
        responses={201: NotificationSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
class NotificationListCreateView(ListCreateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("user")

    def get_serializer_class(self):
        if self.request.method.lower() == "post":
            return NotificationCreateSerializer
        return NotificationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        output = NotificationSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_NOTIFICATIONS],
        operation_summary="Обновить уведомление",
        operation_description="Обновление уведомления текущего пользователя",
        request_body=NotificationSerializer,
        responses={200: NotificationSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="delete",
    decorator=swagger_auto_schema(
        tags=[TAG_NOTIFICATIONS],
        operation_summary="Удалить уведомление",
        operation_description="Удаление уведомления текущего пользователя",
        responses={204: "No content", 401: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class NotificationDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = NotificationSerializer
    lookup_url_kwarg = "notification_id"

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("user")


@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_NOTIFICATIONS],
        operation_summary="Отметить все как прочитанные",
        operation_description="Отметить все уведомления текущего пользователя как прочитанные",
        responses={200: MESSAGE_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
class NotificationMarkAllReadView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"message": "Все уведомления отмечены как прочитанные."}, status=status.HTTP_200_OK)


@method_decorator(
    name="delete",
    decorator=swagger_auto_schema(
        tags=[TAG_NOTIFICATIONS],
        operation_summary="Удалить все уведомления",
        operation_description="Удаление всех уведомлений текущего пользователя",
        responses={204: "No content", 401: ERROR_RESPONSE_SCHEMA},
    ),
)
class NotificationClearView(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, *args, **kwargs):
        Notification.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(
    name="post",
    decorator=swagger_auto_schema(
        tags=[TAG_APPLICATIONS],
        operation_summary="Create application for direction",
        operation_description="Create application for direction",
        request_body=ApplicationCreateSerializer,
        responses={201: ApplicationSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 403: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        output = ApplicationSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)
