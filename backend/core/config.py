from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # ---------------------------------------------------------
    # LLM providers
    # ---------------------------------------------------------

    openrouter_api_key: str

    default_model_fast: str = "deepseek/deepseek-v4-flash-0731"
    default_model_reasoning: str = "openai/gpt-5.6-luna"

    groq_api_key: str = ""
    gemini_api_key: str = ""
    hf_api_key: str = ""

    # ---------------------------------------------------------
    # Telegram
    # Optional for web deployment
    # ---------------------------------------------------------
    telegram_bot_token: str

    # --- Database (Phase 2) ---
    database_url: str = "sqlite:///./fibrion_dev.db"

    # --- Auth ---
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

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