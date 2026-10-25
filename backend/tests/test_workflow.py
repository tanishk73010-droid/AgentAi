import pytest
import uuid
from app.graph.workflow import shadow_workflow
from app.storage.db import db_storage
from app.services.events import events_manager


@pytest.mark.asyncio
async def test_full_workflow_end_to_end():
    run_id = f"test_{uuid.uuid4().hex[:8]}"
    competitor_url = "https://example.com"
    demo_target = "demo-target"

    db_storage.create_run(run_id, competitor_url, demo_target)

    initial_state = {
        "run_id": run_id,
        "competitor_url": competitor_url,
        "demo_target": demo_target,
        "force_fixture": True,  # Labeled fixture mode for reliable CI/CD test
        "repair_attempts": 0,
        "max_repairs": 2,
        "test_results": [],
    }

    final_state = await shadow_workflow.ainvoke(initial_state)

    assert final_state["status"] == "succeeded"
    assert final_state["final_verdict"] == "SUCCESS"

    # Verify run persisted in database
    run_rec = db_storage.get_run(run_id)
    assert run_rec is not None
    assert run_rec.status == "succeeded"
    assert run_rec.final_verdict == "SUCCESS"
    assert run_rec.scout is not None
    assert len(run_rec.scout.observed_features) > 0
    assert run_rec.strategist is not None
    assert run_rec.strategist.selected_opportunity is not None
    assert run_rec.engineer is not None
    assert len(run_rec.test_results) > 0
    assert run_rec.test_results[0].passed is True

    # Verify events were published
    history = events_manager.get_history(run_id)
    assert len(history) >= 5
    agents_present = {e.agent for e in history}
    assert "scout" in agents_present
    assert "strategist" in agents_present
    assert "engineer" in agents_present
    assert "tester" in agents_present
    assert "system" in agents_present
