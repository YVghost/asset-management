"""Crea el job sin ejecutarlo ni sustituir un job existente. No crea credenciales."""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPCookieProcessor


def main():
    root = Path(__file__).resolve().parents[1]
    user = os.environ.get("JENKINS_USERNAME", "admin")
    password = os.environ.get("JENKINS_API_TOKEN")
    if not password:
        result = subprocess.run(["docker", "compose", "-f", str(root / "docker-compose.jenkins.yml"),
                                 "exec", "-T", "jenkins", "cat", "/var/jenkins_home/secrets/initialAdminPassword"],
                                cwd=root, capture_output=True, text=True)
        if result.returncode:
            print("Configura JENKINS_USERNAME y JENKINS_API_TOKEN para crear el job.")
            return 1
        password = result.stdout.strip()
    opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
    headers = {"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()}
    base = "http://localhost:8080"
    try:
        try:
            with opener.open(Request(base + "/job/asset-management-ci/api/json", headers=headers), timeout=15):
                print("El job asset-management-ci ya existe; no se modificó ni ejecutó.")
                return 0
        except HTTPError as error:
            if error.code != 404:
                raise
        with opener.open(Request(base + "/crumbIssuer/api/json", headers=headers), timeout=15) as response:
            crumb = json.load(response)
        headers[crumb["crumbRequestField"]] = crumb["crumb"]
        headers["Content-Type"] = "application/xml"
        flow = ET.Element("flow-definition", {"plugin": "workflow-job"})
        ET.SubElement(flow, "description").text = "Deber Jenkins: tres etapas. Configura github-private y Telegram antes de ejecutar."
        properties = ET.SubElement(flow, "properties")
        prop = ET.SubElement(properties, "hudson.model.ParametersDefinitionProperty")
        params = ET.SubElement(prop, "parameterDefinitions")
        forced = ET.SubElement(params, "hudson.model.BooleanParameterDefinition")
        ET.SubElement(forced, "name").text = "FORCE_FAILURE"
        ET.SubElement(forced, "description").text = "Fallo controlado al terminar la etapa 2."
        ET.SubElement(forced, "defaultValue").text = "false"
        definition = ET.SubElement(flow, "definition", {"class": "org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition", "plugin": "workflow-cps"})
        ET.SubElement(definition, "script").text = (root / "Jenkinsfile").read_text(encoding="utf-8")
        ET.SubElement(definition, "sandbox").text = "true"
        ET.SubElement(flow, "triggers")
        ET.SubElement(flow, "disabled").text = "false"
        data = ET.tostring(flow, encoding="utf-8", xml_declaration=True)
        with opener.open(Request(base + "/createItem?name=asset-management-ci", data=data, headers=headers), timeout=20) as response:
            assert response.status == 200
        print("Job asset-management-ci creado. No se ejecutó; faltan tus credenciales.")
        return 0
    except (HTTPError, URLError, OSError, ValueError, KeyError):
        print("No se pudo crear el job. Completa el asistente y sigue la guía manual.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
