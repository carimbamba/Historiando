import { Routes, Route, Navigate } from "react-router-dom";
import { useTheme } from "./context/ThemeContext";
import Sidebar     from "./components/Sidebar";
import Dashboard   from "./pages/Dashboard";
import MapaSala    from "./pages/MapaSala";
import Ocorrencias from "./pages/Ocorrencias";
import Analytics   from "./pages/Analytics";
import Conteudo    from "./pages/Conteudo";
import LoginPage   from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const isAuthenticated = () => {
  try {
    const raw = localStorage.getItem("historiando_session");
    if (!raw) return false;
    const session = JSON.parse(raw);
    return Date.now() < session.expiresAt;
  } catch {
    return false;
  }
};

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const { T } = useTheme();

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: T.bg, overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
      transition: "background 0.2s",
    }}>
     {isAuthenticated() && <Sidebar />}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rotas protegidas */}
          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/mapa" element={
            <PrivateRoute><MapaSala /></PrivateRoute>
          } />
          <Route path="/ocorrencias" element={
            <PrivateRoute><Ocorrencias /></PrivateRoute>
          } />
          <Route path="/analytics" element={
            <PrivateRoute><Analytics /></PrivateRoute>
          } />
          <Route path="/conteudo" element={
            <PrivateRoute><Conteudo /></PrivateRoute>
          } />

          {/* Rota desconhecida → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}