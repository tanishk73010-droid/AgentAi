import sqlite3
import json
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.config import settings
from app.schemas.runs import RunResult, TestAttemptResult
from app.schemas.scout import ScoutOutput
from app.schemas.strategist import StrategistOutput
from app.schemas.engineer import EngineerOutput


class RunStorage:
    """SQLite-backed run persistence per Section 14."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Parse sqlite:///./shadowbuilder.db or default
            raw = settings.database_url
            if raw.startswith("sqlite:///"):
                db_path = raw.replace("sqlite:///", "")
            else:
                db_path = "./shadowbuilder.db"
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    competitor_url TEXT NOT NULL,
                    demo_target TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    scout_json TEXT,
                    strategist_json TEXT,
                    engineer_json TEXT,
                    test_results_json TEXT,
                    patch_path TEXT,
                    patch_content TEXT,
                    repair_attempts INTEGER DEFAULT 0,
                    final_verdict TEXT DEFAULT 'UNKNOWN',
                    error_summary TEXT
                )
            """)
            conn.commit()

    def create_run(self, run_id: str, competitor_url: str, demo_target: str) -> RunResult:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO runs (run_id, competitor_url, demo_target, status, created_at, updated_at, test_results_json, repair_attempts, final_verdict)
                VALUES (?, ?, ?, 'queued', ?, ?, '[]', 0, 'QUEUED')
                """,
                (run_id, competitor_url, demo_target, now, now),
            )
            conn.commit()

        return RunResult(
            run_id=run_id,
            competitor_url=competitor_url,
            demo_target=demo_target,
            status="queued",
            created_at=now,
            updated_at=now,
            test_results=[],
            repair_attempts=0,
            final_verdict="QUEUED",
        )

    def update_run(
        self,
        run_id: str,
        status: Optional[str] = None,
        scout: Optional[ScoutOutput] = None,
        strategist: Optional[StrategistOutput] = None,
        engineer: Optional[EngineerOutput] = None,
        test_results: Optional[List[TestAttemptResult]] = None,
        patch_path: Optional[str] = None,
        patch_content: Optional[str] = None,
        repair_attempts: Optional[int] = None,
        final_verdict: Optional[str] = None,
        error_summary: Optional[str] = None,
    ):
        now = datetime.now(timezone.utc).isoformat()
        fields = ["updated_at = ?"]
        values: List[Any] = [now]

        if status is not None:
            fields.append("status = ?")
            values.append(status)
        if scout is not None:
            fields.append("scout_json = ?")
            values.append(scout.model_dump_json())
        if strategist is not None:
            fields.append("strategist_json = ?")
            values.append(strategist.model_dump_json())
        if engineer is not None:
            fields.append("engineer_json = ?")
            values.append(engineer.model_dump_json())
        if test_results is not None:
            fields.append("test_results_json = ?")
            values.append(json.dumps([tr.model_dump() for tr in test_results]))
        if patch_path is not None:
            fields.append("patch_path = ?")
            values.append(patch_path)
        if patch_content is not None:
            fields.append("patch_content = ?")
            values.append(patch_content)
        if repair_attempts is not None:
            fields.append("repair_attempts = ?")
            values.append(repair_attempts)
        if final_verdict is not None:
            fields.append("final_verdict = ?")
            values.append(final_verdict)
        if error_summary is not None:
            fields.append("error_summary = ?")
            values.append(error_summary)

        values.append(run_id)
        query = f"UPDATE runs SET {', '.join(fields)} WHERE run_id = ?"

        with self._get_connection() as conn:
            conn.execute(query, values)
            conn.commit()

    def get_run(self, run_id: str) -> Optional[RunResult]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_model(row)

    def list_runs(self, limit: int = 20) -> List[RunResult]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM runs ORDER BY created_at DESC LIMIT ?", (limit,))
            return [self._row_to_model(r) for r in cursor.fetchall()]

    def _row_to_model(self, row: sqlite3.Row) -> RunResult:
        scout_obj = ScoutOutput.model_validate_json(row["scout_json"]) if row["scout_json"] else None
        strat_obj = StrategistOutput.model_validate_json(row["strategist_json"]) if row["strategist_json"] else None
        eng_obj = EngineerOutput.model_validate_json(row["engineer_json"]) if row["engineer_json"] else None
        tests_list = []
        if row["test_results_json"]:
            try:
                raw_tests = json.loads(row["test_results_json"])
                tests_list = [TestAttemptResult.model_validate(t) for t in raw_tests]
            except Exception:
                pass

        return RunResult(
            run_id=row["run_id"],
            competitor_url=row["competitor_url"],
            demo_target=row["demo_target"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            scout=scout_obj,
            strategist=strat_obj,
            engineer=eng_obj,
            test_results=tests_list,
            patch_artifact_path=row["patch_path"],
            patch_content=row["patch_content"],
            repair_attempts=row["repair_attempts"] or 0,
            final_verdict=row["final_verdict"] or "UNKNOWN",
            error_summary=row["error_summary"],
        )


db_storage = RunStorage()
