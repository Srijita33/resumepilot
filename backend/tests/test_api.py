import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
import gemma, main
from gemma import GemmaError, extract_json

client = TestClient(main.app)
ROOT = pathlib.Path(__file__).resolve().parents[2] / "sample"
JD = (ROOT / "sample_job_description.txt").read_text()

GOOD = {"resume_profile": {"name": "Arjun Mehta", "skills": ["Python", "FastAPI"]},
        "jd_profile": {"important_keywords": ["RAG", "FastAPI", "Docker"]},
        "analysis": {"overall_score": 78, "skills_score": "82", "experience_score": 74, "projects_score": 80,
                     "education_score": 90, "strong_matches": [{"name": "FastAPI", "evidence": "internship"}],
                     "missing_skills": ["Docker"], "keyword_gaps": ["Docker"], "important_keywords": ["RAG", "FastAPI", "Docker"],
                     "recommendations": [{"title": "Move MedTech RAG up", "why": "JD wants RAG"}], "explanation": "x"}}


@pytest.fixture(scope="session")
def pdf_bytes():
    import subprocess
    subprocess.run([sys.executable, str(pathlib.Path(__file__).resolve().parents[1] / "scripts/make_sample_pdf.py")], check=True)
    return (ROOT / "sample_resume.pdf").read_bytes()


def post(pdf, jd=JD, name="r.pdf"):
    return client.post("/api/analyze", files={"resume": (name, pdf, "application/pdf")}, data={"jd_text": jd})


def test_extract_json_messy():
    assert extract_json('Sure!\n```json\n{"a": [1,2,],}\n```')["a"] == [1, 2]


def test_analyze_ok(pdf_bytes, monkeypatch):
    monkeypatch.setattr(gemma, "generate_text", lambda p: "```json\n" + json.dumps(GOOD) + "\n```")
    r = post(pdf_bytes)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["analysis"]["skills_score"] == 82 and "MedTech" in d["resume_text"]
    assert d["keyword_coverage"]["matched"] == ["RAG", "FastAPI"]


def test_malformed_then_repair(pdf_bytes, monkeypatch):
    calls = iter(["not json at all", json.dumps(GOOD)])
    monkeypatch.setattr(gemma, "generate_text", lambda p: next(calls))
    assert post(pdf_bytes).status_code == 200


def test_malformed_twice(pdf_bytes, monkeypatch):
    monkeypatch.setattr(gemma, "generate_text", lambda p: "garbage")
    assert post(pdf_bytes).status_code == 502


def test_invalid_pdf_and_empty_jd(pdf_bytes):
    assert post(b"hello", name="x.pdf").status_code == 400
    assert post(pdf_bytes, jd="  ").status_code == 400


def test_api_key_missing(pdf_bytes, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = post(pdf_bytes)
    assert r.status_code == 500 and "GEMINI_API_KEY" in r.json()["detail"]


def test_tailor(monkeypatch):
    out = "ARJUN MEHTA\n" + "Python developer. " * 5 + "\n=====CHANGES=====\n- Reordered projects\n=====VERIFY=====\n- None"
    monkeypatch.setattr(gemma, "generate_text", lambda p: out)
    r = client.post("/api/tailor", json={"resume_text": "x" * 60, "jd_text": JD})
    assert r.status_code == 200 and r.json()["changes_made"] == ["Reordered projects"] and r.json()["verify_items"] == []
