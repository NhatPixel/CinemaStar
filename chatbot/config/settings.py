from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_CHATBOT_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _CHATBOT_ROOT / ".env"


class ChatbotSettings(BaseSettings):
    """Chatbot service configuration."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    AZURE_OPENAI_ENDPOINT: str = Field(default="", alias="AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_API_KEY: str = Field(default="", alias="AZURE_OPENAI_API_KEY")
    AZURE_OPENAI_DEPLOYMENT: str = Field(default="gpt-5.4-mini", alias="AZURE_OPENAI_DEPLOYMENT")

    CALL_API_LLM_TEMPERATURE: float = Field(default=0.2, alias="CALL_API_LLM_TEMPERATURE")
    CALL_API_LLM_MAX_TOKENS: int = Field(default=800, alias="CALL_API_LLM_MAX_TOKENS")
    SELECT_API_LLM_TEMPERATURE: float = Field(default=0.1, alias="SELECT_API_LLM_TEMPERATURE")
    SELECT_API_LLM_MAX_TOKENS: int = Field(default=400, alias="SELECT_API_LLM_MAX_TOKENS")
    ANSWER_LLM_TEMPERATURE: float = Field(default=0.3, alias="ANSWER_LLM_TEMPERATURE")
    ANSWER_LLM_MAX_TOKENS: int = Field(default=1500, alias="ANSWER_LLM_MAX_TOKENS")

    CINEMA_API_BASE_URL: str = Field(
        default="https://cinema-api.duckdns.org/api",
        alias="CINEMA_API_BASE_URL",
    )
    CINEMA_API_TIMEOUT: float = Field(default=30.0, alias="CINEMA_API_TIMEOUT")


settings = ChatbotSettings()
