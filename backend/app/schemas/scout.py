from typing import List, Optional
from pydantic import BaseModel, Field


class ObservedFeature(BaseModel):
    name: str = Field(..., description="Short name of the observed feature")
    description: str = Field(..., description="Description of the feature")
    source_url: str = Field(..., description="Exact URL where this evidence was found")
    evidence_excerpt: str = Field(..., description="Verbatim or near-verbatim excerpt from the page")


class FeedbackItem(BaseModel):
    excerpt: str = Field(..., description="Public feedback or review excerpt")
    source_url: str = Field(..., description="Source URL of the feedback")
    sentiment: Optional[str] = Field(default="neutral", description="Observed sentiment: positive, negative, neutral")
    date: Optional[str] = Field(default=None, description="Date of feedback if mentioned")


class ScoutOutput(BaseModel):
    run_id: str
    page_title: str
    target_url: str
    product_summary: str
    observed_features: List[ObservedFeature] = Field(default_factory=list)
    feedback_items: List[FeedbackItem] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    confidence_notes: str = Field(default="Based on public static page extraction.")
