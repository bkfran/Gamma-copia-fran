from datetime import date
import re

from backend.cards.models import Card


# =========================================================
# FUNCIÓN: serialize_card
# =========================================================
def serialize_card(card: Card) -> dict:
    """
    Convierte una tarjeta (objeto Card de la base de datos)
    en un diccionario JSON simple que el frontend puede usar.

    Esta función evita devolver el objeto SQLAlchemy completo,
    que no es serializable directamente a JSON.
    """

    return {
        # ID único de la tarjeta
        "id": card.id,

        # Título visible de la tarjeta
        "title": card.title,

        # ID de la lista en la que está la tarjeta
        # (frontend puede usarlo para saber el estado)
        "list_id": card.list_id,

        # ID del usuario responsable de la tarjeta
        "responsible_id": card.user_id,

        # Fecha de vencimiento de la tarjeta
        # Se convierte a string ISO (YYYY-MM-DD)
        # Si no tiene fecha, se devuelve null
        "due_date": card.due_date.isoformat() if card.due_date else None,
    }


# =========================================================
# FUNCIÓN: get_week_date_range
# =========================================================
def get_week_date_range(week: str) -> tuple[date, date]:
    """
    Recibe una semana en formato YYYY-WW (por ejemplo: '2025-05')
    y devuelve un rango de fechas reales:

    - start_date: lunes de esa semana
    - end_date: lunes de la semana siguiente (límite exclusivo)

    Este rango se usa en las consultas SQL para filtrar por semana.
    """

    # Si no se envía la semana, se lanza error
    if not week:
        raise ValueError("Week parameter is required")

    # -------------------------------------------------
    # VALIDACIÓN DEL FORMATO
    # -------------------------------------------------
    # Se comprueba que el formato sea exactamente YYYY-WW
    # Ejemplos válidos:
    # - 2025-01
    # - 2024-52
    match = re.match(r"^(\d{4})-(\d{2})$", week)
    if not match:
        raise ValueError("Week must have format YYYY-WW")

    # Extraemos el año y el número de semana
    year = int(match.group(1))
    week_number = int(match.group(2))

    # -------------------------------------------------
    # CÁLCULO DE FECHAS (CALENDARIO ISO)
    # -------------------------------------------------
    # ISO calendar:
    # - lunes = día 1
    # - semanas empiezan en lunes
    try:
        # Lunes de la semana indicada
        start_date = date.fromisocalendar(year, week_number, 1)

        # Lunes de la semana siguiente
        # (se usa como límite exclusivo en SQL)
        end_date = date.fromisocalendar(year, week_number + 1, 1)

    except ValueError:
        # Si la semana no existe (ej: 2025-54)
        raise ValueError("Invalid ISO week")

    return start_date, end_date
