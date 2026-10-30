"""Render the Markdown report as Word. Requires python-docx (see guide)."""
from pathlib import Path
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]


def plain(text):
    return text.replace("**", "").replace("`", "")


def main():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = section.bottom_margin = Inches(0.7)
    section.left_margin = section.right_margin = Inches(0.7)
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10)
    style.paragraph_format.space_after = Pt(6)
    for name in ["Title", "Heading 1", "Heading 2"]:
        doc.styles[name].font.color.rgb = RGBColor.from_string("17365D")
    lines = (ROOT / "docs/INFORME_JENKINS_CIRCLECI.md").read_text(encoding="utf-8").splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].startswith("|"):
                cells = [plain(x.strip()) for x in lines[index].strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", x) for x in cells):
                    rows.append(cells)
                index += 1
            table = doc.add_table(rows=0, cols=len(rows[0]))
            table.style = "Light Shading Accent 1"
            for row_index, row in enumerate(rows):
                cells = table.add_row().cells
                for cell, value in zip(cells, row):
                    cell.text = value
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            run.font.size = Pt(8)
                            run.bold = row_index == 0
            doc.add_paragraph()
            continue
        if line.startswith("# "):
            doc.add_heading(line[2:], 0)
        elif line.startswith("## "):
            doc.add_heading(line[3:], 1)
        elif line.startswith("- "):
            doc.add_paragraph(plain(line[2:]), style="List Bullet")
        elif line.strip():
            doc.add_paragraph(plain(line))
        index += 1
    doc.add_page_break()
    doc.add_heading("Anexo: evidencias historicas de Jenkins", 1)
    for filename, caption in [
        ("01-pipeline-etapas.png", "Jenkins: pipeline de tres etapas."),
        ("03-resultados-pruebas.png", "Jenkins: 46 pruebas de aplicacion aprobadas."),
        ("05-fallo-controlado.png", "Jenkins: demostracion de fallo controlado."),
    ]:
        path = ROOT / "docs/evidencias-jenkins" / filename
        if path.exists():
            doc.add_paragraph(caption)
            doc.add_picture(str(path), width=Inches(6.7))
    section.footer.paragraphs[0].text = "AMS | Jenkins y CircleCI | Revision 29/10/2026"
    destination = ROOT / "docs/INFORME_JENKINS_CIRCLECI_MATEO_ORTEGA.docx"
    doc.save(destination)
    print(destination)


if __name__ == "__main__":
    main()
