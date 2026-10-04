import io
from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_BYTES = 5 * 1024 * 1024
MAX_CHARS = 20000


class InputError(Exception):
    pass


def pdf_to_text(data: bytes) -> str:
    if len(data) > MAX_BYTES:
        raise InputError("File is too large (max 5 MB).")
    if not data.startswith(b"%PDF"):
        raise InputError("That file is not a valid PDF.")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise InputError("The PDF is password-protected.")
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
    except InputError:
        raise
    except (PdfReadError, Exception):
        raise InputError("Could not read this PDF. It may be corrupted.")
    text = text.strip()
    if not text:
        raise InputError("No text found in the PDF (scanned image?). Upload a text-based PDF.")
    return text[:MAX_CHARS]


def file_to_text(name: str, data: bytes) -> str:
    if name.lower().endswith(".pdf") or data.startswith(b"%PDF"):
        return pdf_to_text(data)
    try:
        return data.decode("utf-8", errors="ignore").strip()[:MAX_CHARS]
    except Exception:
        raise InputError("Could not read the job description file.")
