import os
import logging
from typing import Dict, Any, List, Optional, Literal, TypedDict
from langgraph.graph import StateGraph, START, END

from app.schemas.scout import ScoutOutput
from app.schemas.strategist import StrategistOutput
from app.schemas.engineer import EngineerOutput
from app.schemas.runs import TestAttemptResult
from app.services.events import events_manager
from app.services.sandbox import sandbox_runner
from app.storage.db import db_storage
from app.agents.scout import ScoutAgent
from app.agents.strategist import StrategistAgent
from app.agents.engineer import EngineerAgent
from app.config import settings

logger = logging.getLogger("shadowbuilder.workflow")


class WorkflowGraphState(TypedDict, total=False):
    run_id: str
    competitor_url: str
    demo_target: str
    force_fixture: bool
    scout_output: Optional[ScoutOutput]
    strategist_output: Optional[StrategistOutput]
    engineer_output: Optional[EngineerOutput]
    test_results: List[TestAttemptResult]
    repair_attempts: int
    max_repairs: int
    disposable_workspace: Optional[str]
    patch_diff: Optional[str]
    patch_artifact_path: Optional[str]
    status: str
    final_verdict: str
    error_summary: Optional[str]


async def scout_step(state: WorkflowGraphState) -> Dict[str, Any]:
    run_id = state["run_id"]
    target_url = state["competitor_url"]
    force_fixture = state.get("force_fixture", False)

    events_manager.publish(
        run_id=run_id,
        agent="scout",
        status="running",
        message=f"Starting safe competitor extraction for {target_url}",
    )
    db_storage.update_run(run_id, status="running")

    scout_output = await ScoutAgent.run(run_id, target_url, force_fixture=force_fixture)

    status_str = "succeeded" if scout_output.observed_features else "failed"
    msg = (
        f"Extracted {len(scout_output.observed_features)} features and {len(scout_output.limitations)} caveats from {target_url}"
        if scout_output.observed_features
        else f"Extraction ended with limitations: {'; '.join(scout_output.limitations)}"
    )

    events_manager.publish(
        run_id=run_id,
        agent="scout",
        status=status_str,
        message=msg,
        metadata={"features_count": len(scout_output.observed_features), "title": scout_output.page_title},
    )

    db_storage.update_run(run_id, scout=scout_output)
    return {"scout_output": scout_output}


async def strategist_step(state: WorkflowGraphState) -> Dict[str, Any]:
    run_id = state["run_id"]
    scout_output: ScoutOutput = state["scout_output"]
    force_fixture = state.get("force_fixture", False)

    events_manager.publish(
        run_id=run_id,
        agent="strategist",
        status="running",
        message="Synthesizing competitor evidence and evaluating feature opportunities",
    )

    strat_output = await StrategistAgent.run(scout_output, force_fixture=force_fixture)
    selected_title = strat_output.selected_opportunity.title if strat_output.selected_opportunity else "None"
    score_val = strat_output.selected_opportunity.score if strat_output.selected_opportunity else 0.0

    events_manager.publish(
        run_id=run_id,
        agent="strategist",
        status="succeeded",
        message=f"Identified {len(strat_output.opportunities)} opportunities. Selected: '{selected_title}' (Score: {score_val})",
        metadata={
            "selected_opportunity": selected_title,
            "score": score_val,
            "opportunities_count": len(strat_output.opportunities),
        },
    )

    db_storage.update_run(run_id, strategist=strat_output)
    return {"strategist_output": strat_output}


async def engineer_step(state: WorkflowGraphState) -> Dict[str, Any]:
    run_id = state["run_id"]
    strat_output: StrategistOutput = state["strategist_output"]
    repair_attempts = state.get("repair_attempts", 0)
    force_fixture = state.get("force_fixture", False)
    test_results = state.get("test_results", [])

    is_repair = repair_attempts > 0
    agent_status = "retrying" if is_repair else "running"
    prompt_context = None

    if is_repair and test_results:
        last_failure = test_results[-1]
        prompt_context = f"Exit code {last_failure.exit_code}\nStderr:\n{last_failure.stderr}\nStdout:\n{last_failure.stdout}"

    msg = (
        f"Repairing feature patch (attempt {repair_attempts}/2) using test failure feedback"
        if is_repair
        else f"Generating constrained code patch for '{strat_output.selected_opportunity.title if strat_output.selected_opportunity else 'Feature'}'"
    )

    events_manager.publish(
        run_id=run_id,
        agent="engineer",
        status=agent_status,
        message=msg,
        metadata={"repair_attempt": repair_attempts},
    )

    engineer_output = await EngineerAgent.run(
        strat_output,
        test_failure_context=prompt_context,
        repair_attempt=repair_attempts,
        force_fixture=force_fixture,
    )

    events_manager.publish(
        run_id=run_id,
        agent="engineer",
        status="succeeded",
        message=f"Patch prepared for {len(engineer_output.files_proposed)} files: {', '.join(engineer_output.files_proposed)}",
        metadata={"files": engineer_output.files_proposed},
    )

    db_storage.update_run(run_id, engineer=engineer_output)
    return {"engineer_output": engineer_output}


async def test_step(state: WorkflowGraphState) -> Dict[str, Any]:
    run_id = state["run_id"]
    engineer_output: EngineerOutput = state["engineer_output"]
    repair_attempts = state.get("repair_attempts", 0)
    test_results = list(state.get("test_results", []))

    # Prepare or reuse disposable workspace
    workspace_dir = state.get("disposable_workspace")
    if not workspace_dir:
        workspace_dir = sandbox_runner.prepare_disposable_workspace(run_id)

    events_manager.publish(
        run_id=run_id,
        agent="tester",
        status="running",
        message=f"Executing fixed test command 'pytest tests/' in isolated sandbox (attempt {repair_attempts + 1})",
        metadata={"workspace": workspace_dir, "attempt": repair_attempts + 1},
    )

    passed, test_attempt, diff_text = sandbox_runner.run_tests(
        run_id=run_id,
        attempt_number=repair_attempts + 1,
        workspace_dir=workspace_dir,
        patch_files=engineer_output.patches,
    )

    test_results.append(test_attempt)

    if passed:
        events_manager.publish(
            run_id=run_id,
            agent="tester",
            status="succeeded",
            message=f"All sandbox unit tests PASSED (exit code 0 in {test_attempt.duration_ms}ms)",
            metadata={"exit_code": 0, "duration_ms": test_attempt.duration_ms},
        )
    else:
        events_manager.publish(
            run_id=run_id,
            agent="tester",
            status="failed",
            message=f"Tests FAILED with exit code {test_attempt.exit_code}. Duration: {test_attempt.duration_ms}ms",
            metadata={"exit_code": test_attempt.exit_code, "stderr": test_attempt.stderr[:200]},
        )

    db_storage.update_run(
        run_id,
        test_results=test_results,
        patch_content=diff_text or engineer_output.patch,
        repair_attempts=repair_attempts,
    )

    return {
        "test_results": test_results,
        "disposable_workspace": workspace_dir,
        "patch_diff": diff_text or engineer_output.patch,
    }


def should_repair_or_finish(state: WorkflowGraphState) -> Literal["engineer", "results"]:
    test_results = state.get("test_results", [])
    if not test_results:
        return "results"

    last_test = test_results[-1]
    if last_test.passed:
        return "results"

    repair_attempts = state.get("repair_attempts", 0)
    max_repairs = state.get("max_repairs", 2)

    if repair_attempts < max_repairs:
        state["repair_attempts"] = repair_attempts + 1
        return "engineer"
    else:
        return "results"


async def results_step(state: WorkflowGraphState) -> Dict[str, Any]:
    run_id = state["run_id"]
    test_results = state.get("test_results", [])
    patch_diff = state.get("patch_diff", "")
    repair_attempts = state.get("repair_attempts", 0)

    # Save patch artifact to disk
    artifacts_dir = os.path.abspath(settings.artifacts_dir)
    runs_artifacts_dir = os.path.join(artifacts_dir, "runs")
    os.makedirs(runs_artifacts_dir, exist_ok=True)
    patch_path = os.path.join(runs_artifacts_dir, f"{run_id}.patch")

    with open(patch_path, "w", encoding="utf-8") as f:
        f.write(patch_diff if patch_diff else "# Empty diff")

    passed = any(t.passed for t in test_results)
    final_verdict = "SUCCESS" if passed else ("FAILED_TESTS" if test_results else "FAILED_PIPELINE")
    final_status = "succeeded" if passed else "failed"

    events_manager.publish(
        run_id=run_id,
        agent="system",
        status=final_status,
        message=f"ShadowBuilder AI workflow finished with final verdict: {final_verdict} (Repairs used: {repair_attempts}/2)",
        metadata={
            "final_verdict": final_verdict,
            "patch_path": patch_path,
            "tests_passed": passed,
            "total_attempts": len(test_results),
        },
    )

    db_storage.update_run(
        run_id,
        status=final_status,
        patch_path=patch_path,
        patch_content=patch_diff,
        repair_attempts=repair_attempts,
        final_verdict=final_verdict,
    )

    return {
        "status": final_status,
        "final_verdict": final_verdict,
        "patch_artifact_path": patch_path,
    }


def build_workflow():
    builder = StateGraph(WorkflowGraphState)

    builder.add_node("scout", scout_step)
    builder.add_node("strategist", strategist_step)
    builder.add_node("engineer", engineer_step)
    builder.add_node("tester", test_step)
    builder.add_node("results", results_step)

    builder.add_edge(START, "scout")
    builder.add_edge("scout", "strategist")
    builder.add_edge("strategist", "engineer")
    builder.add_edge("engineer", "tester")
    builder.add_conditional_edges("tester", should_repair_or_finish, {"engineer": "engineer", "results": "results"})
    builder.add_edge("results", END)

    return builder.compile()


shadow_workflow = build_workflow()
