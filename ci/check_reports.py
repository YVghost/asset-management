"""No permitir un build verde por pruebas ausentes, omitidas o fallidas."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


def check(paths, label):
    paths = list(paths)
    if not paths:
        raise ValueError(f"{label}: no se encontraron reportes JUnit")
    tests = failed = skipped = 0
    for path in paths:
        root = ET.parse(path).getroot()
        cases = list(root.iter("testcase"))
        tests += len(cases)
        for case in cases:
            failed += int(case.find("failure") is not None or case.find("error") is not None)
            skipped += int(case.find("skipped") is not None)
    print(f"{label}: {tests} pruebas, {failed} fallidas, {skipped} omitidas")
    if tests == 0 or failed or skipped:
        raise ValueError(f"{label}: se requieren pruebas ejecutadas, sin fallos ni omisiones")
    return tests


def main():
    try:
        backend = list(Path("target/surefire-reports").glob("TEST-*.xml"))
        integration = [p for p in backend if p.name == "TEST-com.assetmanager.InventoryIntegrationTest.xml"]
        check(backend, "Backend")
        check(integration, "Integración PostgreSQL")
        check([Path("frontend/reports/vitest.xml")], "Frontend")
    except (ValueError, OSError, ET.ParseError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
