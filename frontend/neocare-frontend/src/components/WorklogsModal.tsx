import React, { useEffect, useMemo, useState } from "react";

/**
 * ESTILOS CSS INTEGRADOS
 * Se inyectan dinámicamente al cargar el componente. 
 * Se han definido colores específicos para mejorar la experiencia de usuario:
 * - Añadir: Verde
 * - Editar: Azul
 * - Eliminar/Cerrar: Rojo
 */
const styles = `
.wl-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.wl-modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.wl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.wl-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}
.wl-error {
  color: #d32f2f;
  background: #ffebee;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}
.wl-create, .wl-item {
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}
.wl-row {
  margin-bottom: 10px;
}
.wl-row label {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
  font-weight: 600;
}
.wl-row input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.wl-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.wl-actions button {
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 4px;
  border: none;
  font-weight: bold;
  color: white;
  transition: opacity 0.2s;
}
.wl-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* CLASES DE COLORES PARA BOTONES (Personalización solicitada) */
.btn-add { background-color: #2e7d32 !important; }    /* Verde - Añadir/Guardar */
.btn-edit { background-color: #1976d2 !important; }   /* Azul - Editar */
.btn-delete { background-color: #d32f2f !important; } /* Rojo - Eliminar */
.btn-close { background-color: #d32f2f !important; }  /* Rojo - Cerrar */
.btn-reload { background-color: #757575 !important; } /* Gris - Acciones neutras */

.wl-edit-grid {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}
.wl-note {
  font-size: 14px;
  color: #666;
  margin: 5px 0;
  font-style: italic;
}
.wl-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
`;

type AnyObj = Record<string, any>;

interface WorklogsModalProps {
  isOpen: boolean;           // Controla si el modal es visible
  onClose: () => void;       // Función para cerrar el modal
  onSaved?: () => void;      // Callback cuando ocurre un cambio (para refrescar la UI externa)
  card: AnyObj | null;       // Datos de la tarjeta actual
  currentUser?: AnyObj | null; // Datos del usuario logueado (para permisos)
  apiBaseUrl?: string;       // URL base del Backend
}

const WorklogsModal: React.FC<WorklogsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  card,
  currentUser,
  apiBaseUrl = "http://127.0.0.1:8000",
}) => {
  // --- ESTADOS Y MEMOS ---
  const token = useMemo(() => localStorage.getItem("token"), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [worklogs, setWorklogs] = useState<AnyObj[]>([]);

  // Inyección de estilos CSS al montar el componente
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Cálculo dinámico del total de horas registradas en esta tarjeta
  const totalHours = useMemo(() => {
    return worklogs.reduce((acc, wl) => acc + Number(wl.hours || 0), 0);
  }, [worklogs]);

  // Estados para el formulario de CREACIÓN
  const [hours, setHours] = useState<string>("");
  const [workDate, setWorkDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  });
  const [note, setNote] = useState<string>("");

  // Estados para el formulario de EDICIÓN
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHours, setEditHours] = useState<string>("");
  const [editWorkDate, setEditWorkDate] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");
  const [originalData, setOriginalData] = useState<AnyObj | null>(null);

  // --- CONFIGURACIÓN DE HEADERS ---
  const headersJson = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const listUrl = useMemo(() => {
    if (!card?.id) return "";
    return `${apiBaseUrl}/cards/${card.id}/worklogs`;
  }, [apiBaseUrl, card?.id]);

  // --- FUNCIONES DE LÓGICA / API ---

  // Obtener la lista de horas desde el servidor
  const loadWorklogs = async () => {
    if (!listUrl) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(listUrl, { headers: headersAuthOnly });
      if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
      const data = await res.json();
      setWorklogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError("No se pudieron cargar los registros de horas.");
    } finally {
      setLoading(false);
    }
  };

  // Carga automática al abrir el modal
  useEffect(() => {
    if (isOpen && card?.id) loadWorklogs();
  }, [isOpen, card?.id]);

  // Crear un nuevo registro
  const onCreate = async () => {
    if (!hours || Number(hours) <= 0) {
      setError("Por favor, introduce una cantidad de horas válida.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(listUrl, {
        method: "POST",
        headers: headersJson,
        body: JSON.stringify({
          hours: Number(hours),
          date: workDate,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar el registro.");
      
      // Reset y recarga
      setHours("");
      setNote("");
      await loadWorklogs();
      onSaved?.(); // Notifica a la UI padre
    } catch (e) {
      setError("Error al intentar crear el registro.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * GUARDAR CAMBIOS DE EDICIÓN
   * Se ha optimizado para evitar errores 422 (Unprocessable Content).
   * Solo enviamos los campos que han cambiado (Partial Update).
   */
  const saveEdit = async (id: number) => {
    if (!editHours || Number(editHours) <= 0) {
      setError("Las horas deben ser mayores a 0.");
      return;
    }
    
    setLoading(true);
    setError(""); 

    try {
      // Construimos un objeto con los cambios reales para evitar enviar datos innecesarios
      // que puedan fallar en la validación de Pydantic
      const payload: AnyObj = {};
      
      const newHours = Number(editHours);
      if (newHours !== originalData?.hours) payload.hours = newHours;
      
      if (editWorkDate !== originalData?.date) payload.date = editWorkDate;
      
      const trimmedNote = editNote.trim();
      const finalNote = trimmedNote === "" ? null : trimmedNote;
      if (finalNote !== (originalData?.note || null)) payload.note = finalNote;

      // Si no hay cambios, simplemente cerramos la edición
      if (Object.keys(payload).length === 0) {
        setEditingId(null);
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiBaseUrl}/worklogs/${id}`, {
        method: "PATCH",
        headers: headersJson,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Si el backend es estricto y el PATCH parcial no funciona, intentamos enviar todo
        if (res.status === 422) {
           console.warn("Reintento con objeto completo por error 422...");
           const fullRes = await fetch(`${apiBaseUrl}/worklogs/${id}`, {
             method: "PATCH",
             headers: headersJson,
             body: JSON.stringify({
               hours: Number(editHours),
               date: editWorkDate,
               note: editNote.trim() || null
             }),
           });
           if (!fullRes.ok) {
             const fullErrorData = await fullRes.json().catch(() => ({}));
             throw new Error(fullErrorData.detail?.[0]?.msg || "Error persistente de validación (422).");
           }
        } else {
          throw new Error(errorData.detail || "Error al actualizar.");
        }
      }

      setEditingId(null);
      setOriginalData(null);
      await loadWorklogs();
      onSaved?.();
    } catch (e: any) {
      setError(e.message || "Error al editar el registro.");
    } finally {
      setLoading(false);
    }
  };

  // Borrar un registro
  const deleteWorklog = async (id: number) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro de horas?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/worklogs/${id}`, { 
        method: "DELETE", 
        headers: headersAuthOnly 
      });
      if (!res.ok) throw new Error();
      await loadWorklogs();
      onSaved?.();
    } catch (e) {
      setError("No se pudo eliminar el registro.");
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el registro pertenece al usuario actual (Permisos)
  const isMine = (wl: AnyObj) => {
    if (!currentUser?.id) return true; 
    return wl.user_id === currentUser.id;
  };

  if (!isOpen) return null;

  return (
    <div className="wl-overlay" onClick={onClose}>
      <div className="wl-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* CABECERA */}
        <div className="wl-header">
          <h2>⏱ Gestión de Horas</h2>
          <button className="wl-close" onClick={onClose}>✖</button>
        </div>

        <div className="wl-subtitle" style={{ marginBottom: '15px', color: '#555' }}>
          <strong>Tarjeta:</strong> {card?.title ?? "(Sin título)"}
        </div>

        {error && <div className="wl-error">{error}</div>}

        {/* FORMULARIO DE CREACIÓN */}
        <div className="wl-create">
          <div className="wl-row">
            <label>Horas trabajadas</label>
            <input 
              type="number" 
              step="0.25" 
              value={hours} 
              onChange={e => setHours(e.target.value)} 
              disabled={loading} 
              placeholder="Ej: 2.5"
            />
          </div>
          <div className="wl-row">
            <label>Fecha del trabajo</label>
            <input 
              type="date" 
              value={workDate} 
              onChange={e => setWorkDate(e.target.value)} 
              disabled={loading} 
            />
          </div>
          <div className="wl-row">
            <label>Nota / Descripción (Opcional)</label>
            <input 
              type="text" 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              disabled={loading} 
              placeholder="¿Qué has hecho?"
            />
          </div>
          <div className="wl-actions">
            <button className="btn-add" onClick={onCreate} disabled={loading}>Añadir Horas</button>
          </div>
        </div>

        {/* RESUMEN DE TOTAL */}
        <div style={{ margin: "10px 0", padding: "10px", background: "#f5f5f5", borderRadius: "6px", textAlign: "right", fontWeight: "bold", fontSize: "1.1em" }}>
          Total Acumulado: <span style={{ color: "#2e7d32" }}>{totalHours.toFixed(2)} h</span>
        </div>

        {/* LISTADO DE REGISTROS */}
        <div className="wl-list">
          {worklogs.length === 0 && !loading && <p style={{ textAlign: 'center', opacity: 0.6 }}>No hay horas registradas aún.</p>}
          
          {worklogs.map((wl) => (
            <div key={wl.id} className="wl-item">
              {editingId === wl.id ? (
                /* MODO EDICIÓN */
                <div className="wl-edit-grid">
                  <div className="wl-row">
                    <label>Horas</label>
                    <input type="number" step="0.25" value={editHours} onChange={e => setEditHours(e.target.value)} />
                  </div>
                  <div className="wl-row">
                    <label>Fecha</label>
                    <input type="date" value={editWorkDate} onChange={e => setEditWorkDate(e.target.value)} />
                  </div>
                  <div className="wl-row">
                    <label>Nota</label>
                    <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Nota" />
                  </div>
                  <div className="wl-actions">
                    <button className="btn-add" onClick={() => saveEdit(wl.id)} disabled={loading}>Guardar</button>
                    <button className="btn-reload" onClick={() => { setEditingId(null); setOriginalData(null); }} disabled={loading}>Cancelar</button>
                  </div>
                </div>
              ) : (
                /* MODO VISTA */
                <div>
                  <div className="wl-line">
                    <strong style={{ fontSize: '1.1em' }}>{wl.hours}h</strong> 
                    <span style={{ margin: '0 8px', color: '#999' }}>|</span> 
                    <span>{wl.date}</span>
                  </div>
                  {wl.note && <div className="wl-note">"{wl.note}"</div>}
                  
                  <div className="wl-actions">
                    <button 
                      className="btn-edit" 
                      onClick={() => {
                        setEditingId(wl.id);
                        setEditHours(wl.hours);
                        setEditWorkDate(wl.date);
                        setEditNote(wl.note || "");
                        setOriginalData({...wl});
                      }} 
                      disabled={!isMine(wl) || loading}
                      title={!isMine(wl) ? "No tienes permiso para editar esto" : ""}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => deleteWorklog(wl.id)} 
                      disabled={!isMine(wl) || loading}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* PIE DEL MODAL */}
        <div className="wl-footer">
          <button className="btn-close" onClick={onClose}>Cerrar Ventana</button>
        </div>
      </div>
    </div>
  );
};

export default WorklogsModal;