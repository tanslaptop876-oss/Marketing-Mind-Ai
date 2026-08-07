from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_strategy() -> None:
    response = client.post(
        "/api/v1/strategy",
        json={
            "name": "Example Brand",
            "industry": "retail",
            "audience": "value-conscious customers",
            "goal": "increase qualified leads",
            "channels": ["website", "instagram"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == "Example Brand"
    assert len(data["content_pillars"]) >= 3
