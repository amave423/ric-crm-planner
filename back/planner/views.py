from django.db import transaction
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from planner.models import PlannerWorkspaceState, TeamPlannerDesk
from planner.serializers import PlannerWorkspaceStateSerializer, TeamPlannerDeskSerializer
from users.models import CRMRole, ROLE_ADMIN, ROLE_CURATOR

TAG_PLANNER = "Planner"

ERROR_RESPONSE_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    additional_properties=openapi.Schema(type=openapi.TYPE_STRING),
)


def _to_int(value):
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _team_id_from_item(item):
    if not isinstance(item, dict):
        return None
    return _to_int(item.get("teamId", item.get("team_id")))


def _assignee_id_from_item(item):
    if not isinstance(item, dict):
        return None
    return _to_int(item.get("assigneeId", item.get("assignee_id")))


def _is_projectant_user(user):
    if getattr(user, "is_superuser", False):
        return False
    roles = set(CRMRole.objects.filter(user=user).values_list("role_type", flat=True))
    # In this project, non-curator/non-admin users are treated as projectants (students).
    return ROLE_ADMIN not in roles and ROLE_CURATOR not in roles


def _sync_team_desks_from_workspace(workspace: PlannerWorkspaceState):
    teams = workspace.teams if isinstance(workspace.teams, list) else []
    parent_tasks = workspace.parent_tasks if isinstance(workspace.parent_tasks, list) else []
    subtasks = workspace.subtasks if isinstance(workspace.subtasks, list) else []

    teams_by_id = {}
    for team in teams:
        if not isinstance(team, dict):
            continue
        team_id = _to_int(team.get("id"))
        if team_id is None:
            continue
        teams_by_id[team_id] = team

    target_ids = set(teams_by_id.keys())

    with transaction.atomic():
        for team_id, team_data in teams_by_id.items():
            desk, _ = TeamPlannerDesk.objects.get_or_create(team_id=team_id)
            desk.team_name = str(team_data.get("name", "") or "")
            desk.curator_id = _to_int(team_data.get("curatorId", team_data.get("curator_id")))
            member_ids = team_data.get("memberIds", team_data.get("member_ids", []))
            desk.member_ids = member_ids if isinstance(member_ids, list) else []
            desk.parent_tasks = [item for item in parent_tasks if _team_id_from_item(item) == team_id]
            desk.subtasks = [item for item in subtasks if _team_id_from_item(item) == team_id]
            desk.columns = workspace.columns
            desk.save()

        TeamPlannerDesk.objects.exclude(team_id__in=target_ids).delete()


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="Get workspace planner state",
        operation_description="Get workspace planner state",
        responses={200: PlannerWorkspaceStateSerializer, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="put",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="Replace workspace planner state",
        operation_description="Replace workspace planner state",
        request_body=PlannerWorkspaceStateSerializer,
        responses={200: PlannerWorkspaceStateSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="Update workspace planner state",
        operation_description="Update workspace planner state",
        request_body=PlannerWorkspaceStateSerializer,
        responses={200: PlannerWorkspaceStateSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA},
    ),
)
class PlannerStateCompatView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = PlannerWorkspaceStateSerializer

    def get_object(self):
        state = PlannerWorkspaceState.objects.order_by("id").first()
        if state:
            return state
        return PlannerWorkspaceState.objects.create()

    def get(self, request, *args, **kwargs):
        workspace = self.get_object()
        data = self.get_serializer(workspace).data
        if _is_projectant_user(request.user):
            user_id = _to_int(request.user.id)
            data["subtasks"] = [
                item
                for item in data.get("subtasks", [])
                if _assignee_id_from_item(item) == user_id
            ]
        return Response(data)

    def perform_update(self, serializer):
        previous_subtasks = (
            list(serializer.instance.subtasks)
            if serializer.instance and isinstance(serializer.instance.subtasks, list)
            else []
        )
        workspace = serializer.save()

        if _is_projectant_user(self.request.user):
            user_id = _to_int(self.request.user.id)
            incoming_subtasks = workspace.subtasks if isinstance(workspace.subtasks, list) else []
            own_subtasks = [
                item for item in incoming_subtasks if _assignee_id_from_item(item) == user_id
            ]
            foreign_subtasks = [
                item for item in previous_subtasks if _assignee_id_from_item(item) != user_id
            ]
            workspace.subtasks = foreign_subtasks + own_subtasks
            workspace.save(update_fields=["subtasks", "updated_at"])

        _sync_team_desks_from_workspace(workspace)


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="List team planner desks",
        operation_description="List team planner desks",
        responses={200: TeamPlannerDeskSerializer(many=True), 401: ERROR_RESPONSE_SCHEMA},
    ),
)
class TeamPlannerDeskListView(ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = TeamPlannerDeskSerializer
    queryset = TeamPlannerDesk.objects.all()


@method_decorator(
    name="get",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="Get team planner desk",
        operation_description="Get team planner desk",
        responses={200: TeamPlannerDeskSerializer, 401: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="put",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="Replace team planner desk",
        operation_description="Replace team planner desk",
        request_body=TeamPlannerDeskSerializer,
        responses={200: TeamPlannerDeskSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
@method_decorator(
    name="patch",
    decorator=swagger_auto_schema(
        tags=[TAG_PLANNER],
        operation_summary="Update team planner desk",
        operation_description="Update team planner desk",
        request_body=TeamPlannerDeskSerializer,
        responses={200: TeamPlannerDeskSerializer, 400: ERROR_RESPONSE_SCHEMA, 401: ERROR_RESPONSE_SCHEMA, 404: ERROR_RESPONSE_SCHEMA},
    ),
)
class TeamPlannerDeskDetailView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = TeamPlannerDeskSerializer
    lookup_url_kwarg = "team_id"

    def get_object(self):
        team_id = self.kwargs.get(self.lookup_url_kwarg)
        desk, _ = TeamPlannerDesk.objects.get_or_create(team_id=team_id)
        return desk
