"""创建初始管理员账号"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def create_admin(username: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"用户 '{username}' 已存在，跳过创建")
            if existing.role != "admin":
                existing.role = "admin"
                db.commit()
                print(f"已将 '{username}' 提升为管理员")
            return

        user = User(
            username=username,
            password_hash=get_password_hash(password),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"管理员 '{username}' 创建成功")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python scripts/create_admin.py <username> <password>")
        sys.exit(1)
    create_admin(sys.argv[1], sys.argv[2])
