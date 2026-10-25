from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


def calculate_opportunity_score(impact: int, evidence_strength: int, confidence: int, effort: int) -> float:
    """Formula per requirement.md:
    score = 0.30 * impact + 0.30 * evidence_strength + 0.25 * confidence + 0.15 * (6 - effort)
    Range is roughly 1.0 to 5.0.
    """
    raw_score = 0.30 * impact + 0.30 * evidence_strength + 0.25 * confidence + 0.15 * (6 - effort)
    return round(raw_score, 2)


class OpportunityCandidate(BaseModel):
    id: str = Field(..., description="Unique identifier for candidate e.g. opp-1")
    title: str = Field(..., description="Feature title")
    description: str = Field(..., description="Detailed description")
    user_problem: str = Field(..., description="Problem this feature solves for users")
    evidence_references: List[str] = Field(default_factory=list, description="URLs and excerpts cited")
    facts_vs_hypotheses: str = Field(..., description="Clear distinction between verified facts and speculative hypotheses")
    impact: int = Field(ge=1, le=5, description="Expected user/business impact (1-5)")
    evidence_strength: int = Field(ge=1, le=5, description="Strength of public evidence backing this (1-5)")
    confidence: int = Field(ge=1, le=5, description="Confidence in feasibility and value (1-5)")
    effort: int = Field(ge=1, le=5, description="Estimated implementation effort (1-5, 5 = highest effort)")
    score: float = Field(default=0.0, description="Calculated weighted prioritization score")
    scoring_explanation: str = Field(..., description="Transparent breakdown of the score calculation")


class PRD(BaseModel):
    title: str
    overview: str
    goals: List[str] = Field(default_factory=list)
    non_goals: List[str] = Field(default_factory=list)
    user_stories: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)
    edge_cases: List[str] = Field(default_factory=list)
    test_plan: str


class StrategistOutput(BaseModel):
    run_id: str
    opportunities: List[OpportunityCandidate] = Field(default_factory=list)
    selected_opportunity: Optional[OpportunityCandidate] = None
    prd: Optional[PRD] = None
    limitations: List[str] = Field(default_factory=list)
