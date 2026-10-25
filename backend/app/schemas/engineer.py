from typing import List, Optional
from pydantic import BaseModel, Field


class PatchFile(BaseModel):
    path: str = Field(..., description="Relative path within demo target repository")
    action: str = Field(default="modify", description="Action: modify or create")
    diff: str = Field(default="", description="Unified diff or patch snippet")
    content: Optional[str] = Field(default=None, description="Full file content if new or replacing")


class EngineerOutput(BaseModel):
    run_id: str
    selected_feature: str
    rationale: str
    files_proposed: List[str] = Field(default_factory=list)
    patch: str = Field(..., description="Complete unified diff patch text")
    patches: List[PatchFile] = Field(default_factory=list)
    requested_test_commands: List[str] = Field(default_factory=list)
    expected_acceptance_criteria: List[str] = Field(default_factory=list)
    assumptions_and_limitations: List[str] = Field(default_factory=list)
