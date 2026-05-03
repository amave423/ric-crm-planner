import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from integrations.vk.crm_notifications import notify_application_testing_started
from integrations.vk.services import VKAPIError, extract_vk_screen_name, normalize_vk_group_id, send_vk_message
from users.models import Application, Event, Profile, Status


class VKCallbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/integrations/vk/callback/"

    @override_settings(VK_CONFIRMATION_CODE="confirm-code", VK_GROUP_ID="club123")
    def test_callback_confirmation_returns_vk_confirmation_code(self):
        response = self.client.post(self.url, {"type": "confirmation", "group_id": 123}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.content.decode(), "confirm-code")

    @override_settings(VK_CONFIRMATION_CODE="confirm-code", VK_GROUP_ID="club123")
    def test_callback_confirmation_rejects_wrong_group_id(self):
        response = self.client.post(self.url, {"type": "confirmation", "group_id": 456}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(VK_CALLBACK_SECRET="secret")
    def test_callback_rejects_invalid_secret(self):
        response = self.client.post(self.url, {"type": "message_new", "secret": "wrong"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(VK_CALLBACK_SECRET="secret")
    def test_callback_accepts_valid_secret(self):
        response = self.client.post(self.url, {"type": "message_new", "secret": "secret"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.content.decode(), "ok")


class VKServiceTests(TestCase):
    def test_normalize_vk_group_id_accepts_club_prefix(self):
        self.assertEqual(normalize_vk_group_id("club238353336"), "238353336")

    def test_extract_vk_screen_name_accepts_profile_link(self):
        self.assertEqual(extract_vk_screen_name("https://vk.com/projectant"), "projectant")

    @override_settings(
        VK_ENABLED=True,
        VK_ACCESS_TOKEN="token",
        VK_API_VERSION="5.199",
        VK_API_BASE_URL="https://api.vk.com/method",
        VK_REQUEST_TIMEOUT_SECONDS=5,
    )
    @patch("integrations.vk.services.urllib.request.urlopen")
    def test_send_vk_message_returns_message_id(self, urlopen):
        urlopen.return_value.__enter__.return_value.read.return_value = json.dumps({"response": 777}).encode()

        message_id = send_vk_message(user_id=1, message="Тест")

        self.assertEqual(message_id, 777)
        self.assertTrue(urlopen.called)

    @override_settings(
        VK_ENABLED=True,
        VK_ACCESS_TOKEN="token",
        VK_API_VERSION="5.199",
        VK_API_BASE_URL="https://api.vk.com/method",
        VK_REQUEST_TIMEOUT_SECONDS=5,
    )
    @patch("integrations.vk.services.urllib.request.urlopen")
    def test_send_vk_message_raises_vk_api_error(self, urlopen):
        urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(
            {"error": {"error_code": 901, "error_msg": "Can't send messages for users without permission"}}
        ).encode()

        with self.assertRaises(VKAPIError):
            send_vk_message(user_id=1, message="Тест")


class VKCRMNotificationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="password",
            first_name="Иван",
            last_name="Иванов",
            is_active=True,
        )
        self.profile, _ = Profile.objects.update_or_create(
            user=self.user,
            defaults={
                "surname": "Иванов",
                "name": "Иван",
                "email": "student@example.com",
                "course": 1,
                "vk": "https://vk.com/id123456",
            },
        )
        self.event = Event.objects.create(
            name="Практика",
            stage="Набор",
            start_date="2026-05-01",
            end_date="2026-05-10",
            end_app_date=timezone.now(),
        )
        self.default_status = Status.objects.create(name="Прислал заявку")
        self.testing_status = Status.objects.create(name="Прохождение тестирования")
        self.application = Application.objects.create(
            user=self.user,
            event=self.event,
            date_sub=timezone.now(),
            date_end=timezone.now(),
            status=self.testing_status,
        )

    @override_settings(VK_ENABLED=True)
    @patch("integrations.vk.crm_notifications.send_vk_message")
    def test_notify_application_testing_started_sends_vk_message(self, send_vk_message_mock):
        send_vk_message_mock.return_value = 3

        message_id = notify_application_testing_started(
            self.application,
            previous_status_id=self.default_status.id,
        )

        self.assertEqual(message_id, 3)
        send_vk_message_mock.assert_called_once()
        self.assertEqual(send_vk_message_mock.call_args.kwargs["user_id"], 123456)

    @override_settings(VK_ENABLED=True)
    @patch("integrations.vk.crm_notifications.send_vk_message")
    def test_notify_application_testing_started_skips_same_status(self, send_vk_message_mock):
        notify_application_testing_started(
            self.application,
            previous_status_id=self.testing_status.id,
        )

        send_vk_message_mock.assert_not_called()
