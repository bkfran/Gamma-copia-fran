from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

# =============================
# Configuración de JWT
# =============================

# En un proyecto real esto debería ir en variables de entorno (.env)
SECRET_KEY = "super-secret-key-change-this"  # cámbialo por algo largo y aleatorio
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# =============================
# Configuración de seguridad
# =============================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# FastAPI usará este esquema para extraer el token del header Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# =============================
# Utilidades de contraseña
# =============================

def hash_password(password: str) -> str:
    """
    Recibe una contraseña en texto plano y devuelve un hash seguro (bcrypt).
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara una contraseña en texto plano con su hash.
    Devuelve True si coinciden.
    """
    return pwd_context.verify(plain_password, hashed_password)

# =============================
# Utilidades para el token JWT
# =============================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT con un payload (data) y una fecha de expiración.
    IMPORTANTE: espera que en data venga, por ejemplo, {"sub": str(user.id)}.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Dependencia que:
    - Lee el token del header Authorization.
    - Lo valida y decodifica.
    - Busca el usuario en la base de datos.
    - Devuelve el usuario si todo es correcto.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise credentials_exception

        # El "sub" nos llega como string → lo convertimos a int
        try:
            user_id = int(user_id_raw)
        except (TypeError, ValueError):
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
