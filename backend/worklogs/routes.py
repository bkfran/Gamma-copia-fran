from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import datetime
from collections import defaultdict

from backend.database import get_db
from backend.auth.utils import get_current_user
from backend.models import User

from .models import WorkLog
from .schemas import (
    WorkLogCreate,
    WorkLogUpdate,
    WorkLogOut,
    WorkLogDayTotal,
    WorkLogsWeekSummary,
)

# =========================================================
# Router principal de Worklogs
# =========================================================
router = APIRouter(
    tags=["Worklogs"]
)

# =========================================================
# POST /cards/{card_id}/worklogs
# Crear registro de horas
# =========================================================
@router.post("/cards/{card_id}/worklogs", response_model=WorkLogOut)
def create_worklog(
    card_id: int,
    data: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------------
    # Validaciones obligatorias (reglas de negocio básicas)
    # -----------------------------
    if data.hours <= 0:
        raise HTTPException(status_code=400, detail="Hours must be > 0")

    if data.date > date.today():
        raise HTTPException(status_code=400, detail="Date cannot be in the future")

    # -----------------------------
    # Crear worklog
    # -----------------------------
    worklog = WorkLog(
        card_id=card_id,
        user_id=current_user.id,
        date=data.date,
        hours=data.hours,
        note=data.note,
    )

    db.add(worklog)
    db.commit()
    db.refresh(worklog)

    return worklog


# =========================================================
# GET /cards/{card_id}/worklogs
# Listar horas por tarjeta
# =========================================================
@router.get("/cards/{card_id}/worklogs", response_model=list[WorkLogOut])
def list_worklogs_by_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 🔎 NOTA:
    # Aquí permitimos ver los worklogs de una tarjeta
    # a cualquier miembro del equipo (según requisitos)
    worklogs = (
        db.query(WorkLog)
        .filter(WorkLog.card_id == card_id)
        .order_by(WorkLog.date.desc())
        .all()
    )

    return worklogs


# =========================================================
# PATCH /worklogs/{id}
# Editar horas (solo autor)
# =========================================================
@router.patch("/worklogs/{worklog_id}", response_model=WorkLogOut)
def update_worklog(
    worklog_id: int,
    data: WorkLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worklog = db.query(WorkLog).filter(WorkLog.id == worklog_id).first()

    if not worklog:
        raise HTTPException(status_code=404, detail="Worklog not found")

    # 🔐 SEGURIDAD CLAVE: solo el autor puede editar
    if worklog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(worklog, field, value)

    db.commit()
    db.refresh(worklog)

    return worklog


# =========================================================
# DELETE /worklogs/{id}
# Eliminar horas (solo autor)
# =========================================================
@router.delete("/worklogs/{worklog_id}")
def delete_worklog(
    worklog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worklog = db.query(WorkLog).filter(WorkLog.id == worklog_id).first()

    if not worklog:
        raise HTTPException(status_code=404, detail="Worklog not found")

    # 🔐 SEGURIDAD CLAVE: solo el autor puede borrar
    if worklog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(worklog)
    db.commit()

    return {"message": "Worklog deleted"}


# =========================================================
# GET /users/me/worklogs?week=YYYY-WW
# Vista "Mis horas" (lista simple)
# =========================================================
@router.get("/users/me/worklogs", response_model=list[WorkLogOut])
def get_my_worklogs(
    week: str = Query(..., example="2025-52"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve los worklogs del usuario autenticado
    filtrados por semana ISO (YYYY-WW).
    """

    try:
        year, week_number = map(int, week.split("-"))
        start_date = datetime.date.fromisocalendar(year, week_number, 1)
        end_date = datetime.date.fromisocalendar(year, week_number, 7)
    except ValueError:
        raise HTTPException(status_code=400, detail="Semana ISO inválida")

    worklogs = (
        db.query(WorkLog)
        .filter(
            WorkLog.user_id == current_user.id,
            WorkLog.date >= start_date,
            WorkLog.date <= end_date,
        )
        .order_by(WorkLog.date.asc())
        .all()
    )

    return worklogs


# =========================================================
# GET /users/me/worklogs/summary?week=YYYY-WW
# Totales por día + total semanal
# =========================================================
@router.get(
    "/users/me/worklogs/summary",
    response_model=WorkLogsWeekSummary
)
def get_my_worklogs_summary(
    week: str = Query(..., example="2025-52"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Vista 'Mis horas' avanzada:
    - Worklogs de la semana
    - Totales por día
    - Total semanal
    """

    try:
        year, week_number = map(int, week.split("-"))
        start_date = datetime.date.fromisocalendar(year, week_number, 1)
        end_date = datetime.date.fromisocalendar(year, week_number, 7)
    except ValueError:
        raise HTTPException(status_code=400, detail="Semana ISO inválida")

    worklogs = (
        db.query(WorkLog)
        .filter(
            WorkLog.user_id == current_user.id,
            WorkLog.date >= start_date,
            WorkLog.date <= end_date,
        )
        .order_by(WorkLog.date.asc())
        .all()
    )

    totals_by_day = defaultdict(float)
    total_week_hours = 0.0

    for wl in worklogs:
        totals_by_day[wl.date] += wl.hours
        total_week_hours += wl.hours

    by_day = [
        WorkLogDayTotal(date=day, hours=hours)
        for day, hours in sorted(totals_by_day.items())
    ]

    return {
        "week": week,
        "total_week_hours": total_week_hours,
        "by_day": by_day,
        "worklogs": worklogs,
    }
