from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.report import Report
from app.models.post import Post
from app.models.comment import Comment
from app.models.user import User

router = APIRouter(prefix="/api/reports", tags=["举报"])


class CreateReport(BaseModel):
    target_type: str  # post / comment
    target_id: int
    reason: str  # spam / abuse / porn / other
    detail: str | None = None


@router.post("", status_code=201)
def create_report(
    body: CreateReport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交举报"""
    if body.reason not in ("spam", "abuse", "porn", "other"):
        raise HTTPException(status_code=422, detail="无效的举报原因")
    if body.target_type not in ("post", "comment"):
        raise HTTPException(status_code=422, detail="无效的举报类型")

    # 检查内容是否存在
    if body.target_type == "post":
        target = db.query(Post).filter(Post.id == body.target_id).first()
    else:
        target = db.query(Comment).filter(Comment.id == body.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="被举报内容不存在")

    # 不能举报自己
    if target.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能举报自己的内容")

    # 检查是否已举报过
    existing = (
        db.query(Report)
        .filter(
            Report.reporter_id == current_user.id,
            Report.target_type == body.target_type,
            Report.target_id == body.target_id,
            Report.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="您已举报过该内容")

    report = Report(
        reporter_id=current_user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        reason=body.reason,
        detail=body.detail,
    )
    db.add(report)
    db.commit()

    # 检查是否达到 3 人举报阈值 → 自动隐藏
    from app.models.post import Post as PostModel
    from app.models.comment import Comment as CommentModel
    pending_count = (
        db.query(Report)
        .filter(
            Report.target_type == body.target_type,
            Report.target_id == body.target_id,
            Report.status == "pending",
        )
        .count()
    )
    if pending_count >= 3:
        if body.target_type == "post":
            t = db.query(PostModel).filter(PostModel.id == body.target_id).first()
        else:
            t = db.query(CommentModel).filter(CommentModel.id == body.target_id).first()
        if t:
            t.is_hidden = True

    db.commit()
    return {"status": "ok", "report_id": report.id}
