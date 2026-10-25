import os
import uuid
import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.schemas.runs import CreateRunRequest, RunResult
from app.schemas.events import WorkflowEvent
from app.services.events import events_manager
from app.services.extraction import validate_and_resolve_url
from app.storage.db import db_storage
from app.graph.workflow import shadow_workflow

router = APIRouter(prefix="/api")


@router.get("/health")
def get_health():
    """Health check endpoint reporting service status and safe configuration presence."""
    return {
        "status": "healthy",
        "service": "ShadowBuilder AI",
        "config": settings.safe_summary(),
    }


async def execute_run_task(run_id: str, competitor_url: str, demo_target: str, force_fixture: bool):
    initial_state = {
        "run_id": run_id,
        "competitor_url": competitor_url,
        "demo_target": demo_target,
        "force_fixture": force_fixture,
        "repair_attempts": 0,
        "max_repairs": 2,
        "test_results": [],
    }
    try:
        await shadow_workflow.ainvoke(initial_state)
    except Exception as e:
        events_manager.publish(
            run_id=run_id,
            agent="system",
            status="failed",
            message=f"Pipeline execution halted due to unexpected error: {str(e)}",
            metadata={"error": str(e)},
        )
        db_storage.update_run(
            run_id=run_id,
            status="failed",
            final_verdict="PIPELINE_ERROR",
            error_summary=str(e),
        )


@router.post("/runs", response_model=RunResult)
def create_run(request: CreateRunRequest, background_tasks: BackgroundTasks):
    """Creates a new run, validates the target URL, and kicks off agent orchestration."""
    target_url = request.competitor_url.strip()

    # Pre-validate URL unless force_fixture is chosen
    if not request.force_fixture:
        valid, err, _ = validate_and_resolve_url(target_url)
        if not valid:
            raise HTTPException(status_code=400, detail=f"Invalid or disallowed URL: {err}")

    # Allowlist demo targets
    allowed_targets = {"demo-target", "acme-metrics"}
    if request.demo_target not in allowed_targets:
        raise HTTPException(
            status_code=400,
            detail=f"Target '{request.demo_target}' is not an allowlisted demo application. Allowed: {', '.join(allowed_targets)}",
        )

    run_id = f"run_{uuid.uuid4().hex[:10]}"
    run_record = db_storage.create_run(run_id, target_url, request.demo_target)

    # Initial queued event
    events_manager.publish(
        run_id=run_id,
        agent="system",
        status="queued",
        message=f"Run {run_id} queued for target {target_url} against {request.demo_target}",
        metadata={"force_fixture": request.force_fixture},
    )

    # Trigger background async task
    background_tasks.add_task(
        execute_run_task,
        run_id=run_id,
        competitor_url=target_url,
        demo_target=request.demo_target,
        force_fixture=request.force_fixture,
    )

    return run_record


@router.get("/runs", response_model=List[RunResult])
def list_runs(limit: int = 20):
    """Returns recent run history."""
    return db_storage.list_runs(limit=limit)


@router.get("/runs/{run_id}", response_model=RunResult)
def get_run(run_id: str):
    """Returns current run details and status."""
    record = db_storage.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return record


@router.get("/runs/{run_id}/result", response_model=RunResult)
def get_run_result(run_id: str):
    """Returns structured final findings, PRD, code patch, and test output."""
    record = db_storage.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return record


@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str):
    """Streams real workflow events in SSE format."""
    record = db_storage.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    return EventSourceResponse(events_manager.subscribe(run_id))


@router.get("/runs/{run_id}/patch")
def download_patch(run_id: str):
    """Downloads the validated code patch for a completed run."""
    record = db_storage.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    if not record.patch_artifact_path or not os.path.exists(record.patch_artifact_path):
        # Fallback to inline patch content if file was not yet flushed
        if record.patch_content:
            return Response(
                content=record.patch_content,
                media_type="text/x-diff",
                headers={"Content-Disposition": f"attachment; filename={run_id}.patch"},
            )
        raise HTTPException(status_code=404, detail="No patch artifact exists for this run.")

    return FileResponse(
        record.patch_artifact_path,
        media_type="text/x-diff",
        filename=f"{run_id}.patch",
    )
