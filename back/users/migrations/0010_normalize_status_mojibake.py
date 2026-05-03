from django.db import migrations


STATUS_NAME_MAP = {
    "РџСЂРёСЃР»Р°Р» Р·Р°СЏРІРєСѓ": "Прислал заявку",
    "РџСЂРѕС…РѕР¶РґРµРЅРёРµ С‚РµСЃС‚РёСЂРѕРІР°РЅРёСЏ": "Прохождение тестирования",
    "Р”РѕР±Р°РІРёР»СЃСЏ РІ РѕСЂРі С‡Р°С‚": "Добавился в орг чат",
    "РџСЂРёСЃС‚СѓРїРёР» Рє РџРЁ": "Приступил к ПШ",
}


def normalize_status_names(apps, schema_editor):
    Status = apps.get_model("users", "Status")
    Application = apps.get_model("users", "Application")

    for bad_name, good_name in STATUS_NAME_MAP.items():
        good_status, _ = Status.objects.get_or_create(
            name=good_name,
            defaults={"description": "", "is_positive": True},
        )
        bad_statuses = Status.objects.filter(name=bad_name).exclude(pk=good_status.pk)

        for bad_status in bad_statuses:
            Application.objects.filter(status_id=bad_status.pk).update(status=good_status)
            bad_status.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_event_archive_organizers_form_fields"),
    ]

    operations = [
        migrations.RunPython(normalize_status_names, migrations.RunPython.noop),
    ]
