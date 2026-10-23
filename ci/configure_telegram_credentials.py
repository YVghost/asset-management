"""Guarda secretos Telegram en Jenkins, con entrada oculta y sin archivos de secretos."""
import base64
from getpass import getpass
import http.cookiejar
import json
import xml.etree.ElementTree as ET
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPCookieProcessor, urlopen


def main():
    username = input("Usuario administrador de Jenkins: ").strip()
    password = getpass("Contraseña/API token de Jenkins (oculto): ")
    token = getpass("Token del bot Telegram (oculto): ").strip()
    if not username or not password or not token:
        print("Faltan credenciales; no se realizó ningún cambio.")
        return 1

    def telegram(method):
        with urlopen(Request(f"https://api.telegram.org/bot{token}/{method}"), timeout=20) as response:
            payload = json.load(response)
        if payload.get("ok") is not True:
            raise ValueError("Telegram no confirmó la petición")
        return payload["result"]

    try:
        bot = telegram("getMe")
        if bot.get("username") != "asstet_management_bot":
            print("El token no corresponde al bot esperado; no se guardó.")
            return 1
    except (HTTPError, URLError, OSError, ValueError):
        print("No se pudo verificar el bot; revisa el token y la conexión.")
        return 1

    opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
    headers = {"Authorization": "Basic " + base64.b64encode(f"{username}:{password}".encode()).decode()}
    base = "http://localhost:8080"
    try:
        with opener.open(Request(base + "/crumbIssuer/api/json", headers=headers), timeout=20) as response:
            crumb = json.load(response)
        headers[crumb["crumbRequestField"]] = crumb["crumb"]
        headers["Content-Type"] = "application/xml"

        def save(identifier, secret, description):
            credential = ET.Element("org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl")
            for name, value in [("scope", "GLOBAL"), ("id", identifier), ("description", description), ("secret", secret)]:
                ET.SubElement(credential, name).text = value
            store = base + "/credentials/store/system/domain/_"
            try:
                with opener.open(Request(store + "/credential/" + identifier + "/api/json", headers=headers), timeout=20):
                    exists = True
            except HTTPError as error:
                if error.code != 404:
                    raise
                exists = False
            endpoint = store + ("/credential/" + identifier + "/config.xml" if exists else "/createCredentials")
            with opener.open(Request(endpoint, headers=headers, data=ET.tostring(credential, encoding="utf-8"), method="POST"), timeout=20) as response:
                if response.status not in (200, 201, 204):
                    raise ValueError("Jenkins no confirmó el guardado")

        save("telegram-bot-token", token, "Bot https://t.me/asstet_management_bot para asset-management")
        print("Credencial telegram-bot-token guardada. Bot verificado: https://t.me/asstet_management_bot")
        try:
            updates = telegram("getUpdates")
        except (HTTPError, URLError, OSError, ValueError):
            print("Token guardado; no se pudo consultar el chat ID. Revisa que este bot no tenga webhook.")
            return 0
        chats = {item["message"]["chat"]["id"] for item in updates
                 if item.get("message", {}).get("chat", {}).get("type") == "private"}
        if len(chats) == 1:
            save("telegram-chat-id", str(next(iter(chats))), "Chat privado de notificaciones de asset-management")
            print("Credencial telegram-chat-id guardada a partir del único chat privado recibido.")
        elif not chats:
            print("Falta chat ID: abre el bot, pulsa Start y envía hola; después repite este asistente.")
        else:
            print("Hay varios chats privados: se requiere elegir el destinatario; no se guardó telegram-chat-id.")
        return 0
    except (HTTPError, URLError, OSError, ValueError, KeyError):
        print("No se pudo confirmar el guardado en Jenkins. Revisa acceso administrativo.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
