from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
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
    ProjectantOnlyPermission,
    ProjectantReadCuratorAdminWritePermission,
)
from users.serializers import (
    ApplicationCreateSerializer,
    DirectionSerializer,
    EmailConfirmationSerializer,
    EventSerializer,
    LoginUserSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterUserSerializer,
    UserSerializer,
)
from users.models import Direction, Event, Profile


class UserInfoView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserRegistrationView(CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterUserSerializer


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            response = Response({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)

            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite="None",
            )

            response.set_cookie(
                key="refresh_token",
                value=str(refresh),
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite="None",
            )

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
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            response = Response({"message": "Access token refresh successfully"}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite="None",
            )
            return response

        except InvalidToken:
            return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)


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
