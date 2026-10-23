"""Notificación sin imprimir URLs, tokens, chat IDs ni cuerpos de Telegram."""
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def message(env):
    result = env.get("PIPELINE_RESULT", "FAILURE")
    if result not in ("SUCCESS", "FAILURE"):
        raise ValueError("Resultado inválido")
    return "\n".join([
        "Proyecto: asset-management",
        f"Job: {env.get('JOB_NAME', 'asset-management')}",
        f"Build: #{env.get('BUILD_NUMBER', '?')}",
        f"Rama: {env.get('SOURCE_BRANCH', 'mateo_ortega')}",
        f"Resultado: {result}",
        f"Enlace: {env.get('BUILD_URL', '(sin enlace)')}",
    ])


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        print("ERROR: faltan credenciales de Telegram en Jenkins", file=sys.stderr)
        return 1
    try:
        data = urlencode({"chat_id": chat_id, "text": message(os.environ),
                          "link_preview_options": json.dumps({"is_disabled": True})}).encode()
        request = Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data, method="POST")
        with urlopen(request, timeout=20) as response:
            payload = json.load(response)
        if payload.get("ok") is not True:
            print("ERROR: Telegram rechazó la notificación", file=sys.stderr)
            return 1
    except HTTPError as error:
        print(f"ERROR: Telegram devolvió HTTP {error.code}; revisa las credenciales y el chat", file=sys.stderr)
        return 1
    except (URLError, TimeoutError, OSError, ValueError):
        print("ERROR: no se pudo confirmar el envío a Telegram", file=sys.stderr)
        return 1
    print("Telegram confirmó la notificación.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
