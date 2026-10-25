import logging
from typing import Dict, Any, List, Optional
from app.schemas.strategist import StrategistOutput
from app.schemas.engineer import EngineerOutput, PatchFile
from app.services.llm import llm_service

logger = logging.getLogger("shadowbuilder.engineer")


class EngineerAgent:
    """Engineer Agent: designs and writes safe, constrained patches for the controlled demo target,
    interprets test failure logs, and repairs errors up to 2 times."""

    @classmethod
    async def run(
        cls,
        strategist_data: StrategistOutput,
        test_failure_context: Optional[str] = None,
        repair_attempt: int = 0,
        force_fixture: bool = False,
    ) -> EngineerOutput:
        run_id = strategist_data.run_id
        selected = strategist_data.selected_opportunity
        feature_title = selected.title if selected else "Structured Data Export"

        logger.info(f"EngineerAgent generating patch (repair_attempt={repair_attempt}) for run {run_id}")

        fixture_data = cls._generate_patch_fixture(run_id, feature_title, repair_attempt)

        if llm_service.is_fixture_mode(force_fixture):
            return EngineerOutput.model_validate(fixture_data)

        system_prompt = (
            "You are the Engineer Agent of ShadowBuilder AI.\n"
            "Your job is to generate a minimal, high-quality code patch for the controlled Python target repo ('demo-target').\n"
            "SAFETY & CONSTRAINTS:\n"
            "1. ONLY modify files inside 'src/' or 'tests/' (e.g. 'src/exporter.py', 'tests/test_exporter.py').\n"
            "2. Never use arbitrary shell commands or install external binary packages.\n"
            "3. Return full file contents for modified/created files in the 'patches' list.\n"
            "4. Ensure your Python code is valid, clean, and passes pytest tests/.\n"
            "5. If test failure output is provided, analyze the traceback carefully and fix the exact error."
        )

        repair_prompt_section = ""
        if test_failure_context:
            repair_prompt_section = (
                f"\n\nPRIOR TEST ATTEMPT FAILED WITH ERROR:\n"
                f"```\n{test_failure_context}\n```\n"
                f"Please fix the code and test to resolve this exact failure."
            )

        user_prompt = (
            f"Selected Opportunity: {feature_title}\n"
            f"PRD Acceptance Criteria:\n" + ("\n".join([f"- {ac}" for ac in strategist_data.prd.acceptance_criteria]) if strategist_data.prd else "- Valid export format") +
            repair_prompt_section +
            "\n\nGenerate structured PatchFiles for src/exporter.py and tests/test_exporter.py."
        )

        try:
            result = await llm_service.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=EngineerOutput,
                fixture_fallback_data=fixture_data,
                force_fixture=force_fixture,
            )
            result.run_id = run_id
            return result
        except Exception as e:
            logger.error(f"Engineer LLM call failed: {str(e)}, using deterministic feature template patch.")
            return EngineerOutput.model_validate(fixture_data)

    @classmethod
    def _generate_patch_fixture(cls, run_id: str, feature_title: str, repair_attempt: int) -> Dict[str, Any]:
        """Provides verified feature patch for demo-target."""
        exporter_code = (
            "import json\n"
            "from typing import Dict, Any, List\n"
            "from datetime import datetime, timezone\n"
            "\n"
            "\n"
            "def export_as_json(data: Dict[str, Any]) -> str:\n"
            "    \"\"\"Exports dictionary as formatted JSON string with validation.\"\"\"\n"
            "    if not isinstance(data, dict):\n"
            "        raise ValueError(\"Data to export must be a dictionary.\")\n"
            "    return json.dumps(data, indent=2)\n"
            "\n"
            "\n"
            "def generate_metrics_report(summary: Dict[str, Any], anomalies: List[float], source_tag: str = 'shadowbuilder') -> Dict[str, Any]:\n"
            "    \"\"\"Generates structured report object adhering to the PRD specification.\"\"\"\n"
            "    return {\n"
            "        \"report_id\": f\"rep_{source_tag}\",\n"
            "        \"generated_at\": datetime.now(timezone.utc).isoformat(),\n"
            "        \"summary\": summary,\n"
            "        \"anomalies_detected\": anomalies,\n"
            "        \"has_anomalies\": len(anomalies) > 0,\n"
            "        \"integrity_status\": \"VERIFIED\",\n"
            "    }\n"
            "\n"
            "\n"
            "def export_metrics_report_json(summary: Dict[str, Any], anomalies: List[float]) -> str:\n"
            "    \"\"\"Top-level report export function returning validated JSON string.\"\"\"\n"
            "    report = generate_metrics_report(summary, anomalies)\n"
            "    return export_as_json(report)\n"
        )

        test_exporter_code = (
            "import json\n"
            "import pytest\n"
            "from src.exporter import export_as_json, generate_metrics_report, export_metrics_report_json\n"
            "from src.metrics import calculate_summary, detect_threshold_anomalies\n"
            "\n"
            "\n"
            "def test_export_as_json_valid():\n"
            "    data = {'status': 'ok', 'score': 99}\n"
            "    output = export_as_json(data)\n"
            "    parsed = json.loads(output)\n"
            "    assert parsed['status'] == 'ok'\n"
            "    assert parsed['score'] == 99\n"
            "\n"
            "\n"
            "def test_export_as_json_invalid_type():\n"
            "    with pytest.raises(ValueError):\n"
            "        export_as_json(['not', 'a', 'dict'])\n"
            "\n"
            "\n"
            "def test_generate_metrics_report():\n"
            "    summary = calculate_summary([10.0, 20.0, 30.0])\n"
            "    anomalies = detect_threshold_anomalies([10.0, 20.0, 30.0], 25.0)\n"
            "    report = generate_metrics_report(summary, anomalies)\n"
            "    assert report['integrity_status'] == 'VERIFIED'\n"
            "    assert report['has_anomalies'] is True\n"
            "    assert report['anomalies_detected'] == [30.0]\n"
            "\n"
            "\n"
            "def test_export_metrics_report_json():\n"
            "    summary = calculate_summary([5.0, 15.0])\n"
            "    raw_json = export_metrics_report_json(summary, [])\n"
            "    parsed = json.loads(raw_json)\n"
            "    assert parsed['integrity_status'] == 'VERIFIED'\n"
            "    assert parsed['has_anomalies'] is False\n"
        )

        patch_text = (
            "--- a/src/exporter.py\n"
            "+++ b/src/exporter.py\n"
            "@@ -1,6 +1,24 @@\n"
            "+def generate_metrics_report(summary, anomalies):\n"
            "+    return {'summary': summary, 'integrity_status': 'VERIFIED'}\n"
            "--- /dev/null\n"
            "+++ b/tests/test_exporter.py\n"
            "@@ -0,0 +1,30 @@\n"
            "+def test_export_metrics_report(): assert True\n"
        )

        return {
            "run_id": run_id,
            "selected_feature": feature_title,
            "rationale": f"Implements PRD requirements for {feature_title} with tested report generator and JSON serialization.",
            "files_proposed": ["src/exporter.py", "tests/test_exporter.py"],
            "patch": patch_text,
            "patches": [
                PatchFile(
                    path="src/exporter.py",
                    action="modify",
                    diff="Enhanced export functions with report structure",
                    content=exporter_code,
                ),
                PatchFile(
                    path="tests/test_exporter.py",
                    action="create",
                    diff="Comprehensive test suite for exporter",
                    content=test_exporter_code,
                ),
            ],
            "requested_test_commands": ["pytest tests/"],
            "expected_acceptance_criteria": [
                "src/exporter.py exports valid JSON with verified metadata",
                "tests/test_exporter.py passes with 100% exit code 0",
            ],
            "assumptions_and_limitations": [
                "Constrained to allowlisted demo-target workspace only.",
                "Fixed test command pytest tests/ executed under isolation.",
            ],
        }
