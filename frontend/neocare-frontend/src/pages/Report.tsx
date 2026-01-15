import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import "./Report.css";

type SummaryCard = {
  id: number;
  title: string;
  list_id: number | null;
  responsible_id: number | null;
  due_date: string | null;
};

type SummaryResponse = {
  board_id: number;
  week: string;
  new: SummaryCard[];
  completed: SummaryCard[];
  overdue: SummaryCard[];
  new_count: number;
  completed_count: number;
  overdue_count: number;
};

type HoursByUser = {
  user_id: number;
  total_hours: number;
  tasks_count: number;
};

type HoursByCard = {
  card_id: number;
  title: string;
  responsible_id: number | null;
  status: string;
  total_hours: number;
};

type ListItem = {
  id: number;
  name: string;
};

const API_BASE = "http://127.0.0.1:8000";

function getCurrentISOWeek(): string {
  // Calcula la semana ISO (YYYY-WW) para el selector por defecto
  const date = new Date();
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber = Math.round(
    ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7 + 1
  );

  return `${target.getUTCFullYear()}-${String(weekNumber).padStart(2, "0")}`;
}

function toWeekInputValue(week: string): string {
  // Convierte YYYY-WW a formato input[type="week"] => YYYY-Www
  if (!week) return "";
  const [year, num] = week.split("-");
  return `${year}-W${num}`;
}

function fromWeekInputValue(value: string): string {
  // Convierte formato input[type="week"] a YYYY-WW
  if (!value) return "";
  const [year, num] = value.split("-W");
  return `${year}-${num}`;
}

const Report: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [boardId, setBoardId] = useState<number | null>(null);
  const [week, setWeek] = useState<string>(getCurrentISOWeek());
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [hoursByUser, setHoursByUser] = useState<HoursByUser[]>([]);
  const [hoursByCard, setHoursByCard] = useState<HoursByCard[]>([]);
  const [listNames, setListNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const weekInputValue = useMemo(() => toWeekInputValue(week), [week]);

  const fetchUserAndBoard = async () => {
    // Carga usuario autenticado y el primer board disponible
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Necesitas iniciar sesión para ver el informe.");
      return;
    }

    try {
      const [userRes, boardsRes] = await Promise.all([
        fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/boards/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!userRes.ok) {
        throw new Error("No se pudo obtener la sesión.");
      }
      const userData = await userRes.json();
      setUser(userData);

      if (!boardsRes.ok) {
        throw new Error("No se pudieron cargar los tableros.");
      }

      const boardsData = await boardsRes.json();
      if (!boardsData.length) {
        setError("No tienes tableros disponibles.");
        return;
      }

      setBoardId(boardsData[0].id);
      await fetchLists(boardsData[0].id, token);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar la información de usuario/board.");
    }
  };

  const fetchLists = async (board: number, token: string) => {
    // Carga nombres de listas para mostrar el estado en resumen
    try {
      const res = await fetch(`${API_BASE}/lists/?board_id=${board}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: ListItem[] = await res.json();
      const names: Record<number, string> = {};
      data.forEach((l) => {
        names[l.id] = l.name;
      });
      setListNames(names);
    } catch (err) {
      // silencioso, no es crítico para seguir
    }
  };

  const fetchReportData = async () => {
    // Lanza las 3 peticiones del informe en paralelo
    if (!boardId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Necesitas iniciar sesión para ver el informe.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [summaryRes, usersRes, cardsRes] = await Promise.all([
        fetch(`${API_BASE}/report/${boardId}/summary?week=${week}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/report/${boardId}/hours-by-user?week=${week}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/report/${boardId}/hours-by-card?week=${week}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!summaryRes.ok) {
        const detail = await summaryRes.json().catch(() => ({}));
        throw new Error(detail?.detail || "Error al obtener resumen semanal.");
      }
      if (!usersRes.ok) {
        const detail = await usersRes.json().catch(() => ({}));
        throw new Error(detail?.detail || "Error al obtener horas por persona.");
      }
      if (!cardsRes.ok) {
        const detail = await cardsRes.json().catch(() => ({}));
        throw new Error(detail?.detail || "Error al obtener horas por tarjeta.");
      }

      const summaryData: SummaryResponse = await summaryRes.json();
      const hoursUserData: HoursByUser[] = await usersRes.json();
      const hoursCardData: HoursByCard[] = await cardsRes.json();

      setSummary(summaryData);
      setHoursByUser(hoursUserData);
      setHoursByCard(hoursCardData);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Inicializa sesión/board al montar
    fetchUserAndBoard();
  }, []);

  useEffect(() => {
    // Recarga datos al cambiar board o semana
    if (boardId) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, week]);

  useEffect(() => {
    setExpandedUserId(null);
  }, [week, boardId]);

  const labelForResponsible = (id: number | null) => {
    if (id === null || id === undefined) return "Sin asignar";
    return `Usuario ${id}`;
  };

  const labelForList = (id: number | null) => {
    if (!id) return "Sin estado";
    return listNames[id] || `Lista ${id}`;
  };

  const renderGroup = (title: string, cards: SummaryCard[], badge: "green" | "red" | "blue") => {
    return (
      <div className="section">
        <div className="section-header">
          <h3>{title}</h3>
          <span className={`pill ${badge}`}>{cards.length} tarjetas</span>
        </div>

        {cards.length === 0 ? (
          <div className="empty-state">No hubo tarjetas en este grupo.</div>
        ) : (
          <div className="summary-grid">
            {cards.map((c) => (
              <div key={c.id} className="summary-card">
                <p className="summary-title">{c.title}</p>
                <div className="meta-row">
                  <span className="tag">👤 {labelForResponsible(c.responsible_id)}</span>
                  <span className="tag">📌 {labelForList(c.list_id)}</span>
                  {c.due_date && <span className="tag">⏰ {c.due_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const downloadCsv = (rows: any[], headers: string[], filename: string) => {
    // Construye CSV y dispara la descarga en navegador
    if (!rows.length) return;
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const value = row[h] ?? "";
            const needsQuotes = typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"));
            if (needsQuotes) {
              return `"${String(value).replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportUsersCsv = () => {
    // Exporta la tabla de horas por persona
    const rows = hoursByUser.map((row) => ({
      Usuario: row.user_id,
      "Horas totales": row.total_hours,
      "Tareas distintas": row.tasks_count,
    }));
    downloadCsv(rows, ["Usuario", "Horas totales", "Tareas distintas"], `horas-persona-${week}.csv`);
  };

  const exportCardsCsv = () => {
    // Exporta la tabla de horas por tarjeta
    const rows = hoursByCard.map((row) => ({
      Tarjeta: row.title,
      Responsable: labelForResponsible(row.responsible_id),
      Estado: row.status,
      "Horas totales": row.total_hours,
    }));
    downloadCsv(rows, ["Tarjeta", "Responsable", "Estado", "Horas totales"], `horas-tarjeta-${week}.csv`);
  };

  const detailCards = useMemo(() => {
    if (expandedUserId === null) return [];
    return hoursByCard.filter((c) => c.responsible_id === expandedUserId);
  }, [expandedUserId, hoursByCard]);

  return (
    <div className="report-page">
      <Header user={user} />
      <div className="report-container">
        <div
          className="back-link"
          onClick={() => {
            window.location.href = "/boards";
          }}
        >
          ← Volver al tablero
        </div>

        <div className="report-top">
          <div>
            <h2 className="report-title">Informe semanal</h2>
            <p className="report-subtitle">
              Selecciona la semana para ver el resumen de tarjetas y horas trabajadas.
            </p>
          </div>

          <div className="week-picker">
            <label htmlFor="week">Semana</label>
            <input
              id="week"
              type="week"
              value={weekInputValue}
              onChange={(e) => {
                const newWeek = fromWeekInputValue(e.target.value);
                setWeek(newWeek || getCurrentISOWeek());
              }}
            />
            <button className="refresh-button" onClick={fetchReportData}>
              Actualizar
            </button>
          </div>
        </div>

        {loading && <div className="loading-box">Generando resultados...</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && summary && (
          <>
            <div className="status-row">
              <div className="status-card green">
                <h4>Completadas</h4>
                <div className="big-number">{summary.completed_count}</div>
              </div>
              <div className="status-card red">
                <h4>Vencidas</h4>
                <div className="big-number">{summary.overdue_count}</div>
              </div>
              <div className="status-card blue">
                <h4>Nuevas</h4>
                <div className="big-number">{summary.new_count}</div>
              </div>
            </div>

            {renderGroup("Tarjetas completadas", summary.completed, "green")}
            {renderGroup("Tarjetas vencidas", summary.overdue, "red")}
            {renderGroup("Nuevas tarjetas", summary.new, "blue")}
          </>
        )}

        {!loading && !error && (
          <>
            <div className="section">
              <div className="section-header">
                <h3>Horas por persona</h3>
                <div className="section-actions">
                  <button className="csv-button" onClick={exportUsersCsv} disabled={!hoursByUser.length}>
                    Exportar CSV
                  </button>
                </div>
              </div>

              {hoursByUser.length === 0 ? (
                <div className="empty-state">No hay horas registradas esta semana.</div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Horas</th>
                        <th>Tareas</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoursByUser.map((row) => (
                        <tr key={row.user_id}>
                          <td>{labelForResponsible(row.user_id)}</td>
                          <td>{row.total_hours.toFixed(2)}</td>
                          <td>{row.tasks_count}</td>
                          <td>
                            <button
                              className="link-button"
                              onClick={() =>
                                setExpandedUserId(
                                  expandedUserId === row.user_id ? null : row.user_id
                                )
                              }
                            >
                              {expandedUserId === row.user_id ? "Ocultar" : "Ver detalle"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {expandedUserId !== null && (
                <div className="detail-box">
                  <p className="detail-title">
                    Tarjetas del responsable {labelForResponsible(expandedUserId)}
                  </p>
                  {detailCards.length === 0 ? (
                    <div className="empty-state">No hay tarjetas asignadas para esta persona en esta semana.</div>
                  ) : (
                    <div className="summary-grid">
                      {detailCards.map((c) => (
                        <div key={c.card_id} className="summary-card">
                          <p className="summary-title">{c.title}</p>
                          <div className="meta-row">
                            <span className="tag">📌 {c.status}</span>
                            <span className="tag">⏱️ {c.total_hours.toFixed(2)} h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="section">
              <div className="section-header">
                <h3>Horas por tarjeta</h3>
                <div className="section-actions">
                  <button className="csv-button" onClick={exportCardsCsv} disabled={!hoursByCard.length}>
                    Exportar CSV
                  </button>
                </div>
              </div>

              {hoursByCard.length === 0 ? (
                <div className="empty-state">No hay worklogs para esta semana.</div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoursByCard
                        .slice()
                        .sort((a, b) => b.total_hours - a.total_hours)
                        .map((row) => (
                          <tr key={row.card_id}>
                            <td>{row.title}</td>
                            <td>{labelForResponsible(row.responsible_id)}</td>
                            <td>{row.status}</td>
                            <td>{row.total_hours.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Report;
