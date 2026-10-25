from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from app.schemas.scout import ScoutOutput
from app.schemas.strategist import StrategistOutput
from app.schemas.engineer import EngineerOutput


class CreateRunRequest(BaseModel):
    competitor_url: str = Field(..., description="Public competitor website URL")
    demo_target: str = Field(default="demo-target", description="Controlled target demo identifier")
    force_fixture: bool = Field(default=False, description="Explicitly use labeled fixture mode")


class TestAttemptResult(BaseModel):
    attempt: int
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    passed: bool


class RunResult(BaseModel):
    run_id: str
    competitor_url: str
    demo_target: str
    status: str = Field(..., description="queued, running, succeeded, failed")
    created_at: str
    updated_at: str
    scout: Optional[ScoutOutput] = None
    strategist: Optional[StrategistOutput] = None
    engineer: Optional[EngineerOutput] = None
    test_results: List[TestAttemptResult] = Field(default_factory=list)
    patch_artifact_path: Optional[str] = None
    patch_content: Optional[str] = None
    repair_attempts: int = 0
    final_verdict: str = Field(default="UNKNOWN", description="SUCCESS, FAILED_TESTS, FAILED_EXTRACTION, etc.")
    error_summary: Optional[str] = None
