#!/usr/bin/env bash
# Ejecutar dentro de la imagen Jenkins con el proyecto montado SOLO LECTURA en /source.
set -euo pipefail
work=$(mktemp -d /tmp/ams-ci-verify.XXXXXX)
tar -C /source --exclude=.git --exclude=.cache --exclude=target \
    --exclude=frontend/node_modules --exclude=frontend/dist --exclude=frontend/reports \
    --exclude=.env --exclude='.env.*' --exclude=ci-output --exclude=backups \
    -cf - . | tar -C "$work" -xf -
cd "$work"
export CI=true
python3 -m unittest discover -s ci/tests -v
bash ci/build.sh
