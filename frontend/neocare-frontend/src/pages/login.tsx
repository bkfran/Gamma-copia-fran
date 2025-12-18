// Importamos React y el hook useState para manejar estados locales (email y password)
import React, { useState } from "react";

// Importamos useNavigate para poder redirigir al usuario a otra página tras el login
import { useNavigate } from "react-router-dom";

// Imagen de fondo para la pantalla de login
import fondo from "../assets/fondo.jpg";

// Estilos específicos de la página de login
import "./login.css";

// Componente funcional de la pantalla de Login
const Login: React.FC = () => {
  // Hook para navegar entre páginas (React Router)
  const navigate = useNavigate();

  // Estados para almacenar el email y la contraseña introducidos por el usuario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Función que se ejecuta cuando el usuario envía el formulario
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita recarga automática
    setError("");

    try {
      // ------------------------------------------------------------
      // ⚠️ FastAPI OAuth2 requiere FORM DATA, NO JSON.
      // username = email
      // password = contraseña
      // ------------------------------------------------------------
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      // Petición al backend
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      // ❌ Si el servidor responde con error
      if (!response.ok) {
        setError(data.detail || "Error en el login");
        return;
      }

      // ------------------------------------------------------------
      // Guardamos el token JWT en localStorage
      // ------------------------------------------------------------
      localStorage.setItem("token", data.access_token);

      // Opcional: guardar email del usuario
      localStorage.setItem("user_email", email);

      // ------------------------------------------------------------
      // Redirige al usuario al tablero (ruta protegida)
      // ------------------------------------------------------------
      navigate("/boards");

    } catch (error) {
      setError("No se pudo conectar con el servidor");
    }
  };

  // Renderizado del formulario de login
  return (
    <div
      className="login-container"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Iniciar Sesión</h2>

        {/* Campo de entrada para el email */}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Campo de entrada para la contraseña */}
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Botón para enviar el formulario */}
        <button type="submit">Ingresar</button>

        {/* Mensaje de error */}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Enlace para navegar a la página de registro */}
        <p
          style={{ marginTop: "12px", cursor: "pointer", color: "red" }}
          onClick={() => navigate("/register")}
        >
          ¿No tienes cuenta? Regístrate aquí  👈
        </p>
      </form>
    </div>
  );
};

// Exportamos el componente para usarlo en el enrutado (main.tsx)
export default Login;
