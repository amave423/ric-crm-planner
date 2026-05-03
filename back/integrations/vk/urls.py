from django.urls import path

from .views import VKApplicationMessageView, VKCallbackView, VKSendTestView

urlpatterns = [
    path("callback/", VKCallbackView.as_view(), name="vk-callback"),
    path("send-test/", VKSendTestView.as_view(), name="vk-send-test"),
    path("applications/<int:application_id>/message/", VKApplicationMessageView.as_view(), name="vk-application-message"),
]
