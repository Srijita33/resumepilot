"""Generate sample/sample_resume.pdf from sample/sample_resume.txt (needs reportlab)."""
import pathlib
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

root = pathlib.Path(__file__).resolve().parents[2] / "sample"
c = canvas.Canvas(str(root / "sample_resume.pdf"), pagesize=A4)
y = 800
for line in (root / "sample_resume.txt").read_text().splitlines():
    c.setFont("Helvetica-Bold" if line.isupper() and line.strip() else "Helvetica", 10)
    c.drawString(50, y, line[:110]); y -= 14
    if y < 50: c.showPage(); y = 800
c.save()
print("wrote", root / "sample_resume.pdf")
