import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useApp, TURMAS } from "../context/AppContext";
import AvatarCircle from "./AvatarCircle";

const NAV = [
  { icon: "⊞", label: "Dashboard",    path: "/"            },
  { icon: "◫", label: "Mapa da Sala", path: "/mapa"        },
  { icon: "⚑", label: "Ocorrências",  path: "/ocorrencias" },
  { icon: "◉", label: "Analytics",    path: "/analytics"   },
  { icon: "◈", label: "Conteúdo",     path: "/conteudo"    },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { dark, toggleDark, T } = useTheme();
  const { selectedTurma, setSelectedTurma, sidebarOpen, setSidebarOpen } = useApp();

  return (
    <aside style={{
      width: sidebarOpen ? 220 : 64, flexShrink: 0,
      background: T.sidebarBg, display: "flex", flexDirection: "column",
      transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden", position: "relative", zIndex: 10,
      boxShadow: `4px 0 24px ${T.shadow}`,
    }}>

      {/* Logo */}
      <div onClick={() => navigate("/")} style={{
        padding: "20px 0 14px", display: "flex", alignItems: "center",
        gap: 10, paddingLeft: sidebarOpen ? 18 : 15, cursor: "pointer",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: T.indigo,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, animation: "pulseGlow 3s infinite",
        }}>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "serif" }}>H</span>
        </div>
        {sidebarOpen && (
          <span style={{
            color: "#fff", fontFamily: "'Syne', sans-serif",
            fontWeight: 800, fontSize: 17, letterSpacing: -0.5, whiteSpace: "nowrap",
          }}>Historiando</span>
        )}
      </div>

      {/* Toggle */}
      <button onClick={() => setSidebarOpen((p) => !p)} style={{
        position: "absolute", top: 23, right: -10,
        width: 20, height: 20, background: T.indigo, border: "none",
        borderRadius: "50%", cursor: "pointer", color: "#fff", fontSize: 10,
        zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(79,70,229,0.5)",
      }}>
        {sidebarOpen ? "‹" : "›"}
      </button>

      {/* Seletor de turma */}
      {sidebarOpen && (
        <div style={{
          margin: "0 12px 14px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 11, padding: "10px 12px",
        }}>
          <div style={{
            fontSize: 9, color: "rgba(255,255,255,0.35)",
            fontWeight: 700, letterSpacing: 1.2, marginBottom: 6,
          }}>TURMA ATIVA</div>
          {TURMAS.map((t) => (
            <div key={t} onClick={() => setSelectedTurma(t)} style={{
              padding: "5px 8px", borderRadius: 7, cursor: "pointer",
              fontSize: 12, marginBottom: 2, transition: "all 0.12s",
              fontWeight: selectedTurma === t ? 700 : 500,
              color: selectedTurma === t ? "#fff" : "rgba(255,255,255,0.42)",
              background: selectedTurma === t ? "rgba(79,70,229,0.5)" : "transparent",
            }}>{t}</div>
          ))}
        </div>
      )}

      {/* Navegação */}
      <nav style={{ flex: 1, padding: "0 8px" }}>
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 10px", borderRadius: 10, border: "none", marginBottom: 3,
              background: active ? "rgba(79,70,229,0.28)" : "transparent",
              color: active ? "#fff" : "rgba(255,255,255,0.4)",
              borderLeft: active ? `3px solid ${T.indigo}` : "3px solid transparent",
              transition: "all 0.15s", textAlign: "left",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: "center" }}>
                {item.icon}
              </span>
              {sidebarOpen && (
                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Dark mode */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={toggleDark} style={{
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
          padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center",
          gap: 8, color: "rgba(255,255,255,0.6)", width: "100%",
        }}>
          <span style={{ fontSize: 15 }}>{dark ? "☀" : "☾"}</span>
          {sidebarOpen && (
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {dark ? "Modo Claro" : "Modo Escuro"}
            </span>
          )}
        </button>
      </div>

      {/* Usuário */}
      <div style={{ padding: "10px 12px 16px", display: "flex", alignItems: "center", gap: 9 }}>
        <AvatarCircle initials="MP" size={32} color={T.indigo} bg="rgba(79,70,229,0.22)" />
        {sidebarOpen && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Prof. Marcos P.</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>História · 3 turmas</div>
          </div>
        )}
      </div>
    </aside>
  );
}
