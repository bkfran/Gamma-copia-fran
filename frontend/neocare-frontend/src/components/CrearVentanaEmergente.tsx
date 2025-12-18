import React, { useEffect, useState } from "react";
import "./CrearVentanaEmergente.css";

/* =========================================================
   CONSTANTES
   ========================================================= */
const MAX_TITLE_LENGTH = 80;

/* =========================================================
   PROPS DEL COMPONENTE
   ========================================================= */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    due_date: string;
  }) => void;

  // 👉 Tarjeta inicial (null = crear, objeto = editar)
  cardInicial?: any | null;
}

/* =========================================================
   COMPONENTE VENTANA EMERGENTE
   ========================================================= */
const CrearVentanaEmergente: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  cardInicial = null,
}) => {

  /* =========================================================
      ESTADOS DEL FORMULARIO
     ========================================================= */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due_date, setDeadline] = useState("");

  /* =========================================================
      EFECTO: rellenar campos al editar / limpiar al crear
     ========================================================= */
  useEffect(() => {
    if (cardInicial) {
      // ✏️ Estamos editando una tarjeta existente
      setTitle(cardInicial.title || "");
      setDescription(cardInicial.description || "");
      setDeadline(
        cardInicial.due_date
          ? cardInicial.due_date.split("T")[0]
          : ""
      );
    } else {
      // ➕ Estamos creando una tarjeta nueva
      setTitle("");
      setDescription("");
      setDeadline("");
    }
  }, [cardInicial, isOpen]);

  // Si no está abierta, no renderizamos nada
  if (!isOpen) return null;

  /* =========================================================
      ENVÍO DEL FORMULARIO
     ========================================================= */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      alert("El título es obligatorio");
      return;
    } 

    // Validación: máximo 80 caracteres
    if (title.trim().length > MAX_TITLE_LENGTH) {
      alert(`El título no puede superar los ${MAX_TITLE_LENGTH} caracteres`);
      return;
    }

    // Validación: fecha no puede ser pasada (para que no deje poner fechas pasadas)
    if (due_date) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Normalizamos a inicio del día

      const fechaSeleccionada = new Date(due_date);
      fechaSeleccionada.setHours(0, 0, 0, 0);

      if (fechaSeleccionada < hoy) {
        alert("La fecha de vencimiento no puede ser anterior a hoy");
        return;
      }
    }

    onSubmit({
      title: title.trim(),
      description,
      due_date,
    });

    // Limpiamos campos tras guardar
    setTitle("");
    setDescription("");
    setDeadline("");

    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título dinámico según crear / editar */}
        <h2 className="modal-title">
          {cardInicial ? "Editar tarjeta" : "Crear tarjeta"}
        </h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Llamar al paciente"
            maxLength={MAX_TITLE_LENGTH}
          />

          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles de la tarea..."
          />

          <label>Fecha de vencimiento</label>
          <input
            type="date"
            value={due_date}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-save">
              {cardInicial ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearVentanaEmergente;
