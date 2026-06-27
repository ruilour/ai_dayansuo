from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/ai_dayansuo?charset=utf8mb4"
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/chat/completions"
    DEEPSEEK_EMBEDDING_BASE_URL: str = "https://api.siliconflow.cn/v1/embeddings"
    DEEPSEEK_EMBEDDING_MODEL: str = "BAAI/bge-large-zh-v1.5"
    DEEPSEEK_EMBEDDING_API_KEY: str = ""  # 默认复用 DEEPSEEK_API_KEY，可单独指定
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
