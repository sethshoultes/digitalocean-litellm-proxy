"""Application settings and configuration."""

import secrets
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, PostgresDsn, RedisDsn, field_validator, ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application settings
    app_name: str = "LiteLLM Connection Manager"
    app_version: str = "1.0.0"
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # API settings
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8001, env="API_PORT")
    api_prefix: str = Field(default="/api/v1", env="API_PREFIX")
    
    # Security settings
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), env="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    
    # CORS settings
    cors_origins: List[str] = Field(default=["*"], env="CORS_ORIGINS")
    cors_credentials: bool = Field(default=True, env="CORS_CREDENTIALS")
    cors_methods: List[str] = Field(default=["*"], env="CORS_METHODS")
    cors_headers: List[str] = Field(default=["*"], env="CORS_HEADERS")
    
    # Database settings
    database_url: PostgresDsn = Field(..., env="DATABASE_URL")
    database_pool_size: int = Field(default=20, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=30, env="DATABASE_MAX_OVERFLOW")
    database_pool_timeout: int = Field(default=30, env="DATABASE_POOL_TIMEOUT")
    database_pool_recycle: int = Field(default=3600, env="DATABASE_POOL_RECYCLE")
    database_echo: bool = Field(default=False, env="DATABASE_ECHO")
    
    # Redis settings
    redis_url: RedisDsn = Field(..., env="REDIS_URL")
    redis_max_connections: int = Field(default=20, env="REDIS_MAX_CONNECTIONS")
    redis_socket_timeout: int = Field(default=5, env="REDIS_SOCKET_TIMEOUT")
    redis_socket_connect_timeout: int = Field(default=5, env="REDIS_SOCKET_CONNECT_TIMEOUT")
    redis_retry_on_timeout: bool = Field(default=True, env="REDIS_RETRY_ON_TIMEOUT")
    
    # Cache settings
    cache_ttl_seconds: int = Field(default=300, env="CACHE_TTL_SECONDS")
    cache_prefix: str = Field(default="litellm_cm:", env="CACHE_PREFIX")
    
    # Rate limiting
    rate_limit_enabled: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")
    
    # Monitoring and logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=9090, env="METRICS_PORT")
    
    # LiteLLM integration
    litellm_master_key: Optional[str] = Field(default=None, env="LITELLM_MASTER_KEY")
    litellm_config_path: str = Field(default="litellm-config.yaml", env="LITELLM_CONFIG_PATH")
    litellm_proxy_url: Optional[str] = Field(default=None, env="LITELLM_PROXY_URL")
    
    # External API keys (for testing and validation)
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    
    # Activity tracking
    enable_activity_tracking: bool = Field(default=True, env="ENABLE_ACTIVITY_TRACKING")
    activity_batch_size: int = Field(default=100, env="ACTIVITY_BATCH_SIZE")
    activity_flush_interval: int = Field(default=10, env="ACTIVITY_FLUSH_INTERVAL")
    
    # Cleanup and maintenance
    cleanup_old_activities_days: int = Field(default=90, env="CLEANUP_OLD_ACTIVITIES_DAYS")
    summary_generation_enabled: bool = Field(default=True, env="SUMMARY_GENERATION_ENABLED")
    
    @field_validator("cors_origins", mode="before")
    def parse_cors_origins(cls, value):
        """Parse CORS origins from string or list."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",")]
        return value
    
    @field_validator("cors_methods", mode="before")
    def parse_cors_methods(cls, value):
        """Parse CORS methods from string or list."""
        if isinstance(value, str):
            return [method.strip() for method in value.split(",")]
        return value
    
    @field_validator("cors_headers", mode="before")
    def parse_cors_headers(cls, value):
        """Parse CORS headers from string or list."""
        if isinstance(value, str):
            return [header.strip() for header in value.split(",")]
        return value
    
    @field_validator("log_level")
    def validate_log_level(cls, value):
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if value.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of: {valid_levels}")
        return value.upper()
    
    @field_validator("log_format")
    def validate_log_format(cls, value):
        """Validate log format."""
        valid_formats = ["json", "text"]
        if value.lower() not in valid_formats:
            raise ValueError(f"Log format must be one of: {valid_formats}")
        return value.lower()
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() in ["development", "dev", "local"]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() in ["production", "prod"]
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing mode."""
        return self.environment.lower() in ["testing", "test"]
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()