# AI答研所 Phase 1 实施计划 — 用户系统 + 对话 + 三按钮交互

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**目标**：搭建项目基础骨架，完成用户注册/登录、对话 CRUD、流式 AI 对话、三按钮交互、动态 Placeholder。

**架构**：FastAPI 后端 + MySQL + SQLAlchemy ORM + JWT 认证；React + Vite + Tailwind + Zustand 前端，前后端分离。

**技术栈**：FastAPI 0.115.6, Python 3.11+, React 18, Vite 5, Tailwind CSS 3, Zustand 4, MySQL 8, DeepSeek API

## 全局约束

- 所有 API 路径以 `/api` 开头
- API Key 存储在 `.env` 文件中，`.gitignore` 排除
- JWT access_token 有效期 24 小时，refresh_token 有效期 7 天
- 密码使用 bcrypt 加密
- 验证码使用 Cloudflare Turnstile
- 前端使用 react-markdown + rehype-sanitize 渲染 Markdown（预装依赖）
- 所有代码注释、变量命名使用英文，但面向用户的文案使用简体中文
- 数据库名：`ai_dayansuo`，字符集：`utf8mb4`
- DeepSeek 模型：`deepseek-v4-flash`，API 端点：`https://api.deepseek.cn/chat/completions`

---

## 文件结构

```
backend/
├── app/
│   ├── __init__.py          # 空文件
│   ├── main.py              # FastAPI 应用入口
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # 配置管理（读取 .env）
│   │   ├── database.py      # 数据库引擎 + SessionLocal
│   │   ├── security.py      # JWT 创建/验证 + bcrypt
│   │   └── limiter.py       # 限流配置
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── conversation.py
│   │   ├── message.py
│   │   ├── post.py
│   │   └── comment.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── conversation.py
│   │   ├── post.py
│   │   └── comment.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── conversations.py
│   │   ├── posts.py
│   │   ├── comments.py
│   │   └── search.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py
│   │   └── conversation_service.py
│   └── utils/
│       ├── __init__.py
│       └── logger.py
├── requirements.txt
├── .env
└── run.py

frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Home.jsx
│   │   ├── Chat.jsx
│   │   └── PostDetail.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── PostCard.jsx
│   │   ├── CommentList.jsx
│   │   ├── ShareModal.jsx
│   │   ├── ActionButtons.jsx
│   │   └── ConversationSidebar.jsx
│   ├── api/
│   │   └── index.js
│   ├── store/
│   │   └── useStore.js
│   └── hooks/
│       └── useAuth.js
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js

.gitignore
```

---

### Task 1: 后端项目骨架 + 数据库初始化

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env`
- Create: `backend/run.py`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/logger.py`
- Create: `.gitignore`

**Interfaces:**
- Produces: `config.py` → 导出 `Settings` 类（DATABASE_URL, SECRET_KEY, DEEPSEEK_API_KEY 等）
- Produces: `database.py` → 导出 `engine`, `SessionLocal`, `Base`, `get_db()`
- Produces: `main.py` → FastAPI 应用实例，挂载 CORS 中间件

- [ ] **Step 1: 创建 `requirements.txt`**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
sqlalchemy==2.0.36
pymysql==1.1.1
python-dotenv==1.0.0
httpx==0.28.1
slowapi==0.1.9
```

- [ ] **Step 2: 创建 `backend/.env`**

```
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/ai_dayansuo?charset=utf8mb4
SECRET_KEY=your-secret-key-change-in-production-abc123
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
DEEPSEEK_MODEL=deepseek-v4-flash
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

- [ ] **Step 3: 创建 `.gitignore`**

```
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/
.env

# Node
node_modules/
dist/
.vite/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Uploads
uploads/*
!uploads/.gitkeep

# Django
*.log
```

- [ ] **Step 4: 创建 `backend/app/__init__.py`**

```python
# 空文件
```

- [ ] **Step 5: 创建 `backend/app/core/__init__.py`**

```python
# 空文件
```

- [ ] **Step 6: 创建 `backend/app/utils/__init__.py`**

```python
# 空文件
```

- [ ] **Step 7: 创建 `backend/app/utils/logger.py`**

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ai_dayansuo")
```

- [ ] **Step 8: 创建 `backend/app/core/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/ai_dayansuo?charset=utf8mb4"
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.cn/chat/completions"
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 9: 创建 `backend/app/core/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 10: 创建 `backend/app/main.py`**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI答研所 API server...")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="AI答研所 API",
    description="AI 回答的探讨与验证社区",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
```

- [ ] **Step 11: 创建 `backend/run.py`**

```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

- [ ] **Step 12: 验证项目可启动**

Run:
```bash
cd /f/ProgramData/CCFile/ai_dayansuo/backend
pip install -r requirements.txt
python -c "from app.core.config import settings; print('Config OK')"
python -c "from app.core.database import engine; print('DB Engine OK')"
```

Expected: 无报错。

- [ ] **Step 13: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git init
git add -A
git commit -m "feat: 后端项目骨架搭建完成"
```

---

### Task 2: 数据库 Model（全部六张表）

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/conversation.py`
- Create: `backend/app/models/message.py`
- Create: `backend/app/models/post.py`
- Create: `backend/app/models/comment.py`

**Interfaces:**
- Produces: 所有 Model 类（User, Conversation, Message, Post, Comment, PostLike）
- Produces: `models/__init__.py` 统一导出所有 Model，供 `main.py` 中的 `Base.metadata.create_all()` 使用

- [ ] **Step 1: 创建 `backend/app/models/user.py`**

```python
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    avatar = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: 创建 `backend/app/models/conversation.py`**

```python
from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="新对话")
    is_saved = Column(Boolean, default=False)
    saved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="conversations")
    messages = relationship("Message", backref="conversation", order_by="Message.created_at", cascade="all, delete-orphan")
```

- [ ] **Step 3: 创建 `backend/app/models/message.py`**

```python
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from app.core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum("user", "assistant", name="message_role"), nullable=False)
    content = Column(Text, nullable=False)
    reasoning_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: 创建 `backend/app/models/post.py`**

```python
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(String(500), nullable=False)
    full_content = Column(Text, nullable=False)
    reasoning_content = Column(Text, nullable=True)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="posts")
    conversation = relationship("Conversation", backref="post")
```

- [ ] **Step 5: 创建 `backend/app/models/comment.py`**

```python
from datetime import datetime

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="comments")
    post = relationship("Post", backref="comments")
    parent = relationship("Comment", backref="replies", remote_side=[id], cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 6: 创建 `backend/app/models/__init__.py`**

```python
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.post import Post
from app.models.comment import Comment, PostLike

__all__ = ["User", "Conversation", "Message", "Post", "Comment", "PostLike"]
```

- [ ] **Step 7: 验证 Model 定义正确**

Run:
```bash
cd /f/ProgramData/CCFile/ai_dayansuo/backend
python -c "
from app.models import User, Conversation, Message, Post, Comment, PostLike
print('All models imported OK')
print(f'User table: {User.__tablename__}')
print(f'Conversation table: {Conversation.__tablename__}')
print(f'Message table: {Message.__tablename__}')
print(f'Post table: {Post.__tablename__}')
print(f'Comment table: {Comment.__tablename__}')
print(f'PostLike table: {PostLike.__tablename__}')
"
```

Expected: 所有表名打印正常，无 ImportError。

- [ ] **Step 8: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增数据库 Model 定义（6张表）"
```

---

### Task 3: 核心安全模块（JWT + bcrypt + Turnstile 验证 + 限流）

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/app/core/limiter.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/conversation.py`

**Interfaces:**
- Produces: `security.py` → `create_access_token()`, `create_refresh_token()`, `verify_token()`, `get_password_hash()`, `verify_password()`, `get_current_user()`
- Produces: `limiter.py` → `limiter` 全局限流实例
- Produces: `schemas/auth.py` → `UserRegister`, `UserLogin`, `TokenResponse`, `UserResponse`
- Produces: `schemas/conversation.py` → `ConversationCreate`, `ConversationResponse`, `MessageResponse`
- Produces: `current_user` FastAPI 依赖注入

- [ ] **Step 1: 创建 `backend/app/core/security.py`**

```python
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
    return user
```

- [ ] **Step 2: 创建 `backend/app/core/limiter.py`**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

- [ ] **Step 3: 更新 `backend/app/main.py` 添加限流挂载**

编辑 `backend/app/main.py`，在 `app = FastAPI(...)` 之后添加：

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter

# 在 app 创建后添加
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

- [ ] **Step 4: 创建 `backend/app/schemas/__init__.py`**

```python
# 空文件
```

- [ ] **Step 5: 创建 `backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    email: str | None = Field(None, max_length=255)
    turnstile_token: str


class UserLogin(BaseModel):
    username: str
    password: str
    turnstile_token: str


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    avatar: str | None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse
```

- [ ] **Step 6: 创建 `backend/app/schemas/conversation.py`**

```python
from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = "新对话"


class MessageSend(BaseModel):
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    reasoning_content: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    title: str
    is_saved: bool
    saved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ConversationSave(BaseModel):
    pass
```

- [ ] **Step 7: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增 JWT 认证、限流和 Pydantic schema"
```

---

### Task 4: 用户注册/登录 API（含 Turnstile 验证）

**Files:**
- Create: `backend/app/routes/__init__.py`
- Create: `backend/app/routes/auth.py`

**Interfaces:**
- Produces: `routes/auth.py` → `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- Consumes: `security.py` → token 创建函数, `schemas/auth.py` → 请求/响应 schema
- Consumes: `config.py` → `settings.TURNSTILE_SECRET_KEY`

- [ ] **Step 1: 创建 `backend/app/routes/__init__.py`**

```python
# 空文件
```

- [ ] **Step 2: 创建 `backend/app/routes/auth.py`**

```python
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
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
@limiter.limit("5/minute")
async def register(request: UserRegister, db: Session = Depends(get_db)):
    # 验证 Turnstile
    if not await verify_turnstile(request.turnstile_token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码验证失败")

    # 检查用户名是否已存在
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已被注册")

    # 创建用户
    user = User(
        username=request.username,
        password_hash=get_password_hash(request.password),
        email=request.email,
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
        user=UserResponse(id=user.id, username=user.username, avatar=user.avatar),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: UserLogin, db: Session = Depends(get_db)):
    # 验证 Turnstile
    if not await verify_turnstile(request.turnstile_token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码验证失败")

    # 查找用户
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    # 生成 token
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(id=user.id, username=user.username, avatar=user.avatar),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: TokenRefresh, db: Session = Depends(get_db)):
    payload = verify_token(request.refresh_token, "refresh")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(id=user.id, username=user.username, avatar=user.avatar),
    )
```

- [ ] **Step 3: 挂载路由到 `backend/app/main.py`**

编辑 `main.py`，在 `app.add_middleware(...)` 之后添加：

```python
from app.routes.auth import router as auth_router

app.include_router(auth_router)
```

- [ ] **Step 4: 验证路由注册正确**

Run:
```bash
cd /f/ProgramData/CCFile/ai_dayansuo/backend
python -c "
from app.main import app
routes = [(r.path, r.methods) for r in app.routes]
for path, methods in routes:
    print(f'{methods} {path}')
"
```

Expected: 输出中包含 `{'POST'} /api/auth/register`, `{'POST'} /api/auth/login`, `{'POST'} /api/auth/refresh`。

- [ ] **Step 5: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增用户注册/登录/刷新 API"
```

---

### Task 5: 对话 CRUD API + SSE 流式 AI 对话

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/ai_service.py`
- Create: `backend/app/services/conversation_service.py`
- Create: `backend/app/routes/conversations.py`

**Interfaces:**
- Consumes: `schemas/conversation.py` → 请求/响应 schema
- Consumes: `security.py` → `get_current_user`
- Produces: `services/ai_service.py` → `stream_chat()` SSE 生成器
- Produces: `routes/conversations.py` → 所有对话相关路由

- [ ] **Step 1: 创建 `backend/app/services/__init__.py`**

```python
# 空文件
```

- [ ] **Step 2: 创建 `backend/app/services/ai_service.py`**

```python
import json

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.message import Message


async def stream_chat(messages: list[dict], db: Session, conversation_id: int):
    """调用 DeepSeek API 流式返回，同时保存消息到数据库"""
    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": messages,
        "stream": True,
    }

    collected_reasoning = ""
    collected_content = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", settings.DEEPSEEK_BASE_URL, json=payload, headers=headers) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                yield f"data: {json.dumps({'type': 'error', 'content': f'AI 服务错误: {response.status_code}'})}\n\n"
                return

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})

                    # 处理思考过程
                    reasoning = delta.get("reasoning_content")
                    if reasoning:
                        collected_reasoning += reasoning
                        yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning})}\n\n"

                    # 处理最终内容
                    content = delta.get("content")
                    if content:
                        collected_content += content
                        yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                except json.JSONDecodeError:
                    continue

    # 流结束，保存到数据库
    user_msg = messages[-1]
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=user_msg["content"],
    )
    db.add(user_message)

    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=collected_content,
        reasoning_content=collected_reasoning if collected_reasoning else None,
    )
    db.add(assistant_message)
    db.commit()

    yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
```

- [ ] **Step 3: 创建 `backend/app/services/conversation_service.py`**

```python
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message


def get_conversation_messages(db: Session, conversation_id: int) -> list[dict]:
    """获取对话历史消息，格式化为 DeepSeek API 所需的 messages 格式"""
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    result = []
    for msg in messages:
        result.append({"role": msg.role, "content": msg.content})
    return result
```

- [ ] **Step 4: 创建 `backend/app/routes/conversations.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    MessageSend,
    MessageResponse,
)
from app.services.conversation_service import get_conversation_messages
from app.services.ai_service import stream_chat

router = APIRouter(prefix="/api/conversations", tags=["对话"])


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的所有已保存对话"""
    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == current_user.id,
            Conversation.is_saved == True,
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    result = []
    for c in conversations:
        result.append(ConversationResponse(
            id=c.id,
            title=c.title,
            is_saved=c.is_saved,
            saved_at=c.saved_at,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
        ))
    return result


@router.post("", response_model=ConversationResponse)
def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建新对话"""
    conversation = Conversation(
        user_id=current_user.id,
        title=request.title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        is_saved=conversation.is_saved,
        saved_at=conversation.saved_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=0,
    )


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取对话消息列表（只读查看）"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问此对话")
    return conversation.messages


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    request: MessageSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """发送消息，以 SSE 流式返回 AI 回答"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问此对话")

    # 获取历史消息作为上下文
    history = get_conversation_messages(db, conversation_id)
    # 添加当前用户消息
    history.append({"role": "user", "content": request.content})

    return StreamingResponse(
        stream_chat(history, db, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{conversation_id}/save", response_model=ConversationResponse)
def save_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """保存对话（存入私有库）"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权操作此对话")
    if conversation.is_saved:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该对话已有保存记录，是否更新？")

    from datetime import datetime, timezone
    conversation.is_saved = True
    conversation.saved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conversation)

    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        is_saved=conversation.is_saved,
        saved_at=conversation.saved_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=len(conversation.messages),
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除对话"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权删除此对话")
    db.delete(conversation)
    db.commit()
```

- [ ] **Step 5: 挂载路由到 `main.py`**

编辑 `backend/app/main.py`，在 `app.include_router(auth_router)` 后添加：

```python
from app.routes.conversations import router as conversation_router

app.include_router(conversation_router)
```

- [ ] **Step 6: 验证路由注册正确**

Run:
```bash
cd /f/ProgramData/CCFile/ai_dayansuo/backend
python -c "
from app.main import app
routes = [(r.path, r.methods) for r in app.routes if 'conversations' in r.path]
for path, methods in routes:
    print(f'{methods} {path}')
"
```

Expected: 显示所有对话路由（GET/POST/DELETE）。

- [ ] **Step 7: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增对话 CRUD + SSE 流式 AI 对话"
```

---

### Task 6: 前端项目脚手架搭建

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: 初始化 `frontend/package.json`**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo/frontend
npm init -y
```

- [ ] **Step 2: 安装依赖**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo/frontend
npm install react react-dom react-router-dom zustand @tanstack/react-query axios react-markdown remark-gfm rehype-sanitize
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: 编辑 `vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: 编辑 `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5: 编辑 `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: 创建 `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI答研所 — AI 答案的检验场</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧪</text></svg>" />
  </head>
  <body class="bg-gray-50">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: 创建 `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans SC', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.prose pre {
  background-color: #1e293b;
  color: #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.prose img {
  max-width: 100%;
  border-radius: 0.375rem;
}
```

- [ ] **Step 8: 创建 `frontend/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 9: 创建 `frontend/src/App.jsx`**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'

function ProtectedRoute({ children }) {
  const token = useStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const token = useStore((s) => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}
```

- [ ] **Step 10: 验证前端可启动**

Run:
```bash
cd /f/ProgramData/CCFile/ai_dayansuo/frontend
npx vite --host 0.0.0.0 &
sleep 3
curl -s http://localhost:5173 | head -20
kill %1 2>/dev/null || true
```

Expected: 返回 HTML 内容。

- [ ] **Step 11: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 前端项目脚手架搭建完成（React+Vite+Tailwind）"
```

---

### Task 7: 前端 API 客户端 + Zustand Store + Auth Hook

**Files:**
- Create: `frontend/src/api/index.js`
- Create: `frontend/src/store/useStore.js`
- Create: `frontend/src/hooks/useAuth.js`

**Interfaces:**
- Produces: `api/index.js` → axios 实例 + 请求/响应拦截器（自动注入 token、401 自动刷新）
- Produces: `store/useStore.js` → 全局 Zustand store
- Produces: `hooks/useAuth.js` → `useAuth()` 钩子（登录/注册/登出/刷新）

- [ ] **Step 1: 创建 `frontend/src/api/index.js`**

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 请求拦截器：自动注入 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 时自动刷新 token
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)

        processQueue(null, data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
```

- [ ] **Step 2: 创建 `frontend/src/store/useStore.js`**

```javascript
import { create } from 'zustand'

const loadDraft = () => {
  try {
    const draft = localStorage.getItem('ai_dayansuo_draft')
    return draft ? JSON.parse(draft) : null
  } catch {
    return null
  }
}

const saveDraft = (state) => {
  try {
    localStorage.setItem('ai_dayansuo_draft', JSON.stringify(state))
  } catch { /* ignore */ }
}

const clearDraft = () => {
  localStorage.removeItem('ai_dayansuo_draft')
}

export const useStore = create((set, get) => {
  const draft = loadDraft()

  return {
    // === 用户 ===
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('access_token') || null,
    refreshToken: localStorage.getItem('refresh_token') || null,

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      set({ user, token: accessToken, refreshToken })
    },

    logout: () => {
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      clearDraft()
      set({ user: null, token: null, refreshToken: null, currentConversation: { id: null, messages: [], isSaved: false, roundCount: 0 } })
    },

    // === 当前对话 ===
    currentConversation: draft || { id: null, messages: [], isSaved: false, roundCount: 0 },

    setCurrentConversation: (conv) => {
      set({ currentConversation: conv })
      if (conv.messages.length > 0 && !conv.isSaved) {
        saveDraft(conv)
      } else {
        clearDraft()
      }
    },

    addMessage: (message) => {
      const conv = get().currentConversation
      const updated = { ...conv, messages: [...conv.messages, message], roundCount: message.role === 'user' ? conv.roundCount + 1 : conv.roundCount }
      set({ currentConversation: updated })
      if (!updated.isSaved) saveDraft(updated)
    },

    clearConversation: () => {
      clearDraft()
      set({ currentConversation: { id: null, messages: [], isSaved: false, roundCount: 0 } })
    },

    markConversationSaved: () => {
      const conv = get().currentConversation
      const updated = { ...conv, isSaved: true }
      set({ currentConversation: updated })
      clearDraft()
    },

    // === 已保存对话列表 ===
    savedConversations: [],
    selectedSavedId: null,

    setSavedConversations: (list) => set({ savedConversations: list }),
    setSelectedSavedId: (id) => set({ selectedSavedId: id }),

    // === 广场 ===
    posts: [],
    postsPage: 1,
    postsHasMore: true,

    setPosts: (posts) => set({ posts }),
    appendPosts: (newPosts) => set((s) => ({ posts: [...s.posts, ...newPosts] })),
    setPostsPage: (page) => set({ postsPage: page }),
    setPostsHasMore: (hasMore) => set({ postsHasMore: hasMore }),

    // === 帖子详情 ===
    currentPost: null,
    comments: [],
    setCurrentPost: (post) => set({ currentPost: post }),
    setComments: (comments) => set({ comments }),

    // === 搜索 ===
    searchKeyword: '',
    searchResults: [],
    setSearchKeyword: (kw) => set({ searchKeyword: kw }),
    setSearchResults: (results) => set({ searchResults: results }),

    // === UI 状态 ===
    isStreaming: false,
    showShareModal: false,
    streamingContent: '',
    streamingReasoning: '',
    shareConversationId: null,

    setIsStreaming: (v) => set({ isStreaming: v }),
    setShowShareModal: (v) => set({ showShareModal: v }),
    setStreamingContent: (v) => set({ streamingContent: v }),
    setStreamingReasoning: (v) => set({ streamingReasoning: v }),
    appendStreamingContent: (text) => set((s) => ({ streamingContent: s.streamingContent + text })),
    appendStreamingReasoning: (text) => set((s) => ({ streamingReasoning: s.streamingReasoning + text })),
    resetStreaming: () => set({ streamingContent: '', streamingReasoning: '' }),
    setShareConversationId: (id) => set({ shareConversationId: id }),
  }
})
```

- [ ] **Step 3: 创建 `frontend/src/hooks/useAuth.js`**

```javascript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../store/useStore'

export function useAuth() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useStore((s) => s.setAuth)
  const logout = useStore((s) => s.logout)

  const register = async (username, password, email, turnstileToken) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', {
        username,
        password,
        email: email || null,
        turnstile_token: turnstileToken,
      })
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败，请重试')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password, turnstileToken) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', {
        username,
        password,
        turnstile_token: turnstileToken,
      })
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败，请重试')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return { register, login, logout: handleLogout, loading, error }
}
```

- [ ] **Step 4: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增前端 API 客户端、Zustand Store、Auth Hook"
```

---

### Task 8: 前端登录/注册页面（含 Turnstile）

**Files:**
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Register.jsx`
- Create: `frontend/src/components/Navbar.jsx`

**Note:** Turnstile 需要一个 site key 才能在前端显示。由于目前没有配置，我们可以用一个简单的 checkbox 模拟（开发模式跳过验证）。

- [ ] **Step 1: 创建 `frontend/src/components/Navbar.jsx`**

```jsx
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const user = useStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-gray-600">
            <span>🧪</span>
            <span>AI答研所</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/chat"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  💬 开始对话
                </Link>
                <span className="text-sm text-gray-600">{user.username}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">登录</Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: 创建 `frontend/src/pages/Login.jsx`**

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileOk, setTurnstileOk] = useState(true)
  const { login, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!turnstileOk) return
    try {
      await login(username, password, 'dev-skip')
    } catch { /* error handled in hook */ }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🧪</div>
          <h1 className="text-2xl font-bold text-gray-800">登录</h1>
          <p className="text-sm text-gray-500 mt-1">欢迎回到 AI答研所</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="请输入密码"
              required
            />
          </div>

          {/* Turnstile 占位 — 开发模式用 checkbox 模拟 */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={turnstileOk}
              onChange={(e) => setTurnstileOk(e.target.checked)}
              className="rounded"
            />
            我不是机器人（开发模式）
          </label>

          <button
            type="submit"
            disabled={loading || !turnstileOk}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm text-gray-500">
            还没有账号？{' '}
            <Link to="/register" className="text-blue-600 hover:underline">注册</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 `frontend/src/pages/Register.jsx`**

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [turnstileOk, setTurnstileOk] = useState(true)
  const { register, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!turnstileOk) return
    try {
      await register(username, password, email, 'dev-skip')
    } catch { /* error handled in hook */ }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🧪</div>
          <h1 className="text-2xl font-bold text-gray-800">注册</h1>
          <p className="text-sm text-gray-500 mt-1">加入 AI答研所，开始探索</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="2-50个字符"
              required
              minLength={2}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="至少6个字符"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱（可选）</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="用于找回密码"
            />
          </div>

          {/* Turnstile 占位 */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={turnstileOk}
              onChange={(e) => setTurnstileOk(e.target.checked)}
              className="rounded"
            />
            我不是机器人（开发模式）
          </label>

          <button
            type="submit"
            disabled={loading || !turnstileOk}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-center text-sm text-gray-500">
            已有账号？{' '}
            <Link to="/login" className="text-blue-600 hover:underline">登录</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增登录/注册页面 + Navbar 组件"
```

---

### Task 9: 对话页面 — 侧边栏 + 消息列表 + 输入框 + 三按钮

**Files:**
- Create: `frontend/src/pages/Chat.jsx`
- Create: `frontend/src/components/ConversationSidebar.jsx`
- Create: `frontend/src/components/ActionButtons.jsx`

- [ ] **Step 1: 创建 `frontend/src/components/ConversationSidebar.jsx`**

```jsx
import { useEffect } from 'react'
import api from '../api'
import { useStore } from '../store/useStore'

export default function ConversationSidebar() {
  const savedConversations = useStore((s) => s.savedConversations)
  const setSavedConversations = useStore((s) => s.setSavedConversations)
  const selectedSavedId = useStore((s) => s.selectedSavedId)
  const setSelectedSavedId = useStore((s) => s.setSelectedSavedId)
  const setCurrentConversation = useStore((s) => s.setCurrentConversation)
  const currentConversation = useStore((s) => s.currentConversation)

  useEffect(() => {
    api.get('/conversations').then(({ data }) => setSavedConversations(data)).catch(() => {})
  }, [])

  const handleSelect = async (conv) => {
    setSelectedSavedId(conv.id)
    try {
      const { data: messages } = await api.get(`/conversations/${conv.id}/messages`)
      setCurrentConversation({
        id: conv.id,
        messages,
        isSaved: true,
        roundCount: messages.filter((m) => m.role === 'user').length,
      })
    } catch { /* ignore */ }
  }

  const handleNewChat = () => {
    setSelectedSavedId(null)
    useStore.getState().clearConversation()
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ✨ 新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {savedConversations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无已保存的对话</p>
        ) : (
          savedConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedSavedId === conv.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="truncate font-medium">{conv.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {conv.message_count} 条消息
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `frontend/src/components/ActionButtons.jsx`**

```jsx
import { useStore } from '../store/useStore'
import api from '../api'

export default function ActionButtons() {
  const currentConversation = useStore((s) => s.currentConversation)
  const clearConversation = useStore((s) => s.clearConversation)
  const markConversationSaved = useStore((s) => s.markConversationSaved)
  const setShowShareModal = useStore((s) => s.setShowShareModal)
  const setShareConversationId = useStore((s) => s.setShareConversationId)

  const handleSave = async () => {
    if (!currentConversation.id) return
    try {
      await api.post(`/conversations/${currentConversation.id}/save`)
      markConversationSaved()
      setShareConversationId(currentConversation.id)
      setShowShareModal(true)
    } catch (err) {
      if (err.response?.status === 409) {
        const confirm = window.confirm('该对话已有保存记录，是否更新？')
        if (confirm) {
          // 重新保存逻辑（先删除再保存 — 简化处理）
          await api.delete(`/conversations/${currentConversation.id}`)
          const { data } = await api.post('/conversations', { title: '新对话' })
          // 重新发送消息...
          alert('请在新对话中继续')
        }
      } else {
        alert('保存失败，请重试')
      }
    }
  }

  const handleContinue = () => {
    const input = document.querySelector('textarea')
    if (input) {
      input.placeholder = '⚠️ 当前对话未保存，继续问 AI 可能会忘记前文'
      input.focus()
    }
  }

  const handleNewTopic = () => {
    clearConversation()
  }

  if (currentConversation.messages.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <button
        onClick={handleSave}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-500 transition-colors"
      >
        💾 存入
      </button>
      <button
        onClick={handleContinue}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        💬 继续聊
      </button>
      <button
        onClick={handleNewTopic}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-500 transition-colors"
      >
        📂 新话题
      </button>
    </div>
  )
}
```

- [ ] **Step 3: 创建 `frontend/src/pages/Chat.jsx`**

```jsx
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import api from '../api'
import ConversationSidebar from '../components/ConversationSidebar'
import ActionButtons from '../components/ActionButtons'
import ShareModal from '../components/ShareModal'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function ReasoningBlock({ content }) {
  const [expanded, setExpanded] = useState(true)
  if (!content) return null
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1"
      >
        {expanded ? '▾' : '▸'} 思考过程
      </button>
      {expanded && (
        <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  )
}

function getPlaceholder(conversation) {
  if (conversation.messages.length === 0) return '💬 你想问什么？'
  if (conversation.isSaved) return '💬 继续提问，AI 会记住上下文'
  const count = conversation.roundCount
  if (count === 1) return '⚠️ 当前对话未保存，继续问 AI 可能会忘记前文'
  return `⚠️ 有 ${count} 轮未保存，AI 可能已遗忘部分内容`
}

export default function Chat() {
  const currentConversation = useStore((s) => s.currentConversation)
  const setCurrentConversation = useStore((s) => s.setCurrentConversation)
  const addMessage = useStore((s) => s.addMessage)
  const isStreaming = useStore((s) => s.isStreaming)
  const setIsStreaming = useStore((s) => s.setIsStreaming)
  const streamingReasoning = useStore((s) => s.streamingReasoning)
  const streamingContent = useStore((s) => s.streamingContent)
  const appendStreamingReasoning = useStore((s) => s.appendStreamingReasoning)
  const appendStreamingContent = useStore((s) => s.appendStreamingContent)
  const resetStreaming = useStore((s) => s.resetStreaming)
  const showShareModal = useStore((s) => s.showShareModal)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation.messages, streamingContent])

  const ensureConversation = async () => {
    let convId = currentConversation.id
    if (!convId) {
      const { data } = await api.post('/conversations', { title: '新对话' })
      convId = data.id
      setCurrentConversation({ ...currentConversation, id: convId })
    }
    return convId
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    const message = input.trim()
    setInput('')
    addMessage({ role: 'user', content: message })
    setIsStreaming(true)
    resetStreaming()

    try {
      const convId = await ensureConversation()
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useStore.getState().token}`,
        },
        body: JSON.stringify({ content: message }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === 'reasoning') {
            appendStreamingReasoning(data.content)
          } else if (data.type === 'content') {
            appendStreamingContent(data.content)
          } else if (data.type === 'done') {
            addMessage({ role: 'assistant', content: useStore.getState().streamingContent, reasoning_content: useStore.getState().streamingReasoning })
            resetStreaming()
            setIsStreaming(false)
          } else if (data.type === 'error') {
            alert(data.content)
            setIsStreaming(false)
          }
        }
      }
    } catch (err) {
      alert('AI 服务暂时不可用，请稍后再试')
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ConversationSidebar />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {currentConversation.messages.length === 0 && !isStreaming && (
            <div className="text-center text-gray-400 mt-20">
              <div className="text-5xl mb-4">🧪</div>
              <p className="text-lg">你想问 AI 什么问题？</p>
              <p className="text-sm mt-2">在下方输入问题，AI 会给出答案</p>
            </div>
          )}

          {currentConversation.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5' : 'w-full'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {msg.reasoning_content && <ReasoningBlock content={msg.reasoning_content} />}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 流式输出区域 */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[80%] w-full">
                {streamingReasoning && <ReasoningBlock content={streamingReasoning} />}
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                </div>
                <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 三按钮 */}
        <ActionButtons />

        {/* 输入框 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(currentConversation)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              rows={2}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              {isStreaming ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '发送'
              )}
            </button>
          </div>
        </div>
      </div>

      {showShareModal && <ShareModal />}
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增对话页面（侧边栏+消息列表+三按钮+流式）"
```

---

### Task 10: 分享弹窗组件（骨架）

**Files:**
- Create: `frontend/src/components/ShareModal.jsx`

- [ ] **Step 1: 创建 `frontend/src/components/ShareModal.jsx`**

```jsx
import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function ShareModal() {
  const setShowShareModal = useStore((s) => s.setShowShareModal)
  const shareConversationId = useStore((s) => s.shareConversationId)
  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    setPublishing(true)
    // Phase 2 将实现实际的发布逻辑
    setTimeout(() => {
      setPublishing(false)
      setShowShareModal(false)
    }, 1000)
  }

  const handleKeepPrivate = () => {
    setShowShareModal(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">✅</div>
          <h2 className="text-lg font-semibold text-gray-800">已存入你的档案</h2>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
              placeholder="AI 自动生成（Phase 2）"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 resize-none"
              rows={3}
              placeholder="AI 自动生成（Phase 2）"
              disabled
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? '发布中...' : '📢 发到广场'}
          </button>
          <button
            onClick={handleKeepPrivate}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            🔒 仅自己可见
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增分享弹窗组件（骨架）"
```

---

### Task 11: 广场页面（骨架 — 完整实现在 Phase 2）

**Files:**
- Create: `frontend/src/pages/Home.jsx`
- Create: `frontend/src/components/PostCard.jsx`

- [ ] **Step 1: 创建 `frontend/src/components/PostCard.jsx`**

```jsx
export default function PostCard({ post }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{post.title}</h3>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.summary}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{post.username || '用户'}</span>
        <div className="flex items-center gap-3">
          <span>👍 {post.likes_count || 0}</span>
          <span>💬 {post.comments_count || 0}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `frontend/src/pages/Home.jsx`**

```jsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import PostCard from '../components/PostCard'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef(null)
  const navigate = useNavigate()

  const fetchPosts = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const { data } = await api.get(`/posts?page=${page}&page_size=10`)
      setPosts((prev) => [...prev, ...data.items])
      setHasMore(data.has_more)
      setPage((p) => p + 1)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, hasMore, loading])

  useEffect(() => {
    fetchPosts()
  }, [])

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPosts()
        }
      },
      { threshold: 0.1 },
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [fetchPosts, hasMore, loading])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏛️ 广场</h1>
        <p className="text-sm text-gray-500 mt-1">浏览大家分享的 AI 问答，参与讨论和验证</p>
      </div>

      {posts.length === 0 && !loading ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-lg text-gray-500">还没有人分享内容</p>
          <p className="text-sm text-gray-400 mt-2">去提问并分享你的第一个 AI 回答吧！</p>
          <button
            onClick={() => navigate('/chat')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 去提问
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="cursor-pointer">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={loaderRef} className="py-4 text-center text-sm text-gray-400">
          {loading ? '加载中...' : ''}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
cd /f/ProgramData/CCFile/ai_dayansuo
git add -A && git commit -m "feat: 新增广场页面（骨架）+ 无限滚动"
```

---

## Phase 1 完成检查清单

- [ ] 后端项目可启动（`python run.py`）
- [ ] 数据库表自动创建
- [ ] 用户注册 API 可用（包含 Turnstile 验证）
- [ ] 用户登录 API 可用，返回 JWT token
- [ ] Token 刷新机制工作正常
- [ ] 对话 CRUD API 可用
- [ ] SSE 流式 AI 对话可用（DeepSeek v4-flash）
- [ ] 思考过程（reasoning_content）正确透传
- [ ] 前端项目可启动（`npm run dev`）
- [ ] 登录/注册页面可用
- [ ] 对话页面可用
- [ ] 三按钮（存入/继续聊/新话题）交互正常
- [ ] 动态 Placeholder 正确切换
- [ ] 未保存对话 localStorage 持久化
- [ ] Navbar 导航正常
- [ ] 广场页骨架显示正常
- [ ] 分享弹窗显示正常

---

## 后续 Phase 大纲

| Phase | 内容 | 前置依赖 |
|-------|------|---------|
| Phase 2 | 分享 + 广场（AI 摘要生成、帖子发布、广场完整功能、帖子详情） | Phase 1 |
| Phase 3 | 评论 + 点赞（一级/二级评论、楼中楼、点赞 toggle） | Phase 2 |
| Phase 4 | 搜索 + 优化（搜索 API、前端搜索、响应式、错误边界） | Phase 3 |
