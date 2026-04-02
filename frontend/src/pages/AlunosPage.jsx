import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: Criar / Editar Aluno
// ═══════════════════════════════════════════════════════════════════════════════
function AlunoModal({ T, aluno, turmaId, onClose, onSaved }) {
  const editing = !!aluno;
  const [form, setForm] = useState({
    nomeCompleto: aluno?.nome_completo || "",
    matricula: aluno?.matricula || "",
    email: aluno?.email || "",
    dataNascimento: aluno?.data_nascimento?.slice(0, 10) || "",
    responsavelNome: aluno?.responsavel_nome || "",
    responsavelTelefone: aluno?.responsavel_telefone || "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nomeCompleto.trim() || !form.matricula.trim() || !form.email.trim()) {
      return toast("Nome, matrícula e email são obrigatórios.", "error");
    }
    setLoading(true);
    try {
      const url = editing
        ? `${API}/api/turmas/${turmaId}/alunos/${aluno.id}`
        : `${API}/api/turmas/${turmaId}/alunos`;
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
      toast(err.message || "Erro ao salvar aluno.", "error");
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
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 20, padding: "28px 30px", width: 480, maxWidth: "92vw", boxShadow: `0 8px 40px ${T.shadowMd}`, animation: "fadeUp 0.25s ease" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif" }}>
          {editing ? "Editar Aluno" : "Adicionar Aluno"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input style={inputStyle} value={form.nomeCompleto} onChange={(e) => set("nomeCompleto", e.target.value)} placeholder="Ex: Ana Beatriz Silva" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Matrícula *</label>
              <input style={inputStyle} value={form.matricula} onChange={(e) => set("matricula", e.target.value)} placeholder="Ex: 2026001" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" style={inputStyle} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="aluno@escola.edu.br" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Data de nascimento</label>
            <input type="date" style={inputStyle} value={form.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Nome do responsável</label>
              <input style={inputStyle} value={form.responsavelNome} onChange={(e) => set("responsavelNome", e.target.value)} placeholder="Maria Silva" />
            </div>
            <div>
              <label style={labelStyle}>Telefone do responsável</label>
              <input style={inputStyle} value={form.responsavelTelefone} onChange={(e) => set("responsavelTelefone", e.target.value)} placeholder="(11) 99999-0000" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={loading} style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: T.indigo, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Salvando..." : editing ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ConfirmDialog
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
// AlunosPage
// ═══════════════════════════════════════════════════════════════════════════════
export default function AlunosPage() {
  const { T } = useTheme();
  const { turmaId } = useParams();
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [maxAlunos, setMaxAlunos] = useState(30);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchAlunos = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API}/api/turmas/${turmaId}/alunos${search ? `?busca=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAlunos(data.alunos);
      setMaxAlunos(data.maxAlunos);
    } catch {
      toast("Erro ao carregar alunos.", "error");
    } finally {
      setLoading(false);
    }
  }, [turmaId, search]);

  useEffect(() => { fetchAlunos(); }, [fetchAlunos]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/turmas/${turmaId}/alunos/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast(data.message);
      setDeleting(null);
      fetchAlunos();
    } catch (err) {
      toast(err.message || "Erro ao remover aluno.", "error");
    }
  };

  const initials = (name) => name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: "'DM Sans',sans-serif" }}>

      {/* Header */}
      <header style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/turmas")} style={{
            padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
            background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 12,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            ← Voltar
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif", letterSpacing: -0.5 }}>
              Alunos 👨‍🎓
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: T.muted, marginTop: 2 }}>
              {alunos.length}/{maxAlunos} alunos cadastrados
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou matrícula..."
            style={{
              padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
              background: T.input, color: T.primary, fontSize: 13, outline: "none", width: 220,
              fontFamily: "'DM Sans',sans-serif",
            }}
          />
          <button onClick={() => setModal("new")} disabled={alunos.length >= maxAlunos} style={{
            padding: "9px 20px", borderRadius: 10, border: "none", background: T.indigo,
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            opacity: alunos.length >= maxAlunos ? 0.5 : 1,
          }}>
            <span style={{ fontSize: 16 }}>+</span> Adicionar
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: T.muted, fontSize: 13 }}>Carregando alunos...</div>
        ) : alunos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🎓</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.primary, marginBottom: 4 }}>
              {search ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              {search ? "Tente outro termo de busca." : "Clique em \"Adicionar\" para começar."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alunos.map((a, i) => (
              <div key={a.id} style={{
                background: T.card, borderRadius: 14, padding: "14px 18px",
                boxShadow: `0 1px 4px ${T.shadow}`, display: "flex", alignItems: "center", gap: 14,
                animation: `fadeUp 0.3s ease ${i * 40}ms both`, transition: "transform 0.15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
              >
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: T.indigoBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: T.indigoText, flexShrink: 0,
                }}>
                  {initials(a.nome_completo)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{a.nome_completo}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    Mat. {a.matricula} · {a.email}
                  </div>
                </div>

                {/* Responsável */}
                {a.responsavel_nome && (
                  <div style={{ fontSize: 10, color: T.secondary, textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 600 }}>{a.responsavel_nome}</div>
                    {a.responsavel_telefone && <div style={{ color: T.muted }}>{a.responsavel_telefone}</div>}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setModal(a)} style={{
                    padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                    background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 11, cursor: "pointer",
                  }}>
                    ✎
                  </button>
                  <button onClick={() => setDeleting(a)} style={{
                    padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.rose}30`,
                    background: T.roseBg, color: T.roseText, fontWeight: 700, fontSize: 11, cursor: "pointer",
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
      {modal && (
        <AlunoModal
          T={T} turmaId={turmaId}
          aluno={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAlunos(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          T={T}
          title="Remover Aluno"
          message={`Tem certeza que deseja remover "${deleting.nome_completo}"? As presenças registradas serão perdidas.`}
          onConfirm={() => handleDelete(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
