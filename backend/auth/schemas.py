from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# ============================
# Base para los esquemas de usuario
# ============================

class UserBase(BaseModel):
    email: EmailStr


# ============================
# Esquemas para creación y login
# ============================

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=72)


class UserLogin(UserBase):
    password: str


# ============================
# Esquema para la respuesta de usuario
# ============================

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # (Antes era orm_mode)


# ============================
# Esquemas del token JWT
# ============================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None
