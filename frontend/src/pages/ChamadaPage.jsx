import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken() {
  try {
    const s = JSON.parse(localStorage.getItem("historiando_session"));
    return s?.token || "";
  } catch { return ""; }
}

function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
    padding: "12px 22px", borderRadius: "12px", fontSize: "13px", fontWeight: 700,
    color: "#fff", fontFamily: "'DM Sans',sans-serif",
    background: type === "success" ? "#059669" : type === "error" ? "#E11D48" : "#D97706",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)", animation: "fadeUp 0.3s ease",
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = 0; el.style.transition = "opacity 0.3s"; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const STATUS_CONFIG = {
  presente:    { icon: "✓", label: "Presente",    color: "#059669", bg: "#ECFDF5", darkBg: "#064E3B" },
  ausente:     { icon: "✕", label: "Ausente",     color: "#E11D48", bg: "#FFF1F2", darkBg: "#4C0519" },
  justificado: { icon: "!", label: "Justificado", color: "#D97706", bg: "#FFFBEB", darkBg: "#451A03" },
};

const CYCLE = ["presente", "ausente", "justificado"];

// ═══════════════════════════════════════════════════════════════════════════════
// ChamadaPage
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChamadaPage() {
  const { T, dark } = useTheme();
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState("");
  const [data, setData] = useState(todayStr());
  const [presencas, setPresencas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ── Fetch turmas on mount ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/turmas`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const d = await res.json();
        setTurmas(d.turmas);
        if (d.turmas.length > 0) setSelectedTurma(d.turmas[0].id);
      } catch {}
    })();
  }, []);

  // ── Fetch presença when turma or date changes ─────────────────────────
  const fetchPresencas = useCallback(async () => {
    if (!selectedTurma || !data) return;
    setLoading(true);
    setDirty(false);
    try {
      const res = await fetch(
        `${API}/api/presencas?turmaId=${selectedTurma}&data=${data}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPresencas(d.presencas.map((p) => ({
        alunoId: p.aluno_id,
        nome: p.nome_completo,
        matricula: p.matricula,
        status: p.status || "ausente",
        observacoes: p.observacoes || "",
      })));
    } catch {
      toast("Erro ao carregar presenças.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedTurma, data]);

  useEffect(() => { fetchPresencas(); }, [fetchPresencas]);

  // ── Toggle status ─────────────────────────────────────────────────────
  const toggleStatus = (alunoId) => {
    setPresencas((prev) => prev.map((p) => {
      if (p.alunoId !== alunoId) return p;
      const idx = CYCLE.indexOf(p.status);
      return { ...p, status: CYCLE[(idx + 1) % CYCLE.length] };
    }));
    setDirty(true);
  };

  // ── Bulk actions ──────────────────────────────────────────────────────
  const setAll = (status) => {
    setPresencas((prev) => prev.map((p) => ({ ...p, status })));
    setDirty(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const salvar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/presencas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          turmaId: selectedTurma,
          data,
          presencas: presencas.map((p) => ({
            alunoId: p.alunoId,
            status: p.status,
            observacoes: p.observacoes || null,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      toast(d.message);
      setDirty(false);
    } catch (err) {
      toast(err.message || "Erro ao salvar chamada.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Export Excel ──────────────────────────────────────────────────────
  const exportar = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API}/api/presencas/exportar?turmaId=${selectedTurma}&data=${data}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error();
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Backend envia o header Content-Disposition com o nome, mas podemos definir um fallback
      a.download = `Chamada_Export_${data}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast("Planilha exportada com sucesso!");
    } catch {
      toast("Erro ao exportar. Verifique a conexão.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Counters ──────────────────────────────────────────────────────────
  const counts = presencas.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, { presente: 0, ausente: 0, justificado: 0 });

  const turmaObj = turmas.find((t) => t.id === selectedTurma);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: "'DM Sans',sans-serif" }}>

      {/* Header */}
      <header style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif", letterSpacing: -0.5 }}>
            Chamada Diária ✓
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: T.muted, marginTop: 2 }}>
            {turmaObj ? turmaObj.nome : "Selecione uma turma"} · {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={selectedTurma}
            onChange={(e) => setSelectedTurma(e.target.value)}
            style={{
              appearance: "none", padding: "8px 32px 8px 14px", borderRadius: 10,
              border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.primary,
              fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", outline: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input
            type="date" value={data}
            onChange={(e) => setData(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
              background: T.input, color: T.primary, fontSize: 13, fontFamily: "'DM Sans',sans-serif",
              outline: "none",
            }}
          />
        </div>
      </header>

      {/* Stats bar */}
      <div style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}`, padding: "10px 28px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: dark ? cfg.darkBg : cfg.bg,
            padding: "5px 14px", borderRadius: 8, border: `1.5px solid ${cfg.color}25`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{cfg.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{counts[key]}</span>
            <span style={{ fontSize: 10, color: T.muted }}>{cfg.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <button onClick={() => setAll("presente")} style={{
          padding: "6px 14px", borderRadius: 8, border: `1.5px solid #05966930`,
          background: "transparent", color: "#059669", fontWeight: 700, fontSize: 11, cursor: "pointer",
        }}>
          ✓ Todos presentes
        </button>
        <button onClick={() => setAll("ausente")} style={{
          padding: "6px 14px", borderRadius: 8, border: `1.5px solid #E11D4830`,
          background: "transparent", color: "#E11D48", fontWeight: 700, fontSize: 11, cursor: "pointer",
        }}>
          ✕ Todos ausentes
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: T.muted, fontSize: 13 }}>Carregando...</div>
        ) : presencas.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.primary, marginBottom: 4 }}>
              Nenhum aluno encontrado
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              {turmas.length === 0 ? "Crie uma turma e adicione alunos primeiro." : "Adicione alunos à turma selecionada."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "44px 1fr 120px 140px",
              padding: "8px 14px", fontSize: 10, fontWeight: 700, color: T.muted,
              letterSpacing: 0.8, textTransform: "uppercase",
            }}>
              <span>#</span>
              <span>Aluno</span>
              <span>Matrícula</span>
              <span style={{ textAlign: "center" }}>Status</span>
            </div>

            {presencas.map((p, i) => {
              const cfg = STATUS_CONFIG[p.status];
              const bgColor = dark ? cfg.darkBg : cfg.bg;
              return (
                <div key={p.alunoId} style={{
                  display: "grid", gridTemplateColumns: "44px 1fr 120px 140px",
                  alignItems: "center", padding: "10px 14px", borderRadius: 12,
                  background: T.card, border: `1.5px solid ${cfg.color}20`,
                  boxShadow: `0 1px 3px ${T.shadow}`,
                  animation: `fadeUp 0.3s ease ${i * 30}ms both`,
                  transition: "all 0.15s",
                }}>
                  {/* Index */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{i + 1}</span>

                  {/* Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: bgColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: cfg.color, flexShrink: 0,
                    }}>
                      {p.nome.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>{p.nome}</span>
                  </div>

                  {/* Matrícula */}
                  <span style={{ fontSize: 12, color: T.secondary }}>{p.matricula}</span>

                  {/* Status toggle */}
                  <button
                    onClick={() => toggleStatus(p.alunoId)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                      border: `1.5px solid ${cfg.color}40`,
                      background: bgColor, color: cfg.color,
                      fontWeight: 700, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{cfg.icon}</span>
                    {cfg.label}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {presencas.length > 0 && (
        <div style={{
          background: T.card, borderTop: `1px solid ${T.border}`, padding: "12px 28px",
          display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0,
        }}>
          <button onClick={exportar} style={{
            padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`,
            background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 13,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            📊 Exportar Excel
          </button>
          <button onClick={salvar} disabled={saving || !dirty} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: dirty ? T.indigo : T.muted,
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: dirty ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: 6,
            opacity: saving ? 0.6 : 1, transition: "all 0.2s",
          }}>
            {saving ? "Salvando..." : "💾 Salvar Chamada"}
          </button>
        </div>
      )}
    </div>
  );
}
