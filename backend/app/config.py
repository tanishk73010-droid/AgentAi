from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    llm_provider: str = Field(default="gemini")
    llm_api_key: Optional[str] = Field(default=None)
    llm_model: str = Field(default="gemini-2.5-flash")
    frontend_origin: str = Field(default="http://localhost:3000")
    backend_host: str = Field(default="127.0.0.1")
    backend_port: int = Field(default=8000)
    database_url: str = Field(default="sqlite:///./shadowbuilder.db")
    artifacts_dir: str = Field(default="./artifacts")
    firecrawl_api_key: Optional[str] = Field(default=None)
    sandbox_mode: str = Field(default="template")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    def safe_summary(self) -> dict:
        """Returns safe configuration status without exposing API keys or secrets."""
        has_llm_key = bool(self.llm_api_key and self.llm_api_key.strip())
        return {
            "llm_provider": self.llm_provider,
            "llm_model": self.llm_model,
            "has_llm_api_key": has_llm_key,
            "fixture_mode": not has_llm_key or self.llm_provider == "fixture",
            "has_firecrawl_key": bool(self.firecrawl_api_key and self.firecrawl_api_key.strip()),
            "sandbox_mode": self.sandbox_mode,
            "frontend_origin": self.frontend_origin,
        }


settings = Settings()
