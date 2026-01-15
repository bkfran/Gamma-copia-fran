from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func   # ✅ NUEVO

from backend.database import get_db
from backend.auth.utils import get_current_user

from backend.cards.schemas import (
    CardCreate,
    CardUpdate,
    CardResponse,
    CardDeleteResponse,
    LabelCreate,
    LabelOut,
    SubtaskCreate,
    SubtaskUpdate,
    SubtaskOut,
)
from backend.cards.models import Card, Label, Subtask
from backend.models import Board, List, User
from backend.worklogs.models import WorkLog   


router = APIRouter(
    prefix="/cards",
    tags=["Cards"]
)

extras_router = APIRouter(
    tags=["Cards"]
)


# ---------------------------------------------------------
# POST /cards → Crear tarjeta
# ---------------------------------------------------------
@router.post("/", response_model=CardResponse)
def create_card(
    card: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Comprobar que el tablero pertenece al usuario
    board = db.query(Board).filter(
        Board.id == card.board_id,
        Board.user_id == current_user.id
    ).first()

    if not board:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para crear tarjetas en este tablero."
        )

    # Buscar la lista "Por hacer"
    por_hacer_list = db.query(List).filter(
        List.board_id == board.id,
        List.name.ilike("por hacer")
    ).first()

    if not por_hacer_list:
        raise HTTPException(
            status_code=400,
            detail="La lista 'Por hacer' no existe."
        )

    # Crear tarjeta (SIN order)
    new_card = Card(
        title=card.title,
        description=card.description,
        due_date=card.due_date,
        board_id=board.id,
        list_id=card.list_id,
        user_id=current_user.id
    )

    db.add(new_card)
    db.commit()
    db.refresh(new_card)

    return new_card


# ---------------------------------------------------------
# GET /cards?board_id=...
# ---------------------------------------------------------
@router.get("/", response_model=list[dict])
def list_cards(
    board_id: int,
    responsible_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    board = db.query(Board).filter(
        Board.id == board_id,
        Board.user_id == current_user.id
    ).first()

    if not board:
        raise HTTPException(status_code=403)

    # -----------------------------------------------------
    #  Obtener tarjetas + total de horas (agregación por tarjeta)
    # -----------------------------------------------------
    cards_query = (
        db.query(
            Card,
            func.coalesce(func.sum(WorkLog.hours), 0).label("total_hours")
        )
        .outerjoin(WorkLog, WorkLog.card_id == Card.id)
        .filter(Card.board_id == board_id)
        .group_by(Card.id)
        .order_by(Card.list_id)
    )
    # Filtro opcional por responsable
    if responsible_id is not None:
        cards_query = cards_query.filter(Card.user_id == responsible_id)

    cards_with_hours = cards_query.all()

    # Usamos los IDs para traer etiquetas y subtareas en bloque
    card_ids = [card.id for card, _total in cards_with_hours]
    labels_by_card: dict[int, list[dict]] = {}
    subtasks_by_card: dict[int, dict] = {}

    if card_ids:
        labels = db.query(Label).filter(Label.card_id.in_(card_ids)).all()
        for lbl in labels:
            labels_by_card.setdefault(lbl.card_id, []).append({
                "id": lbl.id,
                "card_id": lbl.card_id,
                "name": lbl.name,
                "color": lbl.color,
            })

        subtasks = db.query(Subtask).filter(Subtask.card_id.in_(card_ids)).all()
        for st in subtasks:
            entry = subtasks_by_card.setdefault(st.card_id, {"total": 0, "completed": 0})
            entry["total"] += 1
            if st.completed:
                entry["completed"] += 1

    # -----------------------------------------------------
    # Convertir a JSON incluyendo total_hours
    # -----------------------------------------------------
    result = []

    for card, total_hours in cards_with_hours:
        subtask_summary = subtasks_by_card.get(card.id, {"total": 0, "completed": 0})
        result.append({
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "due_date": card.due_date,
            "board_id": card.board_id,
            "list_id": card.list_id,
            "user_id": card.user_id,
            "created_at": card.created_at,
            "updated_at": card.updated_at,
            "total_hours": float(total_hours),  
            "labels": labels_by_card.get(card.id, []),
            "subtasks_total": subtask_summary["total"],
            "subtasks_completed": subtask_summary["completed"],
        })

    return result


# ---------------------------------------------------------
# GET /cards/search?query=...
# ---------------------------------------------------------
@router.get("/search", response_model=list[dict])
def search_cards(
    query: str,
    board_id: int,
    responsible_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = db.query(Board).filter(
        Board.id == board_id,
        Board.user_id == current_user.id
    ).first()

    if not board:
        raise HTTPException(status_code=403)

    # Base query limitada al board del usuario autenticado
    cards_query = db.query(Card).filter(Card.board_id == board_id)

    if responsible_id is not None:
        cards_query = cards_query.filter(Card.user_id == responsible_id)

    # Búsqueda por coincidencia parcial en título o descripción
    like_query = f"%{query}%"
    cards = (
        cards_query
        .filter(
            (Card.title.ilike(like_query)) | (Card.description.ilike(like_query))
        )
        .order_by(Card.list_id)
        .all()
    )

    return [
        {
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "due_date": card.due_date,
            "board_id": card.board_id,
            "list_id": card.list_id,
            "user_id": card.user_id,
            "created_at": card.created_at,
            "updated_at": card.updated_at,
        }
        for card in cards
    ]


def _get_card_or_404(card_id: int, db: Session) -> Card:
    # Helper para centralizar el "no encontrado"
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404)
    return card


def _assert_card_owner(card: Card, current_user: User):
    # Validación de acceso: solo dueño del board
    if card.board.user_id != current_user.id:
        raise HTTPException(status_code=403)


# ---------------------------------------------------------
# PATCH /cards/{id} → Editar tarjeta
# ---------------------------------------------------------
@router.patch("/{card_id}", response_model=CardResponse)
def update_card(
    card_id: int,
    card_update: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    card = _get_card_or_404(card_id, db)
    _assert_card_owner(card, current_user)

    if card_update.title is not None:
        if not card_update.title.strip():
            raise HTTPException(status_code=400)
        card.title = card_update.title

    if card_update.description is not None:
        card.description = card_update.description

    if card_update.due_date is not None:
        card.due_date = card_update.due_date

    if card_update.list_id is not None:
        list_obj = db.query(List).filter(
            List.id == card_update.list_id,
            List.board_id == card.board_id
        ).first()

        if not list_obj:
            raise HTTPException(status_code=400)

        card.list_id = card_update.list_id

    db.commit()
    db.refresh(card)

    return card


# ---------------------------------------------------------
# DELETE /cards/{id}
# ---------------------------------------------------------
@router.delete("/{card_id}", response_model=CardDeleteResponse)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    card = _get_card_or_404(card_id, db)
    _assert_card_owner(card, current_user)

    db.delete(card)
    db.commit()

    return {"message": "Tarjeta eliminada correctamente."}


# ---------------------------------------------------------
# LABELS
# ---------------------------------------------------------
@router.post("/{card_id}/labels", response_model=LabelOut)
def create_label(
    card_id: int,
    payload: LabelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _get_card_or_404(card_id, db)
    _assert_card_owner(card, current_user)

    label = Label(card_id=card.id, name=payload.name, color=payload.color)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.get("/{card_id}/labels", response_model=list[LabelOut])
def list_labels(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _get_card_or_404(card_id, db)
    _assert_card_owner(card, current_user)
    return db.query(Label).filter(Label.card_id == card.id).all()


@extras_router.delete("/labels/{label_id}")
def delete_label(
    label_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404)
    _assert_card_owner(label.card, current_user)
    db.delete(label)
    db.commit()
    return {"message": "Etiqueta eliminada correctamente."}


# ---------------------------------------------------------
# SUBTASKS
# ---------------------------------------------------------
@router.post("/{card_id}/subtasks", response_model=SubtaskOut)
def create_subtask(
    card_id: int,
    payload: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _get_card_or_404(card_id, db)
    _assert_card_owner(card, current_user)

    subtask = Subtask(card_id=card.id, title=payload.title, completed=False)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.get("/{card_id}/subtasks", response_model=list[SubtaskOut])
def list_subtasks(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = _get_card_or_404(card_id, db)
    _assert_card_owner(card, current_user)
    return db.query(Subtask).filter(Subtask.card_id == card.id).all()


@extras_router.patch("/subtasks/{subtask_id}", response_model=SubtaskOut)
def update_subtask(
    subtask_id: int,
    payload: SubtaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404)
    _assert_card_owner(subtask.card, current_user)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(subtask, field, value)

    db.commit()
    db.refresh(subtask)
    return subtask


@extras_router.delete("/subtasks/{subtask_id}")
def delete_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404)
    _assert_card_owner(subtask.card, current_user)
    db.delete(subtask)
    db.commit()
    return {"message": "Subtarea eliminada correctamente."}
