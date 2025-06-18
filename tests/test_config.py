"""Test configuration."""

import pytest
from pydantic import ValidationError

from src.config.settings import Settings


def test_settings_default_values():
    """Test settings with default values."""
    # Clear required environment variables
    import os

    old_db = os.environ.pop("DATABASE_URL", None)
    old_redis = os.environ.pop("REDIS_URL", None)

    try:
        # This will fail without required environment variables
        # Disable .env file loading for this test
        with pytest.raises(ValidationError):
            Settings(_env_file=None)
    finally:
        # Restore environment variables
        if old_db:
            os.environ["DATABASE_URL"] = old_db
        if old_redis:
            os.environ["REDIS_URL"] = old_redis


def test_settings_with_required_values():
    """Test settings with required environment variables."""
    settings = Settings(
        database_url="postgresql+asyncpg://user:pass@localhost/test",
        redis_url="redis://localhost:6379",
    )

    assert settings.app_name == "LiteLLM Connection Manager"
    assert settings.environment == "development"
    assert settings.api_port == 8001
    assert settings.is_development is True
    assert settings.is_production is False


def test_settings_environment_detection():
    """Test environment detection."""
    # Development
    settings = Settings(
        database_url="postgresql+asyncpg://user:pass@localhost/test",
        redis_url="redis://localhost:6379",
        environment="development",
    )
    assert settings.is_development is True
    assert settings.is_production is False
    assert settings.is_testing is False

    # Production
    settings = Settings(
        database_url="postgresql+asyncpg://user:pass@localhost/test",
        redis_url="redis://localhost:6379",
        environment="production",
    )
    assert settings.is_development is False
    assert settings.is_production is True
    assert settings.is_testing is False

    # Testing
    settings = Settings(
        database_url="postgresql+asyncpg://user:pass@localhost/test",
        redis_url="redis://localhost:6379",
        environment="testing",
    )
    assert settings.is_development is False
    assert settings.is_production is False
    assert settings.is_testing is True


def test_cors_settings_parsing():
    """Test CORS settings parsing."""
    settings = Settings(
        database_url="postgresql+asyncpg://user:pass@localhost/test",
        redis_url="redis://localhost:6379",
        cors_origins="http://localhost:3000,https://app.example.com",
        cors_methods="GET,POST,PUT,DELETE",
        cors_headers="Content-Type,Authorization",
    )

    assert settings.cors_origins == ["http://localhost:3000", "https://app.example.com"]
    assert settings.cors_methods == ["GET", "POST", "PUT", "DELETE"]
    assert settings.cors_headers == ["Content-Type", "Authorization"]
