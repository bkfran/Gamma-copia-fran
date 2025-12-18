# cards/schemas.py

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# -------------------------------------------------------
# Modelo para CREAR tarjetas (POST /cards)
# -------------------------------------------------------
class CardCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)
    description: Optional[str] = None
    due_date: Optional[date] = None
    board_id: int
    #list_id: int


# -------------------------------------------------------
# Modelo para EDITAR tarjetas (PATCH /cards/{id})
# Todos los campos son opcionales
# -------------------------------------------------------
class CardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=80)
    description: Optional[str] = None
    due_date: Optional[date] = None
    list_id: Optional[int] = None


# -------------------------------------------------------
# Modelo para RESPUESTA hacia el frontend
# (GET /cards, GET /cards/{id}, POST)
# -------------------------------------------------------
class CardResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[date]
    board_id: int
    list_id: int
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

#----------------------------------------------------------
# Modelo para delete una tarjeta
# --------------------------------------------------------
class CardDeleteResponse(BaseModel):
    message: str