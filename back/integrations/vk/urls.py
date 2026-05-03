from django.urls import path

from .views import VKCallbackView, VKSendTestView

urlpatterns = [
    path("callback/", VKCallbackView.as_view(), name="vk-callback"),
    path("send-test/", VKSendTestView.as_view(), name="vk-send-test"),
]
