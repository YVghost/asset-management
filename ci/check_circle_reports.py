"""Validación modular; reutiliza las reglas del pipeline de Jenkins."""
from pathlib import Path
import sys
from check_reports import check


def validate(scope):
    if scope == "backend":
        reports = list(Path("target/surefire-reports").glob("TEST-*.xml"))
        check(reports, "Backend")
        check([p for p in reports if p.name == "TEST-com.assetmanager.InventoryIntegrationTest.xml"],
              "Integración PostgreSQL")
    elif scope == "frontend":
        check([Path("frontend/reports/vitest.xml")], "Frontend")
    else:
        raise ValueError("Alcance inválido")


if __name__ == "__main__":
    validate(sys.argv[1])
