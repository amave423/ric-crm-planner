from django.urls import path

from .views import (
    ApplicationDetailView,
    ApplicationListView,
    CookieTokenRefreshView,
    DirectionApplicationCreateView,
    DirectionDetailView,
    DirectionListCreateView,
    EmailConfirmationView,
    EventDetailView,
    EventListCreateView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProjectDetailView,
    ProjectListCreateView,
    SpecializationListView,
    StatusListView,
    ProfileView,
    UserInfoView,
    UserRegistrationView,
    UserDirectionListView,
    UserListView,
    UserProjectListCreateView,
)

urlpatterns = [
    path("", UserListView.as_view(), name="user-list"),
    path("user-info/", UserInfoView.as_view(), name="user-info"),
    path("register/", UserRegistrationView.as_view(), name="registration"),
    path("login/", LoginView.as_view(), name="user-login"),
    path("logout/", LogoutView.as_view(), name="user-logout"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("confirm-email/", EmailConfirmationView.as_view(), name="email-confirmation"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("events/", EventListCreateView.as_view(), name="event-list-create"),
    path("events/<int:event_id>/", EventDetailView.as_view(), name="event-detail"),
    path(
        "events/<int:event_id>/directions/",
        DirectionListCreateView.as_view(),
        name="direction-list-create",
    ),
    path(
        "events/<int:event_id>/directions/<int:direction_id>/",
        DirectionDetailView.as_view(),
        name="direction-detail",
    ),
    path(
        "events/<int:event_id>/directions/<int:direction_id>/applications/",
        DirectionApplicationCreateView.as_view(),
        name="direction-application-create",
    ),
        path(
        "events/<int:event_id>/directions/<int:direction_id>/projects/",
        ProjectListCreateView.as_view(),
        name="project-list-create",
    ),
    path(
        "projects/<int:project_id>/",
        ProjectDetailView.as_view(),
        name="project-detail",
    ),
    path("projects/", UserProjectListCreateView.as_view(), name="user-project-list-create"),
    path("directions/", UserDirectionListView.as_view(), name="user-direction-list"),
    path("applications/", ApplicationListView.as_view(), name="application-list"),
    path(
        "applications/<int:application_id>/",
        ApplicationDetailView.as_view(),
        name="application-detail",
    ),
    path("statuses/", StatusListView.as_view(), name="status-list"),
    path(
        "specializations/", SpecializationListView.as_view(), name="specialization-list"
    ),
]
