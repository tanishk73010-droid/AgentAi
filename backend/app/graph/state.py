from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.scout import ScoutOutput
from app.schemas.strategist import StrategistOutput
from app.schemas.engineer import EngineerOutput
from app.schemas.runs import TestAttemptResult


class WorkflowState(BaseModel):
    run_id: str
    competitor_url: str
    demo_target: str = "demo-target"
    force_fixture: bool = False

    scout_output: Optional[ScoutOutput] = None
    strategist_output: Optional[StrategistOutput] = None
    engineer_output: Optional[EngineerOutput] = None

    test_results: List[TestAttemptResult] = Field(default_factory=list)
    repair_attempts: int = 0
    max_repairs: int = 2

    disposable_workspace: Optional[str] = None
    patch_diff: Optional[str] = None
    patch_artifact_path: Optional[str] = None

    status: str = "queued"
    final_verdict: str = "UNKNOWN"
    error_summary: Optional[str] = None
