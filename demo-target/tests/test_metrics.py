import pytest
from src.metrics import calculate_summary, detect_threshold_anomalies


def test_calculate_summary_empty():
    res = calculate_summary([])
    assert res["count"] == 0
    assert res["total"] == 0.0


def test_calculate_summary_values():
    res = calculate_summary([10.0, 20.0, 30.0])
    assert res["count"] == 3
    assert res["total"] == 60.0
    assert res["average"] == 20.0
    assert res["min"] == 10.0
    assert res["max"] == 30.0


def test_detect_threshold_anomalies():
    vals = [5.0, 15.0, 25.0, 8.0]
    anomalies = detect_threshold_anomalies(vals, 10.0)
    assert anomalies == [15.0, 25.0]
