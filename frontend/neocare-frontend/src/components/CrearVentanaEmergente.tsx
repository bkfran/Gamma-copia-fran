import React, { useEffect, useState } from "react";
import "./CrearVentanaEmergente.css";

/* =========================================================
   CONSTANTES
   ========================================================= */
const MAX_TITLE_LENGTH = 80;
const API_BASE = "http://127.0.0.1:8000";
const LABEL_COLORS = ["blue", "red", "green", "yellow"];

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
  onExtrasUpdated?: () => void;

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
  onExtrasUpdated,
  cardInicial = null,
}) => {

  /* =========================================================
      ESTADOS DEL FORMULARIO
     ========================================================= */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due_date, setDeadline] = useState("");
  const [labels, setLabels] = useState<any[]>([]);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("blue");
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasError, setExtrasError] = useState("");

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
      loadExtras(cardInicial.id);
    } else {
      // ➕ Estamos creando una tarjeta nueva
      setTitle("");
      setDescription("");
      setDeadline("");
      setLabels([]);
      setSubtasks([]);
    }
  }, [cardInicial, isOpen]);

  const loadExtras = async (cardId: number) => {
    // Carga etiquetas y subtareas en paralelo para el modal de edición
    const token = localStorage.getItem("token");
    if (!token) return;

    setExtrasLoading(true);
    setExtrasError("");
    try {
      const [labelsRes, subtasksRes] = await Promise.all([
        fetch(`${API_BASE}/cards/${cardId}/labels`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/cards/${cardId}/subtasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (labelsRes.ok) {
        const labelsData = await labelsRes.json();
        setLabels(Array.isArray(labelsData) ? labelsData : []);
      }

      if (subtasksRes.ok) {
        const subtasksData = await subtasksRes.json();
        setSubtasks(Array.isArray(subtasksData) ? subtasksData : []);
      }
    } catch (err) {
      setExtrasError("No se pudieron cargar etiquetas o subtareas.");
    } finally {
      setExtrasLoading(false);
    }
  };

  const addLabel = async () => {
    // Crea una etiqueta con color predefinido
    if (!cardInicial) return;
    if (!labelName.trim()) {
      alert("El nombre de la etiqueta es obligatorio");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    setExtrasLoading(true);
    setExtrasError("");
    try {
      const res = await fetch(`${API_BASE}/cards/${cardInicial.id}/labels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: labelName.trim(), color: labelColor }),
      });
      if (!res.ok) {
        throw new Error("No se pudo crear la etiqueta");
      }
      const data = await res.json();
      setLabels((prev) => [...prev, data]);
      setLabelName("");
      onExtrasUpdated?.();
    } catch (err) {
      setExtrasError("No se pudo crear la etiqueta.");
    } finally {
      setExtrasLoading(false);
    }
  };

  const deleteLabel = async (labelId: number) => {
    // Elimina una etiqueta existente
    const token = localStorage.getItem("token");
    if (!token) return;
    setExtrasLoading(true);
    setExtrasError("");
    try {
      const res = await fetch(`${API_BASE}/labels/${labelId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("No se pudo eliminar la etiqueta");
      }
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      onExtrasUpdated?.();
    } catch (err) {
      setExtrasError("No se pudo eliminar la etiqueta.");
    } finally {
      setExtrasLoading(false);
    }
  };

  const addSubtask = async () => {
    // Crea una subtarea nueva en la checklist
    if (!cardInicial) return;
    if (!subtaskTitle.trim()) {
      alert("El título de la subtarea es obligatorio");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setExtrasLoading(true);
    setExtrasError("");
    try {
      const res = await fetch(`${API_BASE}/cards/${cardInicial.id}/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: subtaskTitle.trim() }),
      });
      if (!res.ok) {
        throw new Error("No se pudo crear la subtarea");
      }
      const data = await res.json();
      setSubtasks((prev) => [...prev, data]);
      setSubtaskTitle("");
      onExtrasUpdated?.();
    } catch (err) {
      setExtrasError("No se pudo crear la subtarea.");
    } finally {
      setExtrasLoading(false);
    }
  };

  const toggleSubtask = async (subtask: any) => {
    // Alterna el estado completado/no completado
    const token = localStorage.getItem("token");
    if (!token) return;
    setExtrasLoading(true);
    setExtrasError("");
    try {
      const res = await fetch(`${API_BASE}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !subtask.completed }),
      });
      if (!res.ok) {
        throw new Error("No se pudo actualizar la subtarea");
      }
      const data = await res.json();
      setSubtasks((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      onExtrasUpdated?.();
    } catch (err) {
      setExtrasError("No se pudo actualizar la subtarea.");
    } finally {
      setExtrasLoading(false);
    }
  };

  const deleteSubtask = async (subtaskId: number) => {
    // Elimina una subtarea de la checklist
    const token = localStorage.getItem("token");
    if (!token) return;
    setExtrasLoading(true);
    setExtrasError("");
    try {
      const res = await fetch(`${API_BASE}/subtasks/${subtaskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("No se pudo eliminar la subtarea");
      }
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      onExtrasUpdated?.();
    } catch (err) {
      setExtrasError("No se pudo eliminar la subtarea.");
    } finally {
      setExtrasLoading(false);
    }
  };

  // Progreso simple de checklist para la UI
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskProgress = subtasks.length
    ? Math.round((completedSubtasks / subtasks.length) * 100)
    : 0;

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

        <div className="extras-section">
          <h3>Etiquetas</h3>
          {!cardInicial && (
            <p className="extras-note">Guarda la tarjeta para poder añadir etiquetas.</p>
          )}
          {cardInicial && (
            <>
              <div className="extras-row">
                <input
                  type="text"
                  placeholder="Nombre de etiqueta"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                />
                <select value={labelColor} onChange={(e) => setLabelColor(e.target.value)}>
                  {LABEL_COLORS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-secondary" onClick={addLabel}>
                  Añadir
                </button>
              </div>
              <div className="labels-list">
                {labels.length === 0 && <span className="extras-note">Sin etiquetas.</span>}
                {labels.map((lbl) => (
                  <span
                    key={lbl.id}
                    className={`label-chip label-${lbl.color}`}
                  >
                    {lbl.name}
                    <button type="button" onClick={() => deleteLabel(lbl.id)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="extras-section">
          <h3>Checklist</h3>
          {!cardInicial && (
            <p className="extras-note">Guarda la tarjeta para poder añadir subtareas.</p>
          )}
          {cardInicial && (
            <>
              <div className="extras-row">
                <input
                  type="text"
                  placeholder="Nueva subtarea"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                />
                <button type="button" className="btn-secondary" onClick={addSubtask}>
                  Añadir
                </button>
              </div>

              {subtasks.length > 0 && (
                <div className="progress-box">
                  <div className="progress-info">
                    {completedSubtasks}/{subtasks.length} completadas ({subtaskProgress}%)
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${subtaskProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="subtasks-list">
                {subtasks.length === 0 && (
                  <span className="extras-note">Sin subtareas.</span>
                )}
                {subtasks.map((st) => (
                  <div key={st.id} className={`subtask-item ${st.completed ? "done" : ""}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(st.completed)}
                        onChange={() => toggleSubtask(st)}
                      />
                      {st.title}
                    </label>
                    <button type="button" onClick={() => deleteSubtask(st.id)}>
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {extrasLoading && <p className="extras-note">Cargando extras...</p>}
        {extrasError && <p className="extras-error">{extrasError}</p>}
      </div>
    </div>
  );
};

export default CrearVentanaEmergente;
