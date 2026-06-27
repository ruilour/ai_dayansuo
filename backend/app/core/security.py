from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != expected_type:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 类型无效")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 无效或已过期")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_token(credentials.credentials, "access")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 无效")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

    # 封禁检查
    if user.status == "banned":
        if user.banned_until and user.banned_until > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"账号已被封禁，原因：{user.status_reason or '无'}，到期时间：{user.banned_until.isoformat()}"
            )
        elif user.banned_until and user.banned_until <= datetime.now(timezone.utc):
            # 封禁已到期，自动恢复
            user.status = "active"
            user.banned_until = None
            user.status_reason = None
            db.commit()
        else:
            # banned_until 为 null 表示永久封禁
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"账号已被永久封禁，原因：{user.status_reason or '无'}"
            )

    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
) -> User | None:
    """可选的用户认证，未登录时返回 None"""
    if credentials is None:
        return None
    try:
        payload = verify_token(credentials.credentials, "access")
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            return None

        # 封禁检查（与 get_current_user 逻辑一致）
        if user.status == "banned":
            if user.banned_until and user.banned_until > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"账号已被封禁，原因：{user.status_reason or '无'}，到期时间：{user.banned_until.isoformat()}"
                )
            elif user.banned_until and user.banned_until <= datetime.now(timezone.utc):
                # 封禁已到期，自动恢复
                user.status = "active"
                user.banned_until = None
                user.status_reason = None
                db.commit()
            else:
                # banned_until 为 null 表示永久封禁
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"账号已被永久封禁，原因：{user.status_reason or '无'}"
                )

        return user
    except HTTPException:
        return None


def check_not_muted(user: User):
    """检查用户是否被禁言，被禁言则抛出 403"""
    if user.status == "muted":
        now = datetime.now(timezone.utc)
        if user.muted_until and user.muted_until > now:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"账号已被禁言，原因：{user.status_reason or '无'}，到期时间：{user.muted_until.isoformat()}"
            )
        elif user.muted_until and user.muted_until <= now:
            user.status = "active"
            user.muted_until = None
            user.status_reason = None
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"账号已被永久禁言，原因：{user.status_reason or '无'}"
            )
