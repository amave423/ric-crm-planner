from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from planner.models import PlannerWorkspaceState, TeamPlannerDesk


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class PlannerDeskViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="planner@example.com",
            username="planner@example.com",
            password="StrongPass123",
            is_active=True,
        )

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def test_team_desk_get_creates_default_desk(self):
        self.authenticate()
        response = self.client.get(
            reverse("planner-team-desk-detail", kwargs={"team_id": 17})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["team_id"], 17)
        self.assertEqual(response.data["parent_tasks"], [])
        self.assertEqual(response.data["subtasks"], [])
        self.assertEqual(response.data["columns"], ["Запланировано", "В работе", "На проверке", "Готово"])
        self.assertTrue(TeamPlannerDesk.objects.filter(team_id=17).exists())

    def test_team_desk_put_updates_existing_desk(self):
        self.authenticate()
        payload = {
            "team_name": "Backend Team",
            "curator_id": 21,
            "member_ids": [11, 12],
            "parent_tasks": [
                {
                    "id": 1,
                    "team_id": 17,
                    "title": "Sprint 1",
                    "start_date": "2026-03-25",
                    "end_date": "2026-04-01",
                }
            ],
            "subtasks": [
                {
                    "id": 2,
                    "team_id": 17,
                    "parent_task_id": 1,
                    "title": "API endpoint",
                    "role": "Backend",
                    "start_date": "2026-03-25",
                    "end_date": "2026-03-28",
                    "in_sprint": True,
                    "status": "В работе",
                }
            ],
            "columns": ["Backlog", "In progress", "Done"],
        }
        response = self.client.put(
            reverse("planner-team-desk-detail", kwargs={"team_id": 17}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        desk = TeamPlannerDesk.objects.get(team_id=17)
        self.assertEqual(desk.team_name, payload["team_name"])
        self.assertEqual(desk.curator_id, payload["curator_id"])
        self.assertEqual(desk.member_ids, payload["member_ids"])
        self.assertEqual(desk.parent_tasks, payload["parent_tasks"])
        self.assertEqual(desk.subtasks, payload["subtasks"])
        self.assertEqual(desk.columns, payload["columns"])

    def test_team_desk_list_returns_all_desks(self):
        self.authenticate()
        TeamPlannerDesk.objects.create(team_id=1, team_name="A")
        TeamPlannerDesk.objects.create(team_id=2, team_name="B")

        response = self.client.get(reverse("planner-team-desk-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_auth_required(self):
        response = self.client.get(
            reverse("planner-team-desk-detail", kwargs={"team_id": 17})
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_frontend_contract_get_users_planner(self):
        self.authenticate()
        response = self.client.get(reverse("planner-state"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["enrollment_closed"], False)
        self.assertEqual(response.data["participants"], [])
        self.assertEqual(response.data["teams"], [])
        self.assertEqual(response.data["parent_tasks"], [])
        self.assertEqual(response.data["subtasks"], [])
        self.assertEqual(response.data["columns"], ["Запланировано", "В работе", "На проверке", "Готово"])
        self.assertEqual(PlannerWorkspaceState.objects.count(), 1)

    def test_frontend_contract_put_users_planner_syncs_team_desks(self):
        self.authenticate()
        payload = {
            "enrollment_closed": True,
            "participants": [{"id": 11, "full_name": "A"}],
            "teams": [
                {"id": 17, "name": "Team 17", "curatorId": 4, "memberIds": [11, 12], "confirmed": True},
                {"id": 18, "name": "Team 18", "curatorId": 5, "memberIds": [13], "confirmed": True},
            ],
            "parent_tasks": [
                {"id": 1, "teamId": 17, "title": "P1", "startDate": "2026-03-01", "endDate": "2026-03-03"},
                {"id": 2, "teamId": 18, "title": "P2", "startDate": "2026-03-04", "endDate": "2026-03-06"},
            ],
            "subtasks": [
                {
                    "id": 10,
                    "teamId": 17,
                    "parentTaskId": 1,
                    "title": "S1",
                    "role": "Backend",
                    "startDate": "2026-03-01",
                    "endDate": "2026-03-02",
                    "inSprint": True,
                    "status": "В работе",
                },
                {
                    "id": 11,
                    "teamId": 18,
                    "parentTaskId": 2,
                    "title": "S2",
                    "role": "Frontend",
                    "startDate": "2026-03-04",
                    "endDate": "2026-03-05",
                    "inSprint": False,
                    "status": "Запланировано",
                },
            ],
            "columns": ["Todo", "Doing", "Done"],
        }
        response = self.client.put(reverse("planner-state"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workspace = PlannerWorkspaceState.objects.first()
        self.assertIsNotNone(workspace)
        self.assertEqual(workspace.teams, payload["teams"])
        self.assertEqual(workspace.parent_tasks, payload["parent_tasks"])
        self.assertEqual(workspace.subtasks, payload["subtasks"])

        desk17 = TeamPlannerDesk.objects.get(team_id=17)
        desk18 = TeamPlannerDesk.objects.get(team_id=18)
        self.assertEqual(len(desk17.parent_tasks), 1)
        self.assertEqual(len(desk17.subtasks), 1)
        self.assertEqual(len(desk18.parent_tasks), 1)
        self.assertEqual(len(desk18.subtasks), 1)

    def test_projectant_get_users_planner_sees_only_own_subtasks(self):
        self.authenticate()
        PlannerWorkspaceState.objects.create(
            enrollment_closed=False,
            participants=[],
            teams=[],
            parent_tasks=[],
            subtasks=[
                {"id": 1, "assigneeId": self.user.id, "title": "Mine"},
                {"id": 2, "assigneeId": self.user.id + 1, "title": "Other"},
                {"id": 3, "title": "No assignee"},
            ],
            columns=["A"],
        )

        response = self.client.get(reverse("planner-state"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        subtasks = response.data.get("subtasks", [])
        self.assertEqual(len(subtasks), 1)
        self.assertEqual(subtasks[0]["id"], 1)

    def test_projectant_put_users_planner_preserves_foreign_subtasks(self):
        self.authenticate()
        state = PlannerWorkspaceState.objects.create(
            enrollment_closed=False,
            participants=[],
            teams=[],
            parent_tasks=[],
            subtasks=[
                {"id": 1, "assigneeId": self.user.id, "title": "Mine old"},
                {"id": 2, "assigneeId": self.user.id + 1, "title": "Other keep"},
            ],
            columns=["A"],
        )

        payload = {
            "enrollment_closed": False,
            "participants": [],
            "teams": [],
            "parent_tasks": [],
            "subtasks": [{"id": 1, "assigneeId": self.user.id, "title": "Mine new"}],
            "columns": ["A"],
        }
        response = self.client.put(reverse("planner-state"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        state.refresh_from_db()
        subtasks_by_id = {item["id"]: item for item in state.subtasks}
        self.assertEqual(subtasks_by_id[1]["title"], "Mine new")
        self.assertEqual(subtasks_by_id[2]["title"], "Other keep")
