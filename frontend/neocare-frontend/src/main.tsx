// Importa React (necesario para usar JSX)
import React from "react";
// Importa la función que permite renderizar la aplicación en el DOM
import ReactDOM from "react-dom/client";

// Importa las herramientas de React Router para gestionar las rutas
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importación de las páginas principales
import Login from "./pages/Login";   // Página de inicio de sesión
import Register from "./pages/Register"; // Página de registro
import Boards from "./pages/Boards"; // Página del tablero (vista protegida)
import ProtectedRoute from "./components/ProtectedRoute";

// Importación de estilos globales
import "./index.css";

// Punto de entrada de la aplicación React.
// ReactDOM.createRoot monta la app dentro del elemento HTML con id="root".
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Redirección automática al login si entras en "/" */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Página pública de Login */}
        <Route path="/login" element={<Login />} />

        {/* Página pública de Registro */}
        <Route path="/register" element={<Register />} />

        {/* Página protegida */}
        <Route
          path="/boards"
          element={
            <ProtectedRoute>
              <Boards />
            </ProtectedRoute>
          }
        />

        {/* Cualquier ruta desconocida → Login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
