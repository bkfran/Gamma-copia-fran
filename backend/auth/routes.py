from datetime import timedelta, date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from .. import models
from . import schemas
from .utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

# 🔽 IMPORTS PARA WORKLOGS (PASO C)
from ..worklogs.models import WorkLog
from ..worklogs.schemas import WorkLogOut


# Definimos router con prefijo /auth
router = APIRouter(
    prefix="/auth",
    tags=["auth"],  # Agrupa estas rutas dentro de la sección “auth” en Swagger
)

# ========================================================================
# POST /auth/register
# Crea un nuevo usuario, encripta su contraseña y genera un tablero inicial.
# ========================================================================
@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Endpoint de registro.
    - Verifica si el email ya existe.
    - Guarda el usuario con password hasheada.
    - Crea automáticamente un tablero inicial y 3 listas básicas.
    """

    # Comprobamos si ya existe un usuario con ese email
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Creamos el usuario con la contraseña encriptada
    user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Tablero inicial por requisitos de la Semana 1
    default_board = models.Board(name="Tablero principal", user_id=user.id)
    db.add(default_board)
    db.commit()
    db.refresh(default_board)

    # Listas básicas del tablero (Por hacer, En curso, Hecho)
    default_lists = [
        models.List(name="Por hacer", order=1, board_id=default_board.id),
        models.List(name="En curso", order=2, board_id=default_board.id),
        models.List(name="Hecho", order=3, board_id=default_board.id),
    ]
    db.add_all(default_lists)
    db.commit()

    return user


# ========================================================================
# POST /auth/login
# Valida credenciales y devuelve un token JWT usando OAuth2 password flow.
# ========================================================================
@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Endpoint de login con OAuth2 "password flow":
    - Swagger enviará username y password vía formulario.
    - Usamos username como email.
    - Genera un token JWT válido durante 60 minutos.
    """

    # En este flujo 'username' lo usamos como email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # Validar email + contraseña
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generar token válido 60 min
    access_token_expires = timedelta(minutes=60)
    access_token = create_access_token(
        data={"sub": str(user.id)},  # mejor como string
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}


# ========================================================================
# GET /auth/me
# Devuelve el usuario actual usando el token JWT (ruta protegida).
# ========================================================================
@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    """
    Devuelve la información del usuario autenticado.
    Necesita un token válido (Authorization: Bearer <token>).
    """
    return current_user


# ========================================================================
# GET /auth/users/me/worklogs   ← PASO C
# Devuelve las horas del usuario autenticado filtradas por semana ISO
# ========================================================================
@router.get(
    "/users/me/worklogs",
    response_model=list[WorkLogOut],
)
def get_my_worklogs(
    week: str = Query(..., example="2024-18"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    PASO C — Vista "Mis horas"

    - Devuelve SOLO los worklogs del usuario autenticado
    - Filtra por semana ISO (YYYY-WW)
    - Ordena por fecha ascendente
    - Preparado para que el frontend calcule:
        · Totales por día
        · Total semanal
    """

    # --------------------------------------------------
    # 1️⃣ Parsear semana ISO (YYYY-WW)
    # --------------------------------------------------
    try:
        year_str, week_str = week.split("-")
        year = int(year_str)
        week_number = int(week_str)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de semana inválido. Usa YYYY-WW",
        )

    # --------------------------------------------------
    # 2️⃣ Calcular lunes y domingo de esa semana ISO
    # --------------------------------------------------
    try:
        start_date = date.fromisocalendar(year, week_number, 1)  # lunes
        end_date = date.fromisocalendar(year, week_number, 7)    # domingo
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Semana ISO inválida",
        )

    # --------------------------------------------------
    # 3️⃣ Query segura de worklogs
    # --------------------------------------------------
    worklogs = (
        db.query(WorkLog)
        .filter(
            and_(
                WorkLog.user_id == current_user.id,   # 🔐 solo horas propias
                WorkLog.date >= start_date,
                WorkLog.date <= end_date,
            )
        )
        .order_by(WorkLog.date.asc())
        .all()
    )

    return worklogs
