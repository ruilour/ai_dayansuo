from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    email: str | None = Field(None, max_length=255)
    turnstile_token: str


class UserLogin(BaseModel):
    username: str
    password: str
    turnstile_token: str = ""
    skip_turnstile: bool = False


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    avatar: str | None
    role: str = "user"

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse
