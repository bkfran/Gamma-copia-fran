// Importamos React Router
import { createBrowserRouter } from "react-router-dom";

// Importamos nuestras páginas
import Login from "./pages/Login";
import Register from "./pages/Register";
import Boards from "./pages/Boards";

// Definimos las rutas principales de la aplicación
export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/boards",
    element: <Boards />,
  },
  {
    path: "*",
    element: <Login />, // Redirige cualquier ruta desconocida al Login
  },
]);
