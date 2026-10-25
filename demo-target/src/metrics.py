from typing import List, Dict, Any


def calculate_summary(values: List[float]) -> Dict[str, Any]:
    """Calculates basic summary metrics from numeric values."""
    if not values:
        return {"count": 0, "total": 0.0, "average": 0.0, "min": 0.0, "max": 0.0}

    total = sum(values)
    count = len(values)
    return {
        "count": count,
        "total": round(total, 2),
        "average": round(total / count, 2),
        "min": min(values),
        "max": max(values),
    }


def detect_threshold_anomalies(values: List[float], threshold: float) -> List[float]:
    """Returns all values that strictly exceed the defined threshold."""
    return [v for v in values if v > threshold]
