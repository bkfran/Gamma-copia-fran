// Importación de React y estilos específicos del sidebar
import React from "react";
import "./Sidebar.css";

// -----------------------------------------------------------
// Componente funcional del menú lateral izquierdo (Sidebar)
// -----------------------------------------------------------
interface SidebarProps {
  user: any;
  onCrearTarjeta: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onCrearTarjeta }) => {
  return (
    // Etiqueta <aside> indica que es una barra lateral
    <aside className="sidebar">

      {/* ============================================
          MOSTRAR USUARIO AUTENTICADO EN EL SIDEBAR
         ============================================ */}
      <div className="sidebar-user">
        <strong>👤 Usuario:</strong>
        <p>{user?.email || "No identificado"}</p>
      </div>

      {/* Título del menú */}
      <h2 className="sidebar-title">Menú</h2>

      {/* Lista de opciones disponibles en el panel lateral */}
      <ul className="sidebar-list">

        {/* BOTÓN CREAR TARJETA (DENTRO DEL SIDEBAR) */}
        <li
          className="sidebar-create"
          onClick={onCrearTarjeta}
        >
          ➕ Crear tarjeta
        </li>

        <li>⏱️ Mis horas</li>
        <li>📊 Informe</li>
        <li>⚙️ Configuración</li>
      </ul>
    </aside>
  );
};

export default Sidebar;
