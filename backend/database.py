from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL


# Crea el motor de conexión a PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=True,       # Muestra las consultas SQL en la consola (útil para aprender). Pon False si molesta.
    future=True,
)

# Crea la fábrica de sesiones
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Clase base para los modelos (tablas)
Base = declarative_base()


# Dependencia para obtener una sesión de BD en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
