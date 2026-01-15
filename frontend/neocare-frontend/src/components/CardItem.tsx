import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./CardItem.css";

interface CardItemProps {
  card: any;
  getDeadlineStatus: (date: string) => string;
  onWorklogs: (card: any) => void;
  onEdit: (card: any) => void;
  onDelete: (cardId: number) => void;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  getDeadlineStatus,
  onWorklogs,
  onEdit,
  onDelete,
}) => {
  // Protección de seguridad
  if (!card) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging ? "0 8px 20px rgba(0, 0, 0, 0.25)" : "none",
    cursor: "grab",
  };

  // Detener la propagación para que los clics en botones no activen el arrastre
  const stopDnd = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  // Datos derivados para pintar etiquetas y progreso
  const totalHours = typeof card.total_hours === "number" ? card.total_hours : 0;
  const labels = Array.isArray(card.labels) ? card.labels : [];
  const subtasksTotal = typeof card.subtasks_total === "number" ? card.subtasks_total : 0;
  const subtasksCompleted = typeof card.subtasks_completed === "number" ? card.subtasks_completed : 0;
  const progress = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : 0;

  const labelColor = (color: string) => {
    switch (color) {
      case "red":
        return "#ef4444";
      case "green":
        return "#22c55e";
      case "yellow":
        return "#eab308";
      case "blue":
        return "#3b82f6";
      default:
        return "#64748b";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card"
      {...attributes}
      {...listeners}
    >
      {/* Badge de horas: Solo número y símbolo */}
      <div className="card-hours-total">
        ⏱ {totalHours.toFixed(2)} h
      </div>

      <div className="card-body">
        <h3>{card.title || "Sin título"}</h3>
        {/* Descripción eliminada para hacer la tarjeta más compacta */}
      </div>

      {labels.length > 0 && (
        <div className="card-labels">
          {labels.map((lbl: any) => (
            <span
              key={lbl.id ?? `${lbl.name}-${lbl.color}`}
              className="card-label"
              style={{ backgroundColor: labelColor(lbl.color) }}
            >
              {lbl.name}
            </span>
          ))}
        </div>
      )}

      {subtasksTotal > 0 && (
        <div className="card-progress">
          <div className="card-progress-info">
            ✅ {subtasksCompleted}/{subtasksTotal} completadas ({progress}%)
          </div>
          <div className="card-progress-bar">
            <div className="card-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {card.due_date && (
        <div className={`card-deadline ${getDeadlineStatus ? getDeadlineStatus(card.due_date) : ""}`}>
          📅 Vence: {new Date(card.due_date).toLocaleDateString()}
        </div>
      )}

      <div className="card-actions">
        <button
          className="hours-card-btn"
          onPointerDown={stopDnd}
          onClick={(e) => {
            e.stopPropagation();
            onWorklogs(card);
          }}
        >
          ⏱ Horas
        </button>

        <button
          className="edit-card-btn"
          onPointerDown={stopDnd}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(card);
          }}
        >
          ✏️ Editar
        </button>

        <button
          className="delete-card-btn"
          onPointerDown={stopDnd}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
        >
          🗑 Borrar
        </button>
      </div>
    </div>
  );
};

export default CardItem;
