import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem("token");

  // Si no hay token → redirigir al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    // Comprobamos que el token tiene las 3 partes
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }

    // Decodificar JWT (la parte del Payload)
    const payload = JSON.parse(atob(tokenParts[1]));

    // FastAPI usa exp (epoch en segundos)
    const expiration = payload.exp * 1000;

    // Verificar expiración
    if (Date.now() > expiration) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_email"); // opcional
      return <Navigate to="/login" replace />;
    }
  } catch (error) {
    // Cualquier error al decodificar → token inválido
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  // Si todo está OK → permitir acceso
  return children;
};

export default ProtectedRoute;
