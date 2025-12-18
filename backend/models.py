# backend/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    boards = relationship("Board", back_populates="owner")
    cards = relationship("Card", back_populates="owner")



class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="boards")
    lists = relationship("List", back_populates="board")
    cards = relationship("Card", back_populates="board")



class List(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    name = Column(String, nullable=False)
    order = Column(Integer, nullable=False)

    board = relationship("Board", back_populates="lists")
    cards = relationship("Card", back_populates="list")

