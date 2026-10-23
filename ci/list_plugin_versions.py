"""Imprime el lock reproducible de los plugins resueltos de la imagen."""
from pathlib import Path
import re
import zipfile

for plugin in sorted(Path("/usr/share/jenkins/ref/plugins").glob("*.jpi")):
    with zipfile.ZipFile(plugin) as archive:
        manifest = archive.read("META-INF/MANIFEST.MF").decode()
    manifest = manifest.replace("\r\n ", "").replace("\n ", "")
    version = re.search(r"^Plugin-Version: (.+)$", manifest, re.MULTILINE).group(1).strip()
    print(f"{plugin.stem}:{version}")
