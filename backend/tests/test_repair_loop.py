import pytest
import uuid
from app.graph.workflow import should_repair_or_finish
from app.schemas.runs import TestAttemptResult


def test_should_repair_or_finish_logic():
    # Case 1: Test passed -> finishes immediately
    state_pass = {
        "test_results": [
            TestAttemptResult(
                attempt=1,
                command="pytest tests/",
                exit_code=0,
                stdout="passed",
                stderr="",
                duration_ms=10.0,
                passed=True,
            )
        ],
        "repair_attempts": 0,
        "max_repairs": 2,
    }
    decision = should_repair_or_finish(state_pass)
    assert decision == "results"

    # Case 2: Test failed, 0 repairs used -> routes to engineer for repair attempt 1
    state_fail_1 = {
        "test_results": [
            TestAttemptResult(
                attempt=1,
                command="pytest tests/",
                exit_code=1,
                stdout="",
                stderr="AssertionError in test_exporter",
                duration_ms=10.0,
                passed=False,
            )
        ],
        "repair_attempts": 0,
        "max_repairs": 2,
    }
    decision = should_repair_or_finish(state_fail_1)
    assert decision == "engineer"
    assert state_fail_1["repair_attempts"] == 1

    # Case 3: Test failed, max repairs reached (2) -> routes to results truthfully
    state_fail_max = {
        "test_results": [
            TestAttemptResult(
                attempt=2,
                command="pytest tests/",
                exit_code=1,
                stdout="",
                stderr="Persistent error",
                duration_ms=10.0,
                passed=False,
            )
        ],
        "repair_attempts": 2,
        "max_repairs": 2,
    }
    decision = should_repair_or_finish(state_fail_max)
    assert decision == "results"
