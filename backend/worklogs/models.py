from sqlalchemy import Column, Integer, Float, Date, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from ..database import Base


# ============================================================
# Modelo WorkLog
# Representa un registro de horas trabajadas en una tarjeta
# ============================================================

class WorkLog(Base):
    __tablename__ = "worklogs"

    # --------------------------------------------------------
    # Identificador
    # --------------------------------------------------------
    id = Column(Integer, primary_key=True, index=True)

    # --------------------------------------------------------
    # Relaciones
    # --------------------------------------------------------
    card_id = Column(
        Integer,
        ForeignKey("cards.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # --------------------------------------------------------
    # Datos de negocio
    # --------------------------------------------------------
    date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    note = Column(String(200), nullable=True)

    # --------------------------------------------------------
    # Metadatos
    # --------------------------------------------------------
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # --------------------------------------------------------
    # Relaciones ORM (opcional pero recomendado)
    # --------------------------------------------------------
    card = relationship("Card", back_populates="worklogs")
    user = relationship("User", back_populates="worklogs")
