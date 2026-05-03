import secrets

from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import CuratorOrAdminPermission

from .serializers import VKSendTestSerializer
from .services import VKAPIError, VKConfigurationError, normalize_vk_group_id, send_vk_message


def plain_response(text: str, status_code: int = status.HTTP_200_OK) -> HttpResponse:
    return HttpResponse(text, status=status_code, content_type="text/plain; charset=utf-8")


@method_decorator(csrf_exempt, name="dispatch")
class VKCallbackView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        operation_summary="VK Callback API endpoint",
        operation_description="Accepts VK Callback API events and returns confirmation or ok.",
        request_body=openapi.Schema(type=openapi.TYPE_OBJECT),
        responses={200: "confirmation code or ok", 403: "Invalid secret"},
    )
    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        event_type = str(payload.get("type", ""))

        if event_type == "confirmation":
            expected_group_id = normalize_vk_group_id()
            received_group_id = normalize_vk_group_id(payload.get("group_id"))
            if expected_group_id and received_group_id and expected_group_id != received_group_id:
                return Response({"detail": "Invalid VK group_id."}, status=status.HTTP_403_FORBIDDEN)
            if not settings.VK_CONFIRMATION_CODE:
                return Response(
                    {"detail": "VK confirmation code is not configured."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return plain_response(settings.VK_CONFIRMATION_CODE)

        expected_secret = settings.VK_CALLBACK_SECRET or ""
        if expected_secret:
            received_secret = str(payload.get("secret", ""))
            if not secrets.compare_digest(received_secret, expected_secret):
                return Response({"detail": "Invalid VK callback secret."}, status=status.HTTP_403_FORBIDDEN)

        return plain_response("ok")


class VKSendTestView(APIView):
    permission_classes = (CuratorOrAdminPermission,)

    @swagger_auto_schema(
        operation_summary="Send test VK message",
        operation_description="Sends a VK message via configured community token. Available for curators/admins.",
        request_body=VKSendTestSerializer,
        responses={200: openapi.Response("VK message id"), 400: "Validation error", 503: "VK is not configured"},
    )
    def post(self, request):
        serializer = VKSendTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            message_id = send_vk_message(**serializer.validated_data)
        except VKConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except VKAPIError as exc:
            return Response(
                {"detail": exc.message, "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message_id": message_id})
