"""Valida el Jenkinsfile con el parser real del Jenkins local; no muestra secretos."""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPCookieProcessor


def main():
    root = Path(__file__).resolve().parents[1]
    user = os.environ.get("JENKINS_USERNAME", "admin")
    password = os.environ.get("JENKINS_API_TOKEN")
    if not password:
        command = ["docker", "compose", "-f", str(root / "docker-compose.jenkins.yml"), "exec", "-T",
                   "jenkins", "cat", "/var/jenkins_home/secrets/initialAdminPassword"]
        result = subprocess.run(command, cwd=root, capture_output=True, text=True)
        if result.returncode:
            print("No se pudo leer la clave inicial. Usa JENKINS_USERNAME y JENKINS_API_TOKEN.")
            return 1
        password = result.stdout.strip()
    opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
    authorization = "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()
    headers = {"Authorization": authorization}
    base = "http://localhost:8080"
    try:
        with opener.open(Request(base + "/crumbIssuer/api/json", headers=headers), timeout=20) as response:
            crumb = json.load(response)
        headers[crumb["crumbRequestField"]] = crumb["crumb"]
        data = urlencode({"jenkinsfile": (root / "Jenkinsfile").read_text(encoding="utf-8")}).encode()
        with opener.open(Request(base + "/pipeline-model-converter/validate", headers=headers, data=data), timeout=30) as response:
            validation = response.read().decode()
        if "Jenkinsfile successfully validated" not in validation:
            print("El parser no confirmó la validación:")
            print(validation[:3000])
            return 1
        print(validation.strip())
        return 0
    except (HTTPError, URLError, OSError, KeyError, ValueError):
        print("Validación no completada: verifica Jenkins, el asistente inicial y las credenciales locales.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
