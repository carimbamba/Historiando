import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ImportadorTurmaModal from "../components/ImportadorTurmaModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SERIES_LABELS = {
  "6_fund": "6º Ano (Fund.)",  "7_fund": "7º Ano (Fund.)",
  "8_fund": "8º Ano (Fund.)",  "9_fund": "9º Ano (Fund.)",
  "1_medio": "1º Ano (EM)",    "2_medio": "2º Ano (EM)",
  "3_medio": "3º Ano (EM)",
};

const TURNO_LABELS = { matutino: "Matutino", vespertino: "Vespertino", noturno: "Noturno" };

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

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: Criar / Editar Turma
// ═══════════════════════════════════════════════════════════════════════════════
function TurmaModal({ T, turma, onClose, onSaved }) {
  const editing = !!turma;
  const [form, setForm] = useState({
    nome: turma?.nome || "",
    serie: turma?.serie || "6_fund",
    turno: turma?.turno || "matutino",
    maxAlunos: turma?.max_alunos || 30,
    descricao: turma?.descricao || "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nome.trim()) return toast("Nome da turma é obrigatório.", "error");
    setLoading(true);
    try {
      const url = editing ? `${API}/api/turmas/${turma.id}` : `${API}/api/turmas`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast(data.message);
      onSaved();
    } catch (err) {
      toast(err.message || "Erro ao salvar turma.", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
    background: T.input, color: T.primary, fontSize: 13, fontFamily: "'DM Sans',sans-serif",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: T.secondary, marginBottom: 4, display: "block" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 20, padding: "28px 30px", width: 440, maxWidth: "92vw", boxShadow: `0 8px 40px ${T.shadowMd}`, animation: "fadeUp 0.25s ease" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif" }}>
          {editing ? "Editar Turma" : "Nova Turma"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome da turma *</label>
            <input style={inputStyle} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: 9º Ano A" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Série</label>
              <select style={inputStyle} value={form.serie} onChange={(e) => set("serie", e.target.value)}>
                {Object.entries(SERIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Turno</label>
              <select style={inputStyle} value={form.turno} onChange={(e) => set("turno", e.target.value)}>
                {Object.entries(TURNO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Máximo de alunos (1–50)</label>
            <input type="number" min={1} max={50} style={inputStyle} value={form.maxAlunos} onChange={(e) => set("maxAlunos", +e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Descrição (opcional)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Observações sobre a turma..." />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={loading} style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: T.indigo, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Salvando..." : editing ? "Salvar" : "Criar Turma"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Confirm Delete Dialog
// ═══════════════════════════════════════════════════════════════════════════════
function ConfirmDialog({ T, title, message, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 18, padding: "24px 28px", width: 380, maxWidth: "90vw", boxShadow: `0 8px 40px ${T.shadowMd}`, animation: "fadeUp 0.2s ease" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: T.roseText, fontFamily: "'Syne',sans-serif" }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: T.secondary, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: T.rose, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TurmasPage
// ═══════════════════════════════════════════════════════════════════════════════
export default function TurmasPage() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | turmaObj
  const [showImportador, setShowImportador] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchTurmas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/turmas`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTurmas(data.turmas);
    } catch {
      toast("Erro ao carregar turmas.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTurmas(); }, [fetchTurmas]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/turmas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast(data.message);
      setDeleting(null);
      fetchTurmas();
    } catch (err) {
      toast(err.message || "Erro ao remover turma.", "error");
    }
  };

  const filtered = turmas.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    SERIES_LABELS[t.serie]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: "'DM Sans',sans-serif" }}>

      {/* Header */}
      <header style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif", letterSpacing: -0.5 }}>
            Minhas Turmas 📋
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: T.muted, marginTop: 2 }}>
            {turmas.length} turma{turmas.length !== 1 ? "s" : ""} cadastrada{turmas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar turma..."
            style={{
              padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
              background: T.input, color: T.primary, fontSize: 13, outline: "none", width: 200,
              fontFamily: "'DM Sans',sans-serif",
            }}
          />
          <button onClick={() => setShowImportador(true)} style={{
            padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${T.indigo}40`, background: "transparent",
            color: T.indigo, fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>📥</span> Importar
          </button>
          <button onClick={() => setModal("new")} style={{
            padding: "9px 20px", borderRadius: 10, border: "none", background: T.indigo,
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>+</span> Nova Turma
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: T.muted, fontSize: 13 }}>Carregando turmas...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.primary, marginBottom: 4 }}>
              {search ? "Nenhuma turma encontrada" : "Nenhuma turma cadastrada"}
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              {search ? "Tente outro termo de busca." : "Clique em \"Nova Turma\" para começar."}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map((t, i) => (
              <div key={t.id} style={{
                background: T.card, borderRadius: 16, padding: "20px 22px",
                boxShadow: `0 1px 6px ${T.shadow}`, position: "relative", overflow: "hidden",
                animation: `fadeUp 0.4s ease ${i * 60}ms both`, transition: "transform 0.18s, box-shadow 0.18s",
                cursor: "pointer", border: `1.5px solid transparent`,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = T.indigo + "40"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                {/* Decorative corner */}
                <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, borderRadius: "0 16px 0 100%", background: T.indigoBg, opacity: 0.5 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif" }}>{t.nome}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {SERIES_LABELS[t.serie]} · {TURNO_LABELS[t.turno]}
                    </div>
                  </div>
                  <div style={{
                    background: T.indigoBg, borderRadius: 8, padding: "3px 10px",
                    fontSize: 11, fontWeight: 700, color: T.indigoText,
                  }}>
                    {t.total_alunos}/{t.max_alunos}
                  </div>
                </div>

                {t.descricao && (
                  <p style={{ fontSize: 11, color: T.secondary, margin: "0 0 12px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {t.descricao}
                  </p>
                )}

                {/* Capacity bar */}
                <div style={{ height: 4, borderRadius: 99, background: T.border, marginBottom: 14 }}>
                  <div style={{
                    height: "100%", borderRadius: 99, transition: "width 0.5s",
                    width: `${Math.min((t.total_alunos / t.max_alunos) * 100, 100)}%`,
                    background: t.total_alunos >= t.max_alunos ? T.rose : T.indigo,
                  }} />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => navigate(`/turmas/${t.id}/alunos`)} style={{
                    flex: 1, padding: "8px", borderRadius: 9, border: `1.5px solid ${T.indigo}30`,
                    background: T.indigoBg, color: T.indigoText, fontWeight: 700, fontSize: 11,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    Entrar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setModal(t); }} style={{
                    padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.border}`,
                    background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 11,
                    cursor: "pointer",
                  }}>
                    ✎
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleting(t); }} style={{
                    padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.rose}30`,
                    background: T.roseBg, color: T.roseText, fontWeight: 700, fontSize: 11,
                    cursor: "pointer",
                  }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showImportador && (
        <ImportadorTurmaModal
          onClose={() => setShowImportador(false)}
          onSaved={() => { setShowImportador(false); fetchTurmas(); }}
        />
      )}
      {modal && (
        <TurmaModal
          T={T}
          turma={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchTurmas(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          T={T}
          title="Remover Turma"
          message={`Tem certeza que deseja remover "${deleting.nome}"? Todos os alunos e presenças desta turma serão perdidos.`}
          onConfirm={() => handleDelete(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
