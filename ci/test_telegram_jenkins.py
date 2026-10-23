"""Envía una prueba explícita usando las credenciales almacenadas en Jenkins."""
import base64
from getpass import getpass
import http.cookiejar
import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPCookieProcessor


SCRIPT = r'''
import jenkins.model.Jenkins
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import groovy.json.JsonSlurperClassic
try {
    def credentials = SystemCredentialsProvider.getInstance().getCredentials()
    def bot = credentials.find { it.id == 'telegram-bot-token' }
    def chat = credentials.find { it.id == 'telegram-chat-id' }
    if (bot == null || chat == null) {
        println 'ERROR: faltan credenciales Telegram'
        return
    }
    def text = 'Prueba de conexión: Jenkins y Telegram están configurados para asset-management, rama mateo_ortega. Este mensaje es una prueba de configuración, no el resultado de un build.'
    def body = 'chat_id=' + URLEncoder.encode(chat.secret.plainText, 'UTF-8') + '&text=' + URLEncoder.encode(text, 'UTF-8')
    def connection = new URL('https://api.telegram.org/bot' + bot.secret.plainText + '/sendMessage').openConnection()
    connection.requestMethod = 'POST'
    connection.connectTimeout = 10000
    connection.readTimeout = 20000
    connection.doOutput = true
    connection.setRequestProperty('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
    connection.outputStream.withCloseable { it.write(body.getBytes('UTF-8')) }
    if (connection.responseCode != 200) {
        println 'ERROR: Telegram rechazó la prueba'
        return
    }
    def result = new JsonSlurperClassic().parseText(connection.inputStream.getText('UTF-8'))
    println result.ok == true ? 'TELEGRAM_OK' : 'ERROR: Telegram no confirmó el mensaje'
    connection.disconnect()
} catch (Exception ignored) {
    println 'ERROR: no se pudo confirmar la prueba de Telegram'
}
'''


def main():
    user = os.environ.get("JENKINS_USERNAME") or input("Usuario administrador de Jenkins: ").strip()
    password = os.environ.get("JENKINS_API_TOKEN") or getpass("Contraseña/API token de Jenkins (oculto): ")
    opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
    headers = {"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()}
    try:
        with opener.open(Request("http://localhost:8080/crumbIssuer/api/json", headers=headers), timeout=20) as response:
            crumb = json.load(response)
        headers[crumb["crumbRequestField"]] = crumb["crumb"]
        data = urlencode({"script": SCRIPT}).encode()
        with opener.open(Request("http://localhost:8080/scriptText", headers=headers, data=data), timeout=40) as response:
            result = response.read().decode()
        if result.strip() == "TELEGRAM_OK":
            print("Telegram confirmó el mensaje real de prueba enviado desde Jenkins.")
            return 0
        print("Jenkins no confirmó la prueba; comprueba las credenciales y la conexión.")
        return 1
    except (HTTPError, URLError, OSError, KeyError, ValueError):
        print("No se pudo completar la prueba; comprueba el acceso administrativo de Jenkins.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
