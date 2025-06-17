"""Test main application."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from src.main import create_app


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("src.main.get_settings") as mock:
        settings = mock.return_value
        settings.app_name = "Test App"
        settings.app_version = "1.0.0"
        settings.api_prefix = "/api/v1"
        settings.is_development = True
        settings.cors_origins = ["*"]
        settings.cors_credentials = True
        settings.cors_methods = ["*"]
        settings.cors_headers = ["*"]
        settings.enable_metrics = False
        yield settings


@pytest.fixture
def mock_database():
    """Mock database initialization."""
    with patch("src.main.initialize_database", new_callable=AsyncMock), \
         patch("src.main.shutdown_database", new_callable=AsyncMock), \
         patch("src.config.database.check_database_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {"status": "healthy", "message": "Test database OK"}
        yield


@pytest.fixture
def mock_redis():
    """Mock Redis initialization."""
    with patch("src.main.initialize_redis", new_callable=AsyncMock), \
         patch("src.main.shutdown_redis", new_callable=AsyncMock), \
         patch("src.config.redis.check_redis_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {"status": "healthy", "message": "Test Redis OK"}
        yield


@pytest.fixture
def client(mock_settings, mock_database, mock_redis):
    """Test client."""
    app = create_app()
    return TestClient(app)


def test_health_endpoint(client):
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "components" in data
    assert "database" in data["components"]
    assert "redis" in data["components"]


def test_api_docs(client):
    """Test API documentation is available."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_api_health_endpoint(client):
    """Test API health endpoint."""
    response = client.get("/api/v1/health/")
    assert response.status_code == 200


def test_nonexistent_endpoint(client):
    """Test 404 for nonexistent endpoint."""
    response = client.get("/nonexistent")
    assert response.status_code == 404