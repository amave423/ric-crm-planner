from rest_framework import serializers

from planner.models import PlannerWorkspaceState, TeamPlannerDesk


class PlannerWorkspaceStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannerWorkspaceState
        fields = (
            "enrollment_closed",
            "participants",
            "teams",
            "parent_tasks",
            "subtasks",
            "columns",
        )


class TeamPlannerDeskSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamPlannerDesk
        fields = (
            "team_id",
            "team_name",
            "curator_id",
            "member_ids",
            "parent_tasks",
            "subtasks",
            "columns",
            "updated_at",
        )
        read_only_fields = ("team_id", "updated_at")
