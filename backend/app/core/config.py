from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DB_CONNECTION: str
    DB_HOST: str
    DB_PORT: int
    DB_DATABASE: str
    DB_USERNAME: str
    DB_PASSWORD: str

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings() 