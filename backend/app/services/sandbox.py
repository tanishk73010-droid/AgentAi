import os
import shutil
import subprocess
import sys
import time
import logging
from typing import Tuple, List, Optional
from app.config import settings
from app.schemas.runs import TestAttemptResult
from app.schemas.engineer import PatchFile
from app.services.patching import PatchService

logger = logging.getLogger("shadowbuilder.sandbox")

APPROVED_COMMANDS = {
    "pytest": [sys.executable, "-m", "pytest", "tests/"],
}

TEST_TIMEOUT_SECONDS = 15.0


def resolve_demo_target_path(target_name: str = "demo-target") -> str:
    """Finds the controlled demo target directory from backend or workspace root."""
    # Check parent directory (when backend is cwd)
    cand1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", target_name))
    if os.path.exists(cand1):
        return cand1
    # Check current directory
    cand2 = os.path.abspath(target_name)
    if os.path.exists(cand2):
        return cand2
    return cand1


def resolve_temp_root() -> str:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "temp_workspaces"))
    os.makedirs(root, exist_ok=True)
    return root


class SandboxRunner:
    """Executes tests in an isolated disposable workspace in Constrained Template Mode.
    Predefined fixed commands only. No arbitrary shell execution."""

    def __init__(self):
        self.base_demo_target_dir = resolve_demo_target_path("demo-target")
        self.temp_root = resolve_temp_root()

    def prepare_disposable_workspace(self, run_id: str, demo_target: str = "demo-target") -> str:
        """Copies the clean demo-target to a run-specific disposable directory."""
        base_dir = resolve_demo_target_path(demo_target)
        if not os.path.exists(base_dir):
            raise FileNotFoundError(f"Target repository directory not found: {base_dir}")

        workspace_dir = os.path.join(resolve_temp_root(), run_id, demo_target)
        if os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir, ignore_errors=True)

        os.makedirs(os.path.dirname(workspace_dir), exist_ok=True)
        shutil.copytree(base_dir, workspace_dir)
        return workspace_dir

    def run_tests(
        self,
        run_id: str,
        attempt_number: int,
        workspace_dir: str,
        patch_files: Optional[List[PatchFile]] = None,
    ) -> Tuple[bool, TestAttemptResult, str]:
        """Applies patch to workspace and runs fixed approved test command.
        Returns (success_flag, test_result, diff_text).
        """
        diff_text = ""
        # 1. Apply patch if provided
        if patch_files:
            patch_success, patch_err, diff_text = PatchService.apply_patches(workspace_dir, patch_files)
            if not patch_success:
                return False, TestAttemptResult(
                    attempt=attempt_number,
                    command="patch_validation",
                    exit_code=1,
                    stdout="",
                    stderr=f"Patch rejected: {patch_err}",
                    duration_ms=0.0,
                    passed=False,
                ), ""

        # 2. Run fixed test command
        cmd = APPROVED_COMMANDS["pytest"]
        start_time = time.perf_counter()

        logger.info(f"[{run_id}] Executing fixed test command: {' '.join(cmd)} in {workspace_dir}")

        try:
            safe_env = os.environ.copy()
            for key in ["LLM_API_KEY", "FIRECRAWL_API_KEY"]:
                safe_env.pop(key, None)

            proc = subprocess.run(
                cmd,
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                timeout=TEST_TIMEOUT_SECONDS,
                env=safe_env,
            )

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            passed = (proc.returncode == 0)

            sanitized_stdout = self._sanitize_output(proc.stdout)
            sanitized_stderr = self._sanitize_output(proc.stderr)

            result = TestAttemptResult(
                attempt=attempt_number,
                command="pytest tests/",
                exit_code=proc.returncode,
                stdout=sanitized_stdout,
                stderr=sanitized_stderr,
                duration_ms=duration_ms,
                passed=passed,
            )
            return passed, result, diff_text

        except subprocess.TimeoutExpired:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return False, TestAttemptResult(
                attempt=attempt_number,
                command="pytest tests/",
                exit_code=-1,
                stdout="",
                stderr=f"Test execution timed out after {TEST_TIMEOUT_SECONDS}s.",
                duration_ms=duration_ms,
                passed=False,
            ), diff_text
        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return False, TestAttemptResult(
                attempt=attempt_number,
                command="pytest tests/",
                exit_code=1,
                stdout="",
                stderr=f"Test execution failed: {str(e)}",
                duration_ms=duration_ms,
                passed=False,
            ), diff_text

    def _sanitize_output(self, text: str) -> str:
        """Removes local machine paths or secrets from test runner logs."""
        if not text:
            return ""
        user_home = os.path.expanduser("~")
        return text.replace(user_home, "~")


sandbox_runner = SandboxRunner()
