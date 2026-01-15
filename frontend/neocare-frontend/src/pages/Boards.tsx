// Importamos React para poder usar JSX y hooks
import React, { useEffect, useState } from "react";

// Importamos dos componentes principales de la interfaz
import ListColumn from "../components/ListColumn";
import Header from "../components/Header"; // Barra superior
import Sidebar from "../components/Sidebar"; // Menú lateral
import CrearVentanaEmergente from "../components/CrearVentanaEmergente";
import CardItem from "../components/CardItem";

// ✅ Modal de horas
import WorklogsModal from "../components/WorklogsModal";

import { DndContext, DragOverlay } from "@dnd-kit/core"; // Contexto para drag-and-drop
import { arrayMove } from "@dnd-kit/sortable";
/*import { closestCenter } from "@dnd-kit/core";*/
import {pointerWithin} from "@dnd-kit/core";

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

  //  Listas del tablero (Por hacer, En curso, Hecho)
  const [lists, setLists] = useState<any[]>([]);

  // ID del tablero activo del usuario
  const [boardId, setBoardId] = useState<number | null>(null);

  // Tarjeta que se está editando (null = estamos creando una nueva)
  const [cardEditando, setCardEditando] = useState<any | null>(null);

  // 🔥 Tarjeta activa durante drag (para DragOverlay)
  const [activeCard, setActiveCard] = useState<any | null>(null);

  // ✅ Worklogs modal
  const [isWorklogsOpen, setIsWorklogsOpen] = useState(false);
  const [worklogsCard, setWorklogsCard] = useState<any | null>(null);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");

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

    if (diffDays < 0) return "expired"; // 🔴 vencido
    if (diffDays <= 2) return "soon"; // 🟠 próximo
    return "normal"; // 🟢 normal
  }

  /* =========================================================
      useEffect → Cargar usuario autenticado y su tablero
     ========================================================= */
  useEffect(() => {
    const fetchUserAndBoard = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No hay token. Inicia sesión primero.");
        setLoading(false);
        return;
      }

      try {
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

        const boardsResponse = await fetch("http://127.0.0.1:8000/boards/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!boardsResponse.ok) {
          setError("No se pudieron obtener los tableros");
          setLoading(false);
          return;
        }

        const boardsData = await boardsResponse.json();

        // /boards/ ya devuelve SOLO los boards del usuario
        if (boardsData.length > 0) {
          setBoardId(boardsData[0].id);
        } else {
          setError("El usuario no tiene tablero asignado");
        }
      } catch (err) {
        setError("No se pudo conectar con el servidor.");
      }

      setLoading(false);
    };

    fetchUserAndBoard();
  }, []);

  /* =========================================================
    useEffect → Cargar listas del tablero activo
   ========================================================= */
  useEffect(() => {
    if (!boardId) return;

    const fetchLists = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/lists/?board_id=${boardId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.error("Error al cargar listas");
          return;
        }

        const data = await response.json();
        setLists(data);
      } catch (error) {
        console.error("No se pudieron cargar las listas");
      }
    };

    fetchLists();
  }, [boardId]);

  const getPorHacerListId = () => {
    const porHacer = lists.find((l: any) => l.name?.toLowerCase() === "por hacer");
    return porHacer ? porHacer.id : null;
  };

  /* =========================================================
    Función reutilizable para cargar las tarjetas del tablero activo
   ========================================================= */
  const reloadCards = async () => {
    if (!boardId) return;

    const token = localStorage.getItem("token");

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

    // Normalizamos campos para evitar null/undefined en UI
    const normalized = data.map((card: any) => ({
      ...card,
      list_id:
        card.list_id === undefined || card.list_id === null
          ? card.list_id
          : Number(card.list_id),
      total_hours: typeof card.total_hours === "number" ? card.total_hours : 0,
      labels: Array.isArray(card.labels) ? card.labels : [],
      subtasks_total: typeof card.subtasks_total === "number" ? card.subtasks_total : 0,
      subtasks_completed: typeof card.subtasks_completed === "number" ? card.subtasks_completed : 0,
    }));

    setCards(normalized);
  };

  /* =========================================================
      useEffect → Cargar tarjetas del tablero activo
     ========================================================= */
  useEffect(() => {
    if (!boardId) return;
    reloadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Generamos los filtros a partir de los datos cargados
  const uniqueResponsibles = Array.from(
    new Set(cards.map((c) => (c.user_id === null || c.user_id === undefined ? "none" : String(c.user_id))))
  );

  const uniqueLabels = Array.from(
    new Map(
      cards
        .flatMap((c) => (Array.isArray(c.labels) ? c.labels : []))
        .map((lbl: any) => [`${lbl.name}::${lbl.color}`, lbl])
    ).values()
  );

  // Filtro local por búsqueda, responsable y etiqueta
  const filteredCards = cards.filter((card) => {
    const title = String(card.title || "").toLowerCase();
    const description = String(card.description || "").toLowerCase();
    const query = searchTerm.trim().toLowerCase();

    if (query && !title.includes(query) && !description.includes(query)) {
      return false;
    }

    if (responsibleFilter !== "all") {
      if (responsibleFilter === "none") {
        if (card.user_id !== null && card.user_id !== undefined) return false;
      } else if (String(card.user_id) !== responsibleFilter) {
        return false;
      }
    }

    if (labelFilter !== "all") {
      const [name, color] = labelFilter.split("::");
      const hasLabel = (card.labels || []).some(
        (lbl: any) => lbl.name === name && lbl.color === color
      );
      if (!hasLabel) return false;
    }

    return true;
  });

  /* =========================================================
      ✅ Abrir modal de horas Worklogs
     ========================================================= */
  const openWorklogs = (card: any) => {
    setWorklogsCard(card);
    setIsWorklogsOpen(true);
  };

  const closeWorklogs = () => {
    setIsWorklogsOpen(false);
    setWorklogsCard(null);
  };

  /* =========================================================
      DRAG & DROP
     ========================================================= */
  const handleDragStart = (event: any) => {
    const { active } = event;

    const found = cards.find((c) => String(c.id) === String(active.id));

    if (found) {
      setActiveCard({
        ...found,
        total_hours: typeof found.total_hours === "number" ? found.total_hours : 0,
      });
    }
  };

  const handleDragOver = () => {};

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) {
      setActiveCard(null);
      return;
    }

    const activeCardId = active.id;
    const token = localStorage.getItem("token");

    // Siempre sacar la tarjeta actual desde el estado (más fiable que usar activeCard state)
    const activeCardNow = cards.find((c) => String(c.id) === String(activeCardId));
    if (!activeCardNow) {
      setActiveCard(null);
      return;
    }

    // 1) Determinar targetListId (si suelto sobre columna o sobre tarjeta)
    let targetListId: number | null = null;

    // 🔥 PRIORIDAD 1: si sueltas sobre una TARJETA
    const cardOver = cards.find((c) => c.id === Number(over.id));
    if (cardOver) {
      targetListId = cardOver.list_id;
    } else {
      // 🔥 PRIORIDAD 2: si sueltas sobre el fondo de la COLUMNA
      const listOver = lists.find((l) => String(l.id) === String(over.id));
      if (listOver) {
        targetListId = listOver.id;
      }
    }
    // Si no sabemos dónde cayó, terminamos
    if (targetListId === null || Number.isNaN(targetListId)) {
      setActiveCard(null);
      return;
    }

    const fromListId = Number(activeCardNow.list_id);

    // 2) Si cambia de columna → actualizo frontend + persisto backend
    if (!Number.isNaN(fromListId) && targetListId !== fromListId) {
      
      setCards((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeCardId) ? { ...c, list_id: targetListId } : c
        )
      );

      try {
        const res = await fetch(`http://127.0.0.1:8000/cards/${activeCardId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ list_id: targetListId }),
        });

        if (!res.ok) {
          console.error("Error al mover tarjeta en backend");
          // Revertir a lo que diga el backend
          await reloadCards();
          setActiveCard(null);
          return;
        }

        // Dejar estado consistente
        await reloadCards();
      } catch (e) {
        console.error("No se pudo conectar con el servidor (mover tarjeta)");
        await reloadCards();
      }

      setActiveCard(null);
      return;
    }

    // 3) Si NO cambia de columna → reordenación visual dentro de columna
    if (String(active.id) !== String(over.id)) {
      setCards((prevCards) => {
        const oldIndex = prevCards.findIndex((c) => String(c.id) === String(active.id));
        const newIndex = prevCards.findIndex((c) => String(c.id) === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prevCards;
        return arrayMove(prevCards, oldIndex, newIndex);
      });
    }

    setActiveCard(null);
  };

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
          onInforme={() => {
            window.location.href = "/report";
          }}
        />

        <div className="board-main">
          <div className="board-toolbar">
            <input
              type="text"
              className="board-search"
              placeholder="Buscar por título o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="board-select"
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
            >
              <option value="all">Todos los responsables</option>
              {uniqueResponsibles.map((id) => (
                <option key={id} value={id}>
                  {id === "none" ? "Sin asignar" : `Usuario ${id}`}
                </option>
              ))}
            </select>

            <select
              className="board-select"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
            >
              <option value="all">Todas las etiquetas</option>
              {uniqueLabels.map((lbl: any) => (
                <option key={`${lbl.name}-${lbl.color}`} value={`${lbl.name}::${lbl.color}`}>
                  {lbl.name} ({lbl.color})
                </option>
              ))}
            </select>

            <button
              className="board-clear"
              onClick={() => {
                setSearchTerm("");
                setResponsibleFilter("all");
                setLabelFilter("all");
              }}
            >
              Limpiar filtros
            </button>
          </div>

        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban">
            {lists
              .sort((a: any, b: any) => a.order - b.order)
              .map((list: any) => (
                <ListColumn
                  key={list.id}
                  title={list.name}
                  listId={list.id}
                  cards={filteredCards}
                  getDeadlineStatus={getDeadlineStatus}
                  onWorklogs={openWorklogs}
                  onEdit={(c) => {
                    setCardEditando(c);
                    setMostrarCrearTarjeta(true);
                  }}
                  onDelete={async (id) => {
                    const confirmar = window.confirm(
                      "¿Seguro que quieres eliminar esta tarjeta?"
                    );

                    if (!confirmar) return;

                    const token = localStorage.getItem("token");

                    const res = await fetch(
                      `http://127.0.0.1:8000/cards/${id}`,
                      {
                        method: "DELETE",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      } 
                    );     
                    if (!res.ok) {
                      alert("Error al eliminar la tarjeta");
                      return;
                    }      

                    // 🔁 Recargamos desde backend para mantener coherencia
                    await reloadCards();
                  }}  
                />
              ))}
          </div>

          <DragOverlay>
            {activeCard ? (
              <CardItem
                card={activeCard}
                getDeadlineStatus={getDeadlineStatus}
                onWorklogs={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        </div>
      </div>

{/* =========================================================
    MODAL CREAR / EDITAR
   ========================================================= */}
<CrearVentanaEmergente
  isOpen={mostrarCrearTarjeta}
  cardInicial={cardEditando}
  onClose={() => {
    setMostrarCrearTarjeta(false);
    setCardEditando(null);
  }}
  onExtrasUpdated={reloadCards}
  onSubmit={async (data) => {
    if (!boardId) return;

    const token = localStorage.getItem("token");

    // =========================
    // EDITAR TARJETA
    // =========================
    if (cardEditando) {
      const res = await fetch(
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

      if (!res.ok) {
        alert("Error al editar la tarjeta");
        return;
      }

      await reloadCards();
    }

    // =========================
    // CREAR TARJETA
    // =========================
    else {
      const porHacerListId = getPorHacerListId();

      if (!porHacerListId) {
        alert("No se encontró la lista 'Por hacer'");
        return;
      }

      const res = await fetch("http://127.0.0.1:8000/cards/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          board_id: boardId,
          list_id: porHacerListId, // 🔥 CLAVE
        }),
      });

      if (!res.ok) {
        alert("Error al crear la tarjeta");
        return;
      }

      await reloadCards();
    }

    setMostrarCrearTarjeta(false);
    setCardEditando(null);
  }}
/>


      {/* =========================================================
          ✅ MODAL DE HORAS (WORKLOGS)
         ========================================================= */}
      <WorklogsModal
        isOpen={isWorklogsOpen}
        onClose={closeWorklogs}
        onSaved={reloadCards}
        card={worklogsCard}
        currentUser={user}
        apiBaseUrl="http://127.0.0.1:8000"
      />
    </div>
  );
};

export default Boards;
