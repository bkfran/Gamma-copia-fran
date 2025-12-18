from fastapi import FastAPI, Depends 
from sqlalchemy.orm import Session
from sqlalchemy import text  # 👈 ESTA LÍNEA NUEVA


from fastapi.middleware.cors import CORSMiddleware
from .database import get_db, engine, Base
from . import models
from .auth.routes import router as auth_router
from .boards.routes import router as boards_router

from backend.cards.routes import router as cards_router


app = FastAPI()

#CONFIGURACIÓN DE CORS PARA PERMITIR LA CONEXIÓN DEL FRONTEND (5173)
# ------------------------------------------------------------
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Permitimos frontend en puerto 5173
    allow_credentials=True,
    allow_methods=["*"],        # Permitimos todos los métodos (GET, POST, etc.)
    allow_headers=["*"],        # Permitimos todos los headers
)


Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(cards_router)

@app.get("/ping")
def db_ping(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"message": "Database connection OK"}
