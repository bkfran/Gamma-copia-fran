from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List


# =========================================================
# Schemas existentes (NO SE TOCAN)
# =========================================================

class WorkLogCreate(BaseModel):
    date: date
    hours: float = Field(gt=0)
    note: Optional[str] = Field(None, max_length=200)


class WorkLogUpdate(BaseModel):
    date: Optional[date] = None
    hours: Optional[float] = Field(None, gt=0)
    note: Optional[str] = Field(None, max_length=200)


class WorkLogOut(BaseModel):
    id: int
    card_id: int
    user_id: int
    date: date
    hours: float
    note: Optional[str]

    class Config:
        from_attributes = True


# =========================================================
# ⬇️ NUEVOS SCHEMAS — PASO A.4 (Totales)
# =========================================================

class WorkLogDayTotal(BaseModel):
    date: date
    hours: float


class WorkLogsWeekSummary(BaseModel):
    week: str
    total_week_hours: float
    by_day: List[WorkLogDayTotal]
    worklogs: List[WorkLogOut]

