"""Registra github-private mediante la API autenticada de Jenkins; entrada oculta."""
import base64
from getpass import getpass
import http.cookiejar
import json
import sys
import xml.etree.ElementTree as ET
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPCookieProcessor, urlopen


def main():
    print("No se escribirán claves en archivos ni se ejecutará el pipeline.")
    username = input("Usuario administrador de Jenkins: ").strip()
    password = getpass("Contraseña o token API de Jenkins (oculto): ")
    github_token = getpass("Token GitHub (oculto): ").strip()
    if not username or not password or not github_token:
        print("Faltan credenciales; no se realizó ningún cambio.")
        return 1
    try:
        gh_headers = {"Authorization": "Bearer " + github_token,
                      "Accept": "application/vnd.github+json", "User-Agent": "ams-jenkins-setup"}
        with urlopen(Request("https://api.github.com/user", headers=gh_headers), timeout=20) as response:
            github_user = json.load(response)["login"]
        with urlopen(Request("https://api.github.com/repos/YVghost/asset-management/branches/mateo_ortega", headers=gh_headers), timeout=20):
            pass
    except (HTTPError, URLError, OSError, KeyError, ValueError):
        print("GitHub no confirmó acceso a mateo_ortega. Revisa vigencia, propietario y Contents: Read-only.")
        return 1
    opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
    headers = {"Authorization": "Basic " + base64.b64encode(f"{username}:{password}".encode()).decode()}
    base = "http://localhost:8080"
    try:
        with opener.open(Request(base + "/crumbIssuer/api/json", headers=headers), timeout=20) as response:
            crumb = json.load(response)
        headers[crumb["crumbRequestField"]] = crumb["crumb"]
        headers["Content-Type"] = "application/xml"
        credential = ET.Element("com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl")
        for name, value in [("scope", "GLOBAL"), ("id", "github-private"),
                            ("description", "Lectura de asset-management en GitHub"),
                            ("username", github_user), ("password", github_token)]:
            ET.SubElement(credential, name).text = value
        data = ET.tostring(credential, encoding="utf-8", xml_declaration=True)
        store = base + "/credentials/store/system/domain/_"
        try:
            with opener.open(Request(store + "/credential/github-private/api/json", headers=headers), timeout=20):
                exists = True
        except HTTPError as error:
            if error.code != 404:
                raise
            exists = False
        endpoint = store + ("/credential/github-private/config.xml" if exists else "/createCredentials")
        with opener.open(Request(endpoint, headers=headers, data=data, method="POST"), timeout=20) as response:
            if response.status not in (200, 201, 204):
                raise ValueError("Respuesta inesperada")
        print("Credencial github-private guardada en Jenkins. GitHub confirmó acceso a mateo_ortega.")
        print("El pipeline no se ejecutó y no se modificaron archivos con credenciales.")
        return 0
    except (HTTPError, URLError, OSError, KeyError, ValueError):
        print("Jenkins no confirmó el guardado. Revisa usuario, clave/API token y permisos de administración.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
