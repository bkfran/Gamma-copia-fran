from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.auth.utils import get_current_user
from backend.models import List, User

router = APIRouter(
    prefix="/lists",
    tags=["lists"]
)


@router.get("/")
def list_lists(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lists = (
        db.query(List)
        .filter(List.board_id == board_id)
        .order_by(List.order)
        .all()
    )
    return lists
