from pydantic import BaseModel, Field


class JobAnalysis(BaseModel):
    role_title: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    ATS_keywords: list[str] = Field(default_factory=list)
    company_signals: list[str] = Field(default_factory=list)
    seniority_level: str = ""


class CandidateAnalysis(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    experience_summary: str = ""
    technical_skills: list[str] = Field(default_factory=list)
    leadership_signals: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    domain_experience: list[str] = Field(default_factory=list)


class MatchAnalysis(BaseModel):
    strong_matches: list[str] = Field(default_factory=list)
    skill_gaps: list[str] = Field(default_factory=list)
    transferable_strengths: list[str] = Field(default_factory=list)
    hiring_risks: list[str] = Field(default_factory=list)
    positioning_opportunities: list[str] = Field(default_factory=list)
    narrative_summary: str = ""


class PositioningStrategy(BaseModel):
    primary_positioning_statement: str = ""
    supporting_story: str = ""
    tone: str = ""
    key_evidence_points: list[str] = Field(default_factory=list)


class AnalysisBundle(BaseModel):
    job_analysis: JobAnalysis
    candidate_analysis: CandidateAnalysis
    match_analysis: MatchAnalysis
    positioning_strategy: PositioningStrategy
