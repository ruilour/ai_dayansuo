"""为数据库中所有已有帖子建立向量索引"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database import SessionLocal
from app.models.post import Post
from app.services.vector_store import reindex_all_posts

db = SessionLocal()
try:
    total = db.query(Post).filter(Post.is_hidden == False).count()
    print(f"共有 {total} 篇帖子待索引...")
    count = reindex_all_posts(db)
    print(f"索引完成: {count}/{total} 篇已建立向量索引")
finally:
    db.close()
