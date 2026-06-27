"""创建/提升管理员账号"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def create_admin(username: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            existing.role = "admin"
            existing.password_hash = get_password_hash(password)
            db.commit()
            print(f"用户 '{username}' 已提升为管理员，密码已更新")
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
