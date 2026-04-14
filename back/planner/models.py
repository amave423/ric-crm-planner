from django.db import models


def planner_default_columns():
    return ["Запланировано", "В работе", "На проверке", "Готово"]


class PlannerWorkspaceState(models.Model):
    enrollment_closed = models.BooleanField(default=False)
    participants = models.JSONField(default=list)
    teams = models.JSONField(default=list)
    parent_tasks = models.JSONField(default=list)
    subtasks = models.JSONField(default=list)
    columns = models.JSONField(default=planner_default_columns)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "CRM_PLANNER_WORKSPACE_STATE"

    def __str__(self):
        return "Состояние планировщика"


class TeamPlannerDesk(models.Model):
    team_id = models.BigIntegerField(unique=True)
    team_name = models.CharField(max_length=255, blank=True)
    curator_id = models.BigIntegerField(null=True, blank=True)
    member_ids = models.JSONField(default=list)
    parent_tasks = models.JSONField(default=list)
    subtasks = models.JSONField(default=list)
    columns = models.JSONField(default=planner_default_columns)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "CRM_TEAM_PLANNER_DESK"
        ordering = ("team_id",)

    def __str__(self):
        return f"Доска команды #{self.team_id}"
