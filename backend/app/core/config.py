from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Ask My Campus"
    APP_ENV: str = "development"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DATABASE_URL: str = "sqlite:///./ask_my_campus.db"
    FRONTEND_URL: str = "http://127.0.0.1:5500"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()