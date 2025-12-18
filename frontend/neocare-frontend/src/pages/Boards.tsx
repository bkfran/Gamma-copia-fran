// Importamos React para poder usar JSX y hooks
import React, { useEffect, useState } from "react";

// Importamos dos componentes principales de la interfaz
import Header from "../components/Header";     // Barra superior
import Sidebar from "../components/Sidebar";   // Menú lateral
import CrearVentanaEmergente from "../components/CrearVentanaEmergente";

// Importación de estilos específicos para la vista de tableros
import "./Boards.css";

// ============================================================
// Componente principal de la vista de Tablero (Boards)
// ============================================================
const Boards: React.FC = () => {

  /* =========================================================
      ESTADOS PRINCIPALES
     ========================================================= */

  // Usuario autenticado
  const [user, setUser] = useState<any>(null);

  // Mensajes de error
  const [error, setError] = useState("");

  // Control de carga inicial
  const [loading, setLoading] = useState(true);

  // Mostrar / ocultar la ventana emergente de crear o editar tarjeta
  const [mostrarCrearTarjeta, setMostrarCrearTarjeta] = useState(false);

  // Tarjetas del tablero actual
  const [cards, setCards] = useState<any[]>([]);

  // ID del tablero activo del usuario
  const [boardId, setBoardId] = useState<number | null>(null);

  // Tarjeta que se está editando (null = estamos creando una nueva)
  const [cardEditando, setCardEditando] = useState<any | null>(null);

  /* =========================================================
      UTILIDAD: calcular estado de vencimiento
     ========================================================= */
  function getDeadlineStatus(dueDate: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fecha = new Date(dueDate);
    fecha.setHours(0, 0, 0, 0);

    const diffTime = fecha.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "expired";   // 🔴 vencido
    if (diffDays <= 2) return "soon";     // 🟠 próximo
    return "normal";                      // 🟢 normal
  }

  /* =========================================================
      useEffect → Cargar usuario autenticado y su tablero
     ========================================================= */
  useEffect(() => {
    const fetchUserAndBoard = async () => {
      const token = localStorage.getItem("token");

      // Si no hay token, no se puede continuar
      if (!token) {
        setError("No hay token. Inicia sesión primero.");
        setLoading(false);
        return;
      }

      try {
        // 1️⃣ Obtener datos del usuario autenticado
        const userResponse = await fetch("http://127.0.0.1:8000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userResponse.ok) {
          setError("No se pudo obtener la información del usuario");
          setLoading(false);
          return;
        }

        const userData = await userResponse.json();
        setUser(userData);

        // 2️⃣ Obtener tableros del usuario
        const boardsResponse = await fetch("http://127.0.0.1:8000/boards/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!boardsResponse.ok) {
          setError("No se pudieron obtener los tableros");
          setLoading(false);
          return;
        }

        const boardsData = await boardsResponse.json();

        // Por ahora usamos el primer tablero del usuario
        if (boardsData.length > 0) {
          setBoardId(boardsData[0].id);
        } else {
          setError("El usuario no tiene tableros");
        }

      } catch (err) {
        setError("No se pudo conectar con el servidor.");
      }

      setLoading(false);
    };

    fetchUserAndBoard();
  }, []);

  /* =========================================================
      useEffect → Cargar tarjetas del tablero activo
     ========================================================= */
  useEffect(() => {
    if (!boardId) return;

    const fetchCards = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/cards/?board_id=${boardId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.error("Error al cargar tarjetas");
          return;
        }

        const data = await response.json();
        setCards(data);

      } catch (error) {
        console.error("No se pudo conectar con el servidor");
      }
    };

    fetchCards();
  }, [boardId]);

  /* =========================================================
      MENSAJES DE CARGA Y ERROR
     ========================================================= */
  if (loading) return <p style={{ padding: "20px" }}>Cargando tablero...</p>;
  if (error) return <p style={{ color: "red", padding: "20px" }}>{error}</p>;

  /* =========================================================
      RENDER PRINCIPAL
     ========================================================= */
  return (
    <div className="board-container">

      <Header user={user} />

      <div className="content">

        <Sidebar
          user={user}
          onCrearTarjeta={() => {
            setCardEditando(null);
            setMostrarCrearTarjeta(true);
          }}
        />

        <div className="kanban">

          {/* --------- COLUMNA: POR HACER --------- */}
          <div className="column">
            <h2>Por Hacer</h2>

            <div className="cards">
              {cards.map((card) => (
                <div key={card.id} className="card">

                  {/* ESTADO DE LA TARJETA */}
                  <span className="status-badge status-por-hacer">
                    Por hacer
                  </span>

                  {/* CUERPO */}
                  <div className="card-body">
                    <h3>{card.title}</h3>
                    {card.description && <p>{card.description}</p>}
                  </div>

                  {/* FECHA */}
                  {card.due_date && (
                    <div
                      className={`card-deadline ${getDeadlineStatus(card.due_date)}`}
                    >
                      📅 Vence: {new Date(card.due_date).toLocaleDateString()}
                    </div>
                  )}

                  {/* ACCIONES */}
                  <div className="card-actions">

                    <button
                      className="edit-card-btn"
                      onClick={() => {
                        setCardEditando(card);
                        setMostrarCrearTarjeta(true);
                      }}
                    >
                      ✏️ Editar
                    </button>

                    <button
                      className="delete-card-btn"
                      onClick={async () => {
                        if (!window.confirm("¿Seguro que quieres eliminar esta tarjeta?")) return;

                        const token = localStorage.getItem("token");

                        const response = await fetch(
                          `http://127.0.0.1:8000/cards/${card.id}`,
                          {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );

                        if (!response.ok) {
                          alert("Error al eliminar la tarjeta");
                          return;
                        }

                        setCards((prev) =>
                          prev.filter((c) => c.id !== card.id)
                        );
                      }}
                    >
                      🗑 Eliminar
                    </button>

                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="column"><h2>En Curso</h2></div>
          <div className="column"><h2>Hecho</h2></div>

        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      <CrearVentanaEmergente
        isOpen={mostrarCrearTarjeta}
        cardInicial={cardEditando}
        onClose={() => {
          setMostrarCrearTarjeta(false);
          setCardEditando(null);
        }}
        onSubmit={async (data) => {
          if (!boardId) return;

          const token = localStorage.getItem("token");

          // EDITAR
          if (cardEditando) {
            const response = await fetch(
              `http://127.0.0.1:8000/cards/${cardEditando.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
              }
            );

            if (!response.ok) {
              alert("Error al editar la tarjeta");
              return;
            }

            const updated = await response.json();
            setCards((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          }
          // CREAR
          else {
            const response = await fetch("http://127.0.0.1:8000/cards/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                ...data,
                board_id: boardId,
              }),
            });

            if (!response.ok) {
              alert("Error al crear la tarjeta");
              return;
            }

            const newCard = await response.json();
            setCards((prev) => [...prev, newCard]);
          }

          setMostrarCrearTarjeta(false);
          setCardEditando(null);
        }}
      />

    </div>
  );
};

export default Boards;

