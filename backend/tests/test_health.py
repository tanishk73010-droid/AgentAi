from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ShadowBuilder AI"
    assert "config" in data
    # Ensure secrets are never exposed
    assert "llm_api_key" not in data["config"]
    assert "firecrawl_api_key" not in data["config"]
    assert "has_llm_api_key" in data["config"]
    assert "sandbox_mode" in data["config"]
