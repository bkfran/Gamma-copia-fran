// Importamos React y useState para manejar los datos del formulario
import React, { useState } from "react";

// Importamos useNavigate para redirigir al usuario después del registro
import { useNavigate } from "react-router-dom";

// Imagen de fondo para mantener coherencia visual con Login
import fondo from "../assets/fondo.jpg";

// Estilos (reutilizamos los del login)
import "./login.css";

// Componente funcional para la pantalla de Registro
const Register: React.FC = () => {
  const navigate = useNavigate();

  // Estados para almacenar email y contraseña introducidos por el usuario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Función que se ejecuta al enviar el formulario de registro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // ------------------------------------------------------------
      // 1️⃣ Registrar usuario en FastAPI
      // ------------------------------------------------------------
      const response = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || "Error al registrar usuario");
        return;
      }

      // ------------------------------------------------------------
      // 2️⃣ Hacer login automático después del registro
      // FastAPI requiere username/password vía FORM DATA
      // ------------------------------------------------------------
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const loginRes = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError("Usuario creado, pero error en el login automático.");
        return;
      }

      // Guardamos token en localStorage
      localStorage.setItem("token", loginData.access_token);
      localStorage.setItem("user_email", email);

      // ------------------------------------------------------------
      // 3️⃣ Redirigir al tablero tras crear cuenta + login
      // ------------------------------------------------------------
      navigate("/boards");

    } catch (error) {
      setError("No se pudo conectar con el servidor");
    }
  };

  // Renderizado del formulario de registro
  return (
    <div
      className="login-container"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <form className="login-form" onSubmit={handleRegister}>
        <h2>Crear Cuenta</h2>

        {/* Campo para el email */}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Campo para la contraseña */}
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Botón para enviar el formulario */}
        <button type="submit">Registrarse</button>

        {/* Mensaje de error */}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Enlace para volver a la pantalla de login */}
        <p
          style={{ marginTop: "12px", cursor: "pointer", color: "red" }}
          onClick={() => navigate("/login")}
        >
          ¿Ya tienes cuenta? Inicia sesión aquí  👈
        </p>
      </form>
    </div>
  );
};

export default Register;
