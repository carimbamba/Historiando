import { Routes, Route, Navigate } from "react-router-dom";
import { useTheme } from "./context/ThemeContext";
import Sidebar     from "./components/Sidebar";
import Dashboard   from "./pages/Dashboard";
import MapaSala    from "./pages/MapaSala";
import Ocorrencias from "./pages/Ocorrencias";
import Analytics   from "./pages/Analytics";
import Conteudo    from "./pages/Conteudo";

export default function App() {
  const { T } = useTheme();

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: T.bg, overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
      transition: "background 0.2s",
    }}>
      <Sidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Routes>
          <Route path="/"            element={<Dashboard />}   />
          <Route path="/mapa"        element={<MapaSala />}    />
          <Route path="/ocorrencias" element={<Ocorrencias />} />
          <Route path="/analytics"   element={<Analytics />}   />
          <Route path="/conteudo"    element={<Conteudo />}    />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
