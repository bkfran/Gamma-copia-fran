# cards/models.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    func
)
from sqlalchemy.orm import relationship

from backend.database import Base  # importante: importar Base igual que en models.py (raíz)


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)

    # Relaciones con otras tablas
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Datos principales
    title = Column(String(80), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)

    # Timestamps automáticos
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

    # RELATIONSHIPS
    board = relationship("Board", back_populates="cards")
    list = relationship("List", back_populates="cards")
    owner = relationship("User", back_populates="cards")
