from pydantic import BaseModel, Field


class CoverLetter(BaseModel):
    subject: str = ""
    body: str = ""


class CVExperienceEntry(BaseModel):
    company: str = ""
    role: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    highlights: list[str] = Field(default_factory=list)


class CVProjectEntry(BaseModel):
    name: str = ""
    role: str = ""
    technologies: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)


class CVEducationEntry(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    dates: str = ""


class TailoredCV(BaseModel):
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[CVExperienceEntry] = Field(default_factory=list)
    projects: list[CVProjectEntry] = Field(default_factory=list)
    education: list[CVEducationEntry] = Field(default_factory=list)
    cv_text: str = ""
    candidate_details: dict = Field(default_factory=dict)


class ATSScore(BaseModel):
    keyword_coverage: float = 0.0
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
