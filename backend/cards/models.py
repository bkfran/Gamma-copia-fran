# cards/models.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    func
)
from sqlalchemy.orm import relationship

from backend.database import Base


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Datos principales
    title = Column(String(80), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)


    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    board = relationship("Board", back_populates="cards")
    list = relationship("List", back_populates="cards")
    owner = relationship("User", back_populates="cards")
    worklogs = relationship("WorkLog", back_populates="card", cascade="all, delete-orphan")
    labels = relationship("Label", back_populates="card", cascade="all, delete-orphan")
    subtasks = relationship("Subtask", back_populates="card", cascade="all, delete-orphan")


class Label(Base):
    # Etiqueta simple asociada a una tarjeta (nombre + color)
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(30), nullable=False)
    color = Column(String(20), nullable=False)

    card = relationship("Card", back_populates="labels")


class Subtask(Base):
    # Subtarea/checklist con estado de completado
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)

    card = relationship("Card", back_populates="subtasks")
