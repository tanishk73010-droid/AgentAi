from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class WorkflowEvent(BaseModel):
    run_id: str
    event_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    agent: str = Field(..., description="Agent or subsystem: scout, strategist, engineer, tester, system")
    status: str = Field(..., description="queued, running, succeeded, failed, retrying")
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
