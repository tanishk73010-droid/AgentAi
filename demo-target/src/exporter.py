import json
from typing import Dict, Any


def export_as_json(data: Dict[str, Any]) -> str:
    """Baseline JSON export stub. Enhanced by Engineer agent patches."""
    if not isinstance(data, dict):
        raise ValueError("Data to export must be a dictionary.")
    return json.dumps(data, indent=2)
