from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SQLITE_URL = "sqlite:///./fibrion_dev.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- LLM API ---
    openrouter_api_key: str
    # default_model_fast: str = "anthropic/claude-haiku-4-5"
    default_model_fast: str = "deepseek/deepseek-v4-flash-0731"
    default_model_reasoning: str = "openai/gpt-5.6-luna"
    groq_api_key: str = ""
    gemini_api_key: str = ""
    hf_api_key: str = ""
    

    # --- Telegram ---
    telegram_bot_token: str

    # --- Database (Phase 2) ---
    database_url: str = _DEFAULT_SQLITE_URL

    # --- Auth ---
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    @field_validator("database_url", mode="before")
    @classmethod
    def _fall_back_to_sqlite_if_blank(cls, value: str | None) -> str:
        # A present-but-empty DATABASE_URL= line in .env is a real
        # string (""), not "unset" - pydantic-settings uses it as-is
        # rather than falling back to the class default above. An
        # empty string isn't a valid SQLAlchemy URL, so without this,
        # create_engine() throws "Could not parse SQLAlchemy URL"
        # instead of just using SQLite like the default promises.
        if not value or not value.strip():
            return _DEFAULT_SQLITE_URL
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def _reject_blank_secret(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError(
                "JWT_SECRET_KEY is set but blank. Generate one with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return value
    # ---------------------------------------------------------
    # Email
    # ---------------------------------------------------------

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587

    email_address: str = ""
    email_app_password: str = ""

    # ---------------------------------------------------------
    # Application
    # ---------------------------------------------------------

    fibrion_env: str = "development"
    log_level: str = "INFO"

    # ---------------------------------------------------------
    # Verification
    # ---------------------------------------------------------

    verification_max_retries: int = 1

    # ---------------------------------------------------------
    # LangSmith
    # ---------------------------------------------------------

    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "fibrion"


settings = Settings()


# -------------------------------------------------------------
# Optional LangSmith configuration
# -------------------------------------------------------------

if settings.langsmith_tracing:
    import os

    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project