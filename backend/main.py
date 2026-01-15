from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi.middleware.cors import CORSMiddleware

from .database import get_db, engine, Base
from . import models

from .auth.routes import router as auth_router
from .boards.routes import router as boards_router
from backend.cards.routes import router as cards_router, extras_router as cards_extras_router
from backend.worklogs.routes import router as worklogs_router
from backend.lists.routes import router as lists_router
from backend.reportsweek.routes import router as reports_router

# =========================================================
# Crear aplicación FastAPI
# =========================================================
app = FastAPI()


# =========================================================
# CONFIGURACIÓN CORS (Frontend en 5173)
# =========================================================
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Crear tablas en BD (solo si no existen)
# =========================================================
Base.metadata.create_all(bind=engine)


# =========================================================
# Registrar routers (endpoints principales + extras)
# =========================================================
app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(cards_router)
app.include_router(cards_extras_router)
app.include_router(worklogs_router)
app.include_router(lists_router)
app.include_router(reports_router)

# =========================================================
# Endpoint de test de conexión
# =========================================================
@app.get("/ping")
def db_ping(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"message": "Database connection OK"}
