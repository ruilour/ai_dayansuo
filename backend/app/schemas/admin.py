from datetime import datetime
from pydantic import BaseModel


class AdminReportItem(BaseModel):
    id: int
    reporter_id: int
    reporter_name: str | None = None
    target_type: str
    target_id: int
    reason: str
    detail: str | None = None
    status: str
    action_taken: str | None = None
    created_at: str | None = None
    handled_at: str | None = None

    class Config:
        from_attributes = True


class AdminResolveReport(BaseModel):
    action: str  # dismiss / delete / warning / mute / ban
    duration_hours: int | None = None  # mute/ban 的小时数，null=永久
    reason: str = ""


class AdminUserItem(BaseModel):
    id: int
    username: str
    email: str | None = None
    role: str
    status: str
    muted_until: str | None = None
    banned_until: str | None = None
    status_reason: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class AdminUserStatusUpdate(BaseModel):
    status: str  # active / muted / banned
    duration_hours: int | None = None
    reason: str = ""


class AdminBlockedWordCreate(BaseModel):
    pattern: str
    is_regex: bool = False


class AdminBlockedWordItem(BaseModel):
    id: int
    pattern: str
    is_regex: bool
    created_at: str | None = None

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    pending_reports: int
    total_users: int
    banned_users: int
    muted_users: int
