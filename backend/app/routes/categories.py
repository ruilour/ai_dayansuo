from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.post import Post

router = APIRouter(tags=["分类"])

CATEGORIES = ["技术", "科学", "生活", "学习", "创意", "其他"]


@router.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    """返回所有分类及其帖子数量"""
    all_posts = db.query(Post.category).all()
    counts = Counter(c for (c,) in all_posts)
    items = [{"name": cat, "count": counts.get(cat, 0)} for cat in CATEGORIES]
    return {"categories": items}
