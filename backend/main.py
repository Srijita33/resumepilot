from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import gemma
import prompts
from models import (AnalyzeResponse, KeywordCoverage, ModelAnalysis, TailorRequest, TailorResponse)
from pdf_utils import MAX_CHARS, InputError, file_to_text

DISCLAIMER = ("Scores are an AI-assisted compatibility estimate from Gemma 4 — not an official ATS score "
              "and not scientifically validated.")
WARNING = "Review all generated content before using this resume in an application."

app = FastAPI(title="ResumePilot API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(InputError)
async def _input_err(_, e):
    return JSONResponse({"detail": str(e)}, status_code=400)


@app.exception_handler(gemma.GemmaError)
async def _gemma_err(_, e):
    return JSONResponse({"detail": e.message}, status_code=e.status)


@app.get("/api/health")
def health():
    return {"status": "ok"}


def _norm(s: str) -> str:
    return s.strip().lower()


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(resume: UploadFile = File(...), jd_text: str = Form(""),
                  jd_file: Optional[UploadFile] = File(None)):
    resume_text = file_to_text(resume.filename or "", await resume.read())
    jd = jd_text.strip()
    if not jd and jd_file is not None and jd_file.filename:
        jd = file_to_text(jd_file.filename, await jd_file.read())
    if len(resume_text) < 50:
        raise InputError("The resume looks empty. Upload a PDF with readable text.")
    if len(jd) < 30:
        raise InputError("The job description is empty or too short. Paste the full description.")
    jd = jd[:MAX_CHARS]

    prompt = prompts.ANALYZE.format(rules=prompts.RULES, resume=resume_text, jd=jd)
    result: ModelAnalysis = gemma.generate_json(prompt, ModelAnalysis.model_validate)
    a = result.analysis
    keywords = a.important_keywords or result.jd_profile.important_keywords
    gaps = {_norm(k) for k in a.keyword_gaps}
    weak = [i.name for i in a.weak_or_underrepresented_skills]
    weak_n = {_norm(w) for w in weak}
    coverage = KeywordCoverage(
        matched=[k for k in keywords if _norm(k) not in gaps and _norm(k) not in weak_n],
        missing=a.keyword_gaps,
        weak=[k for k in keywords if _norm(k) in weak_n] or weak)
    return AnalyzeResponse(resume_text=resume_text, jd_text=jd, resume_profile=result.resume_profile,
                           jd_profile=result.jd_profile, analysis=a, keyword_coverage=coverage,
                           disclaimer=DISCLAIMER)


@app.post("/api/tailor", response_model=TailorResponse)
def tailor(req: TailorRequest):
    if len(req.resume_text.strip()) < 50:
        raise InputError("Resume text is empty.")
    if len(req.jd_text.strip()) < 30:
        raise InputError("Job description is empty.")
    recs = "\n".join(f"- {r.title}: {r.action} {'(VERIFY BEFORE ADDING — do not add)' if r.verify_before_adding else ''}"
                     for r in req.recommendations) or "- none"
    raw = gemma.generate_text(prompts.TAILOR.format(
        rules=prompts.RULES, recs=recs, resume=req.resume_text[:MAX_CHARS], jd=req.jd_text[:MAX_CHARS]))
    resume_part, _, rest = raw.partition("=====CHANGES=====")
    changes_part, _, verify_part = rest.partition("=====VERIFY=====")
    bullets = lambda s: [l.lstrip("-• ").strip() for l in s.splitlines() if l.strip().lstrip("-• ").strip()]
    resume_out = resume_part.strip().strip("`").strip()
    if len(resume_out) < 50:
        raise gemma.GemmaError("The model did not return a usable resume draft. Please retry.", 502)
    verify = [v for v in bullets(verify_part) if v.lower() != "none"]
    return TailorResponse(tailored_resume=resume_out, changes_made=bullets(changes_part),
                          verify_items=verify, warning=WARNING)
