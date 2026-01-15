from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import pandas as pd

# Dependencias comunes del backend
from backend.database import get_db
from backend.auth.utils import get_current_user

# Modelos principales
from backend.models import Board, User, List
from backend.cards.models import Card
from backend.worklogs.models import WorkLog

# Utilidades del módulo de reportes
from .utils import get_week_date_range, serialize_card


# =========================
# ROUTER DE REPORTES
# =========================
# Todos los endpoints empiezan por /report
router = APIRouter(
    prefix="/report",
    tags=["reports"]
)


# =========================
# FUNCIÓN DE SEGURIDAD
# =========================
def get_board_or_403(
    board_id: int,
    db: Session,
    current_user: User
) -> Board:
    """
    Comprueba que el board existe y pertenece al usuario autenticado.
    Si no es así, devuelve error 403.
    """

    board = (
        db.query(Board)
        .filter(Board.id == board_id)
        .first()
    )

    if not board or board.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this board"
        )

    return board


# =========================================================
#  RESUMEN SEMANAL
# =========================================================
@router.get("/{board_id}/summary")
def weekly_summary(
    board_id: int,
    week: str = Query(..., description="Week in format YYYY-WW"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve un resumen semanal del board:
    - tarjetas nuevas
    - tarjetas completadas (lista 'Hecho')
    - tarjetas vencidas
    """

    # --- Seguridad: comprobar que el board es del usuario ---
    board = get_board_or_403(board_id, db, current_user)

    # --- Calcular rango de fechas de la semana ---
    # (lunes -> lunes siguiente)
    try:
        start_date, end_date = get_week_date_range(week)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


    # -------------------------------------------------
    # TARJETAS NUEVAS
    # -------------------------------------------------
    # Tarjetas creadas durante la semana
    new_cards = (
        db.query(Card)
        .filter(
            Card.board_id == board.id,
            Card.created_at >= start_date,
            Card.created_at < end_date,
        )
        .all()
    )


    # -------------------------------------------------
    # TARJETAS COMPLETADAS
    # -------------------------------------------------
    # Tarjetas que:
    # - están en la lista "Hecho"
    # - se actualizaron durante la semana
    completed_cards = (
        db.query(Card)
        .join(List, Card.list_id == List.id)
        .filter(
            Card.board_id == board.id,
            List.name == "Hecho",
            Card.updated_at >= start_date,
            Card.updated_at < end_date,
        )
        .all()
    )


    # -------------------------------------------------
    # TARJETAS VENCIDAS
    # -------------------------------------------------
    # Tarjetas que:
    # - tienen fecha de vencimiento en la semana
    # - NO están en "Hecho"
    overdue_cards = (
        db.query(Card)
        .join(List, Card.list_id == List.id)
        .filter(
            Card.board_id == board.id,
            Card.due_date >= start_date,
            Card.due_date < end_date,
            List.name != "Hecho",
        )
        .all()
    )


    # --- Respuesta final para frontend ---
    return {
        "board_id": board.id,
        "week": week,
        "range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "new": [serialize_card(c) for c in new_cards],
        "completed": [serialize_card(c) for c in completed_cards],
        "overdue": [serialize_card(c) for c in overdue_cards],
        "new_count": len(new_cards),
        "completed_count": len(completed_cards),
        "overdue_count": len(overdue_cards),
    }


# =========================================================
#  HORAS TRABAJADAS POR USUARIO
# =========================================================
@router.get("/{board_id}/hours-by-user")
def hours_by_user(
    board_id: int,
    week: str = Query(..., description="Week in format YYYY-WW"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve:
    - total de horas trabajadas por cada usuario
    - número de tarjetas distintas en las que ha trabajado
    """

    # Seguridad
    board = get_board_or_403(board_id, db, current_user)

    # Rango semanal
    try:
        start_date, end_date = get_week_date_range(week)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


    # -------------------------------------------------
    # CONSULTA BASE
    # -------------------------------------------------
    # Se obtienen todos los worklogs de la semana
    # relacionados con tarjetas del board
    worklogs_query = (
        db.query(
            WorkLog.user_id,
            WorkLog.card_id,
            WorkLog.hours
        )
        .join(Card, WorkLog.card_id == Card.id)
        .filter(
            Card.board_id == board.id,
            WorkLog.date >= start_date,
            WorkLog.date < end_date,
        )
    )

    rows = worklogs_query.all()

    if not rows:
        return []


    # -------------------------------------------------
    # AGREGACIÓN CON PANDAS
    # -------------------------------------------------
    # - Suma de horas por usuario
    # - Número de tarjetas distintas por usuario
    df = pd.DataFrame(rows, columns=["user_id", "card_id", "hours"])

    result_df = (
        df.groupby("user_id")
        .agg(
            total_hours=("hours", "sum"),
            tasks_count=("card_id", "nunique")
        )
        .reset_index()
    )

    return result_df.to_dict(orient="records")


# =========================================================
#  HORAS TRABAJADAS POR TARJETA
# =========================================================
@router.get("/{board_id}/hours-by-card")
def hours_by_card(
    board_id: int,
    week: str = Query(..., description="Week in format YYYY-WW"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve:
    - horas totales trabajadas por cada tarjeta
    - responsable
    - estado (lista)
    """

    # Seguridad
    board = get_board_or_403(board_id, db, current_user)

    # Rango semanal
    try:
        start_date, end_date = get_week_date_range(week)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


    # -------------------------------------------------
    # CONSULTA BASE
    # -------------------------------------------------
    # Se obtienen las horas de cada tarjeta de la semana
    worklogs_query = (
        db.query(
            Card.id.label("card_id"),
            Card.title,
            Card.user_id.label("responsible_id"),
            List.name.label("status"),
            WorkLog.hours
        )
        .join(WorkLog, WorkLog.card_id == Card.id)
        .join(List, Card.list_id == List.id)
        .filter(
            Card.board_id == board.id,
            WorkLog.date >= start_date,
            WorkLog.date < end_date,
        )
    )

    rows = worklogs_query.all()

    if not rows:
        return []


    # -------------------------------------------------
    # AGREGACIÓN CON PANDAS
    # -------------------------------------------------
    # Suma de horas por tarjeta
    df = pd.DataFrame(
        rows,
        columns=[
            "card_id",
            "title",
            "responsible_id",
            "status",
            "hours",
        ],
    )

    result_df = (
        df.groupby(["card_id", "title", "responsible_id", "status"])
        .agg(total_hours=("hours", "sum"))
        .reset_index()
        .sort_values("total_hours", ascending=False)
    )

    return result_df.to_dict(orient="records")

