import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_password_hash,
    verify_password,
)
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenRefresh,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["认证"])


async def verify_turnstile(token: str) -> bool:
    """验证 Cloudflare Turnstile token"""
    if not settings.TURNSTILE_SECRET_KEY:
        return True  # 开发模式跳过验证
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.TURNSTILE_SECRET_KEY, "response": token},
        )
        result = resp.json()
        return result.get("success", False)


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")
async def register(request: Request, body: UserRegister, db: Session = Depends(get_db)):
    # 验证 Turnstile
    if not await verify_turnstile(body.turnstile_token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码验证失败")

    # 检查用户名是否已存在
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已被注册")

    # 创建用户
    user = User(
        username=body.username,
        password_hash=get_password_hash(body.password),
        email=body.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 生成 token
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(id=user.id, username=user.username, avatar=user.avatar, role=user.role),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/15minute")
async def login(request: Request, body: UserLogin, db: Session = Depends(get_db)):
    # 验证 Turnstile（仅当 skip_turnstile 为 False 时）
    if not body.skip_turnstile:
        if not await verify_turnstile(body.turnstile_token):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码验证失败")

    # 查找用户
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    # 生成 token
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(id=user.id, username=user.username, avatar=user.avatar, role=user.role),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(request: Request, body: TokenRefresh, db: Session = Depends(get_db)):
    payload = verify_token(body.refresh_token, "refresh")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 无效")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(id=user.id, username=user.username, avatar=user.avatar, role=user.role),
    )
