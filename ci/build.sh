#!/usr/bin/env bash
set -uo pipefail
mkdir -p ci-output frontend/reports
java -version
mvn --version
node --version
npm --version
if [[ -z "${AMS_TEST_DATABASE_URL:-}" ]]; then
  echo 'ERROR: falta AMS_TEST_DATABASE_URL; no se permite omitir las pruebas de integración.' >&2
  exit 1
fi
# Ejecutar ambos proyectos aunque uno falle, conservando todos los resultados.
backend=0
mvn -B -ntp clean verify >ci-output/backend.log 2>&1 || backend=$?
cat ci-output/backend.log
frontend=0
(
  set -e
  cd frontend
  npm ci --no-audit --no-fund
  npm test -- --reporter=default --reporter=junit --outputFile=reports/vitest.xml
  npm run build
) >ci-output/frontend.log 2>&1 || frontend=$?
cat ci-output/frontend.log
reports=0
python3 ci/check_reports.py || reports=$?
if ((backend != 0 || frontend != 0 || reports != 0)); then
  echo "ERROR: backend=$backend frontend=$frontend reportes=$reports" >&2
  exit 1
fi
echo 'Backend y frontend compilados; todas las pruebas ejecutadas sin omisiones.'
