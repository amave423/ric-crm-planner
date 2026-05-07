#!/bin/sh
set -e

python - <<'PY'
import os
import socket
import time

host = os.getenv("DB_HOST")
port = int(os.getenv("DB_PORT", "5432"))
if host:
    deadline = time.time() + 60
    while True:
        try:
            with socket.create_connection((host, port), timeout=3):
                break
        except OSError:
            if time.time() > deadline:
                raise
            time.sleep(1)
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
