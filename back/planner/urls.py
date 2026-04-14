from django.urls import path

from planner.views import TeamPlannerDeskDetailView, TeamPlannerDeskListView


urlpatterns = [
    path("teams/desks/", TeamPlannerDeskListView.as_view(), name="planner-team-desk-list"),
    path(
        "teams/<int:team_id>/desk/",
        TeamPlannerDeskDetailView.as_view(),
        name="planner-team-desk-detail",
    ),
]
