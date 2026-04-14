from django.contrib import admin

from planner.models import TeamPlannerDesk


@admin.register(TeamPlannerDesk)
class TeamPlannerDeskAdmin(admin.ModelAdmin):
    list_display = ("team_id", "team_name", "updated_at")
    search_fields = ("team_id", "team_name")
