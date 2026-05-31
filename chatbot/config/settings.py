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
    CHATBOT_MAX_ITERATIONS: int = Field(default=5, alias="CHATBOT_MAX_ITERATIONS")

    CALL_API_LLM_TEMPERATURE: float = Field(default=0.2, alias="CALL_API_LLM_TEMPERATURE")
    CALL_API_LLM_MAX_TOKENS: int = Field(default=800, alias="CALL_API_LLM_MAX_TOKENS")
    ANSWER_LLM_TEMPERATURE: float = Field(default=0.3, alias="ANSWER_LLM_TEMPERATURE")
    ANSWER_LLM_MAX_TOKENS: int = Field(default=1500, alias="ANSWER_LLM_MAX_TOKENS")


settings = ChatbotSettings()
