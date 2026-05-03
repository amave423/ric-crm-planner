from rest_framework import serializers


class VKSendTestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    peer_id = serializers.IntegerField(required=False)
    message = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)

    def validate(self, attrs):
        if not attrs.get("user_id") and not attrs.get("peer_id"):
            raise serializers.ValidationError("Укажите user_id или peer_id.")
        return attrs
