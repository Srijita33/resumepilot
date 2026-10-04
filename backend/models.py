from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


def _score(v: Any) -> int:
    try:
        return max(0, min(100, int(round(float(v)))))
    except (TypeError, ValueError):
        return 0


class Item(BaseModel):
    name: str
    detail: str = ""


def _coerce_items(v: Any) -> list:
    out = []
    for x in v or []:
        if isinstance(x, str):
            out.append({"name": x, "detail": ""})
        elif isinstance(x, dict):
            vals = [str(i) for i in x.values() if isinstance(i, (str, int, float))]
            name = x.get("name") or x.get("skill") or x.get("item") or (vals[0] if vals else "")
            detail = x.get("detail") or x.get("evidence") or x.get("reason") or x.get("explanation") or ""
            out.append({"name": str(name), "detail": str(detail)})
    return out


def _coerce_strs(v: Any) -> list:
    out = []
    for x in v or []:
        out.append(x if isinstance(x, str) else (str(next(iter(x.values()), "")) if isinstance(x, dict) else str(x)))
    return [s for s in out if s.strip()]


class Recommendation(BaseModel):
    title: str
    why: str = ""
    action: str = ""
    verify_before_adding: bool = False


class Scores(BaseModel):
    overall_score: int = 0
    skills_score: int = 0
    experience_score: int = 0
    projects_score: int = 0
    education_score: int = 0

    _clamp = field_validator("overall_score", "skills_score", "experience_score", "projects_score", "education_score", mode="before")(lambda cls, v: _score(v))


class ResumeProfile(BaseModel):
    name: str = ""
    education: List[str] = []
    experience: List[str] = []
    skills: List[str] = []
    projects: List[str] = []
    certifications: List[str] = []
    achievements: List[str] = []

    @field_validator("name", mode="before")
    @classmethod
    def _n(cls, v):
        return "" if v is None else str(v)

    _s = field_validator("education", "experience", "skills", "projects", "certifications", "achievements", mode="before")(
        lambda cls, v: _coerce_strs(v))


class JDProfile(BaseModel):
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    responsibilities: List[str] = []
    qualifications: List[str] = []
    experience_requirements: List[str] = []
    important_keywords: List[str] = []

    _s = field_validator("*", mode="before")(lambda cls, v: _coerce_strs(v))


class Analysis(Scores):
    strong_matches: List[Item] = []
    missing_skills: List[Item] = []
    weak_or_underrepresented_skills: List[Item] = []
    important_keywords: List[str] = []
    keyword_gaps: List[str] = []
    recommendations: List[Recommendation] = []
    explanation: str = ""

    _i = field_validator("strong_matches", "missing_skills", "weak_or_underrepresented_skills", mode="before")(
        lambda cls, v: _coerce_items(v))
    _k = field_validator("important_keywords", "keyword_gaps", mode="before")(lambda cls, v: _coerce_strs(v))

    @field_validator("recommendations", mode="before")
    @classmethod
    def _r(cls, v):
        return [{"title": x} if isinstance(x, str) else x for x in (v or [])]


class ModelAnalysis(BaseModel):
    resume_profile: ResumeProfile = ResumeProfile()
    jd_profile: JDProfile = JDProfile()
    analysis: Analysis = Analysis()


class KeywordCoverage(BaseModel):
    matched: List[str]
    missing: List[str]
    weak: List[str]


class AnalyzeResponse(BaseModel):
    resume_text: str = Field(description="Echoed so the client can request tailoring; never stored server-side.")
    jd_text: str
    resume_profile: ResumeProfile
    jd_profile: JDProfile
    analysis: Analysis
    keyword_coverage: KeywordCoverage
    disclaimer: str


class TailorRequest(BaseModel):
    resume_text: str
    jd_text: str
    recommendations: List[Recommendation] = []


class TailorResponse(BaseModel):
    tailored_resume: str
    changes_made: List[str]
    verify_items: List[str]
    warning: str
