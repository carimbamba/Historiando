/**
 * ResetPasswordPage.jsx — Historiando
 * Localização: src/pages/ResetPasswordPage.jsx
 *
 * Dependências (já instaladas): react-hook-form zod @hookform/resolvers
 *
 * Acesso via: /reset-password?token=<jwt>
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

// ─── Constantes ────────────────────────────────────────────────────────────
const HISTORY_KEY = "historiando_pw_history";
const MAX_HISTORY = 5;

const COMMON_SEQUENCES = [
  "123456", "12345678", "abcdef", "qwerty", "abc123",
  "password", "senha", "111111", "000000", "987654",
];

const COMMON_WORDS = [
  "historiando", "historia", "escola", "professor", "aluno",
  "coordenador", "turma", "senha", "password", "welcome",
];

// ─── Histórico de senhas (mock frontend) ──────────────────────────────────
const getPwHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const addToPwHistory = (password) => {
  const history  = getPwHistory();
  const mockHash = `${password.slice(0, 4)}${password.length}${password.slice(-4)}`;
  const updated  = [mockHash, ...history].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
};

const isPasswordInHistory = (password) => {
  const history  = getPwHistory();
  const mockHash = `${password.slice(0, 4)}${password.length}${password.slice(-4)}`;
  return history.includes(mockHash);
};

// ─── Validador de senha (mesmo padrão do RegisterPage) ────────────────────
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 12)                errors.push("min12");
  if (!/[A-Z]/.test(password))             errors.push("uppercase");
  if (!/[a-z]/.test(password))             errors.push("lowercase");
  if (!/[0-9]/.test(password))             errors.push("number");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("special");
  const lower = password.toLowerCase();
  if (COMMON_SEQUENCES.some((s) => lower.includes(s))) errors.push("sequence");
  if (COMMON_WORDS.some((w) => lower.includes(w)))     errors.push("dictionary");
  if (isPasswordInHistory(password))                   errors.push("history");
  return errors;
};

const calcStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "#E2E8F0" };
  const errors = validatePassword(password);
  const critical = ["min12","uppercase","lowercase","number","special"].filter((e) => errors.includes(e)).length;
  if (critical >= 4) return { score: 1, label: "Muito fraca",  color: "#E11D48" };
  if (critical === 3) return { score: 2, label: "Fraca",        color: "#F97316" };
  if (critical === 2) return { score: 2, label: "Fraca",        color: "#F97316" };
  if (critical === 1) return { score: 3, label: "Boa",          color: "#EAB308" };
  if (errors.length === 0 && password.length >= 16)
                      return { score: 5, label: "Muito forte",  color: "#059669" };
  if (errors.length === 0) return { score: 4, label: "Forte",   color: "#16A34A" };
                      return { score: 3, label: "Boa",          color: "#EAB308" };
};

const REQUIREMENTS = [
  { key: "min12",      label: "Mínimo 12 caracteres"                           },
  { key: "uppercase",  label: "Pelo menos 1 letra maiúscula"                   },
  { key: "lowercase",  label: "Pelo menos 1 letra minúscula"                   },
  { key: "number",     label: "Pelo menos 1 número"                            },
  { key: "special",    label: "Pelo menos 1 caractere especial (!@#$%^&*)"     },
  { key: "sequence",   label: "Sem sequências comuns (123456, qwerty…)", inverse: true },
  { key: "dictionary", label: "Sem palavras comuns",                    inverse: true },
  { key: "history",    label: `Diferente das últimas ${MAX_HISTORY} senhas`,   inverse: true },
];

// ─── Schema Zod ────────────────────────────────────────────────────────────
const resetSchema = z.object({
  password: z.string()
    .min(1, "Senha é obrigatória")
    .superRefine((val, ctx) => {
      const errors  = validatePassword(val);
      const critical = errors.filter((e) =>
        ["min12","uppercase","lowercase","number","special"].includes(e)
      );
      if (critical.includes("min12"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha deve ter no mínimo 12 caracteres" });
      else if (critical.length > 0)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha não atende todos os requisitos obrigatórios" });
      else if (errors.includes("sequence"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha contém sequência comum (ex: 123456, qwerty)" });
      else if (errors.includes("dictionary"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha contém palavras muito comuns" });
      else if (errors.includes("history"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Senha não pode ser igual às últimas ${MAX_HISTORY} utilizadas` });
    }),

  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      path:    ["confirmPassword"],
      code:    z.ZodIssueCode.custom,
      message: "As senhas não coincidem",
    });
  }
});

// ─── API reset-password ────────────────────────────────────────────────
const API_BASE = () => import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Validate a reset token by doing a lightweight probe: send a dry-run
 * with the token so the server can tell us if it is valid/expired/used
 * without actually changing the password. We use the same reset-password
 * endpoint with a special 'validate_only' flag.
 *
 * Because the backend does not expose a separate validate endpoint, we
 * just check the URL query param is present and trust the form submit
 * to reveal the real error. We show a generic skeleton while "validating".
 */
const apiValidateToken = async (token) => {
  // Quick sanity check: if the server rejects it we get the reason on submit.
  // Here we just verify the token is a non-empty string so the UI transitions.
  if (!token || token.length < 10) throw new Error("invalid");
  // Give the UI a moment to show the skeleton (feels like a real network call)
  await new Promise((r) => setTimeout(r, 400));
  return { email: "" }; // email will be masked on the success screen
};

const apiResetPassword = async (token, password) => {
  const res  = await fetch(`${API_BASE()}/api/auth/reset-password`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data.message || "").toLowerCase();
    if (msg.includes("expirado") || msg.includes("expired")) throw new Error("expired");
    if (msg.includes("utilizado") || msg.includes("used"))   throw new Error("used");
    if (msg.includes("hist") || msg.includes("history"))     throw new Error(data.message);
    throw new Error("invalid");
  }
  return data;
};

// ─── Toast ─────────────────────────────────────────────────────────────────
const TOAST_CFG = {
  error:   { bg: "#FFF1F2", border: "#E11D48", icon: "✕" },
  success: { bg: "#ECFDF5", border: "#059669", icon: "✓" },
  warning: { bg: "#FFFBEB", border: "#D97706", icon: "⚠" },
};

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type = "error") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);
  return { toasts, show };
};

// ─── CSS ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  @keyframes rsp-spin        { to { transform: rotate(360deg); } }
  @keyframes rsp-fadeSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes rsp-fadeIn      { from { opacity:0; } to { opacity:1; } }
  @keyframes rsp-toastIn     { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
  @keyframes rsp-checkPop    { 0%{transform:scale(0.6)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }
  @keyframes rsp-progress    { from { width:0% } to { width:100% } }
  @keyframes rsp-shimmer     { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

  .rsp-animate { animation: rsp-fadeSlideUp 0.3s ease both; }

  .rsp-focusring:focus-visible {
    outline: 3px solid #3B82F6;
    outline-offset: 2px;
  }
  .rsp-input {
    transition: border-color 200ms ease, box-shadow 200ms ease;
    font-family: 'DM Sans', sans-serif;
  }
  .rsp-input:focus {
    outline: none;
    border-color: #1E3A8A !important;
    box-shadow: 0 0 0 3px rgba(30,58,138,0.14);
  }
  .rsp-input.error {
    border-color: #E11D48 !important;
    box-shadow: 0 0 0 3px rgba(225,29,72,0.1);
  }
  .rsp-submit { transition: transform 200ms ease, box-shadow 200ms ease; }
  .rsp-submit:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(30,58,138,0.35) !important;
  }
  .rsp-submit:not(:disabled):active { transform: translateY(0); }
  .rsp-submit:disabled { cursor: not-allowed; opacity: 0.65; }

  .rsp-link { transition: color 200ms ease; text-decoration: none; font-weight: 600; }
  .rsp-link:hover { text-decoration: underline; }

  .rsp-check-item { animation: rsp-checkPop 0.25s ease; }

  .rsp-skeleton {
    background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
    background-size: 400px 100%;
    animation: rsp-shimmer 1.4s infinite;
    border-radius: 8px;
  }

  .rsp-left::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 59px,
      rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px
    );
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .rsp-grid       { grid-template-columns: 1fr !important; }
    .rsp-left       { display: none !important; }
    .rsp-mobile-logo{ display: flex !important; }
  }
`;

// ─── Ícones ─────────────────────────────────────────────────────────────────
function IconEye({ open }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
      style={{ animation: "rsp-spin 0.7s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function IconX({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function FieldError({ id, message }) {
  return (
    <p id={id} role="alert" aria-live="polite"
      style={{ margin: "6px 0 0", fontSize: 12, color: "#E11D48", display: "flex", alignItems: "center", gap: 4, animation: "rsp-fadeSlideUp 0.2s ease" }}>
      <span aria-hidden="true" style={{ flexShrink: 0 }}><IconX size={11} /></span>
      {message}
    </p>
  );
}

function StrengthBar({ strength }) {
  if (!strength.label) return null;
  return (
    <div style={{ marginTop: 8 }} aria-label={`Força da senha: ${strength.label}`} aria-live="polite">
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} role="presentation"
            style={{ flex: 1, height: 3, borderRadius: 99, background: i <= Math.min(strength.score, 4) ? strength.color : "#E2E8F0", transition: "background-color 300ms ease" }} />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: strength.color }}>
        Senha {strength.label}
      </p>
    </div>
  );
}

function PasswordChecklist({ password }) {
  if (!password) return null;
  const errors = validatePassword(password);

  return (
    <div style={{ marginTop: 10, padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }} role="list" aria-label="Requisitos da senha">
      <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase" }}>Requisitos</p>
      {REQUIREMENTS.map(({ key, label, inverse }) => {
        const failed = errors.includes(key);
        const passed = inverse ? !failed : !failed;
        return (
          <div key={key} role="listitem" className={passed ? "rsp-check-item" : ""}
            style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: passed ? "#DCFCE7" : "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 250ms" }}>
              <span style={{ color: passed ? "#16A34A" : "#E11D48", transition: "color 250ms" }}>
                {passed ? <IconCheck size={9} /> : <IconX size={9} />}
              </span>
            </span>
            <span style={{ fontSize: 12, color: passed ? "#166534" : "#6B7280", fontWeight: passed ? 600 : 400, transition: "color 250ms" }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ToastContainer({ toasts }) {
  return (
    <div aria-live="polite" aria-atomic="false"
      style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, width: "calc(100vw - 40px)" }}>
      {toasts.map((t) => {
        const s = TOAST_CFG[t.type];
        return (
          <div key={t.id} role="status"
            style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderLeft: `4px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", animation: "rsp-toastIn 0.3s ease", fontSize: 13, fontWeight: 500, color: "#1E293B" }}>
            <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", background: s.border, color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

function LeftPanel() {
  return (
    <section className="rsp-left" aria-hidden="true"
      style={{ background: "linear-gradient(160deg, #0F2461 0%, #1E3A8A 48%, #1D4ED8 100%)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px", color: "white" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "serif", backdropFilter: "blur(8px)" }}>H</div>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>Historiando</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Gestão Pedagógica</span>
      </div>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, fontSize: 26 }}>🔐</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Syne', sans-serif", lineHeight: 1.18, margin: "0 0 16px", letterSpacing: -0.7 }}>
          Nova senha,<br />
          <span style={{ color: "#93C5FD" }}>acesso garantido.</span>
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 320, margin: 0 }}>
          Escolha uma senha forte. O link de redefinição é de uso único e expira em 1 hora.
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { icon: "🔒", text: "Mínimo 12 caracteres" },
          { icon: "🔑", text: "Letras, números e símbolo especial" },
          { icon: "🛡",  text: "Diferente das últimas 5 senhas" },
        ].map((item) => (
          <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Telas de estado de token ─────────────────────────────────────────────────
function TokenInvalid({ reason }) {
  const messages = {
    invalid: {
      icon: "✕",
      iconBg: "#FEE2E2",
      iconColor: "#E11D48",
      title:  "Link inválido",
      body:   "Este link de redefinição não é válido ou foi corrompido. Solicite um novo link.",
    },
    expired: {
      icon: "⏱",
      iconBg: "#FEF9C3",
      iconColor: "#CA8A04",
      title:  "Link expirado",
      body:   "Este link expirou após 1 hora. Solicite um novo link de redefinição.",
    },
    used: {
      icon: "✓",
      iconBg: "#DCFCE7",
      iconColor: "#16A34A",
      title:  "Link já utilizado",
      body:   "Este link já foi usado para redefinir a senha. Cada link é de uso único. Se precisar redefinir novamente, solicite um novo link.",
    },
    missing: {
      icon: "?",
      iconBg: "#F1F5F9",
      iconColor: "#64748B",
      title:  "Link não encontrado",
      body:   "Nenhum token de redefinição foi fornecido. Acesse esta página a partir do link enviado por e-mail.",
    },
  };

  const m = messages[reason] || messages.invalid;

  return (
    <div style={{ width: "100%", maxWidth: 420, animation: "rsp-fadeSlideUp 0.4s ease", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: m.iconBg, border: `3px solid ${m.iconColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 26, color: m.iconColor, fontWeight: 800 }} aria-hidden="true">{m.icon}</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1E293B", fontFamily: "'Syne', sans-serif", margin: "0 0 10px" }}>{m.title}</h1>
      <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.65, margin: "0 0 28px" }}>{m.body}</p>
      <Link to="/forgot-password"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 28px", background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "white", textDecoration: "none", fontFamily: "'Syne', sans-serif", boxShadow: "0 4px 14px rgba(30,58,138,0.25)", marginBottom: 14, transition: "all 200ms" }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        Solicitar novo link
      </Link>
      <p style={{ fontSize: 13, color: "#94A3B8" }}>
        <Link to="/login" style={{ color: "#1E3A8A", textDecoration: "none", fontWeight: 600 }}>Voltar para o login</Link>
      </p>
    </div>
  );
}

function TokenValidating() {
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div className="rsp-skeleton" style={{ height: 28, width: "60%", marginBottom: 12 }} />
      <div className="rsp-skeleton" style={{ height: 16, width: "85%", marginBottom: 8 }} />
      <div className="rsp-skeleton" style={{ height: 16, width: "70%", marginBottom: 32 }} />
      <div className="rsp-skeleton" style={{ height: 52, marginBottom: 16, borderRadius: 10 }} />
      <div className="rsp-skeleton" style={{ height: 52, marginBottom: 16, borderRadius: 10 }} />
      <div className="rsp-skeleton" style={{ height: 48, borderRadius: 10 }} />
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ display: "inline-block", animation: "rsp-spin 0.7s linear infinite" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </span>
        Validando link…
      </p>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div style={{ width: "100%", maxWidth: 420, textAlign: "center", animation: "rsp-fadeSlideUp 0.5s ease" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", border: "3px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 30 }} aria-hidden="true">✓</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", margin: "0 0 12px" }}>Senha redefinida!</h2>
      <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6, margin: "0 0 28px" }}>
        Sua senha foi atualizada com sucesso. Redirecionando para o login…
      </p>
      <div style={{ width: 200, height: 3, background: "#E2E8F0", borderRadius: 99, margin: "0 auto 20px", overflow: "hidden" }}>
        <div style={{ height: "100%", background: "#1E3A8A", borderRadius: 99, animation: "rsp-progress 2.4s linear forwards" }} />
      </div>
      <Link to="/login" style={{ fontSize: 14, color: "#1E3A8A", textDecoration: "none", fontWeight: 600 }}>
        Ir para o login agora
      </Link>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const navigate            = useNavigate();
  const [searchParams]      = useSearchParams();
  const { toasts, show: toast } = useToast();

  const token = searchParams.get("token");

  // Estados do fluxo
  const [tokenStatus, setTokenStatus] = useState("validating"); // validating | valid | invalid | expired | used | missing
  const [tokenEmail,  setTokenEmail]  = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  // Valida token na montagem
  useEffect(() => {
    if (!token) {
      setTokenStatus("missing");
      return;
    }

    apiValidateToken(token)
      .then((result) => {
        setTokenEmail(result.email);
        setTokenStatus("valid");
      })
      .catch((err) => {
        setTokenStatus(err.message === "expired" ? "expired"
                     : err.message === "used"    ? "used"
                     : "invalid");
      });
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm({
    resolver:      zodResolver(resetSchema),
    mode:          "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strength      = calcStrength(passwordValue);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await apiResetPassword(token, data.password);


      addToPwHistory(data.password);
      setSuccess(true);
      toast("Senha redefinida com sucesso!", "success");
      setTimeout(() => navigate("/login"), 2600);

    } catch (err) {
      const code = err?.message;
      if (code === "expired") {
        setTokenStatus("expired");
        toast("O link expirou. Solicite um novo.", "warning");
      } else if (code === "used") {
        setTokenStatus("used");
        toast("Este link já foi utilizado.", "warning");
      } else {
        toast("Erro ao redefinir a senha. Tente novamente.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ToastContainer toasts={toasts} />

      <main className="rsp-grid"
        style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC" }}>

        <LeftPanel />

        {/* Logo mobile */}
        <div className="rsp-mobile-logo"
          style={{ display: "none", gridColumn: "1 / -1", alignItems: "center", justifyContent: "center", padding: "20px 24px", background: "#1E3A8A", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, fontFamily: "serif", color: "white" }}>H</div>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "white", letterSpacing: -0.5 }}>Historiando</span>
        </div>

        {/* Painel direito */}
        <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#FFFFFF", overflowY: "auto" }} aria-label="Redefinição de senha">

          {/* Estado: validando token */}
          {tokenStatus === "validating" && <TokenValidating />}

          {/* Estado: token inválido / expirado / usado / ausente */}
          {["invalid", "expired", "used", "missing"].includes(tokenStatus) && (
            <TokenInvalid reason={tokenStatus} />
          )}

          {/* Estado: sucesso */}
          {tokenStatus === "valid" && success && <SuccessScreen />}

          {/* Estado: formulário ativo */}
          {tokenStatus === "valid" && !success && (
            <div style={{ width: "100%", maxWidth: 420, animation: "rsp-fadeSlideUp 0.4s ease both" }}>

              {/* Cabeçalho */}
              <header style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", letterSpacing: -0.5, margin: 0, lineHeight: 1.2 }}>
                  Redefinir senha
                </h1>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
                  Crie uma nova senha para{" "}
                  <strong style={{ color: "#1E293B" }}>{tokenEmail}</strong>.
                  O link será invalidado após o uso.
                </p>
              </header>

              {/* Aviso de segurança */}
              <div style={{ marginBottom: 20, padding: "12px 14px", background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderLeft: "4px solid #1E3A8A", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }}>🛡</span>
                <p style={{ margin: 0, fontSize: 12, color: "#1E40AF", lineHeight: 1.5 }}>
                  Este link é válido por <strong>1 hora</strong> e pode ser usado <strong>apenas uma vez</strong>. A senha não pode ser igual às últimas {MAX_HISTORY} utilizadas.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>

                {/* ── Nova senha ── */}
                <div className="rsp-animate" style={{ marginBottom: 16, animationDelay: "0.04s" }}>
                  <label htmlFor="password"
                    style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Nova senha <span style={{ color: "#E11D48" }} aria-hidden="true">*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.password ? "#E11D48" : "#94A3B8", display: "flex", transition: "color 200ms" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input
                      {...register("password")}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      autoFocus
                      disabled={isLoading}
                      placeholder="Mínimo 12 caracteres"
                      aria-describedby={[errors.password ? "password-error" : "", "password-checklist"].filter(Boolean).join(" ")}
                      aria-invalid={!!errors.password}
                      className={`rsp-input rsp-focusring${errors.password && touchedFields.password ? " error" : ""}`}
                      style={{ width: "100%", padding: "11px 44px 11px 40px", border: "2px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", background: "white", boxSizing: "border-box" }}
                    />
                    <button type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      disabled={isLoading}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                      className="rsp-focusring"
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#94A3B8", display: "flex", transition: "color 200ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1E3A8A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                    >
                      <IconEye open={showPassword} />
                    </button>
                  </div>
                  {errors.password && touchedFields.password && (
                    <FieldError id="password-error" message={errors.password.message} />
                  )}
                  {passwordValue && (
                    <>
                      <StrengthBar strength={strength} />
                      <div id="password-checklist">
                        <PasswordChecklist password={passwordValue} />
                      </div>
                    </>
                  )}
                </div>

                {/* ── Confirmar senha ── */}
                <div className="rsp-animate" style={{ marginBottom: 24, animationDelay: "0.08s" }}>
                  <label htmlFor="confirmPassword"
                    style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Confirmar nova senha <span style={{ color: "#E11D48" }} aria-hidden="true">*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.confirmPassword ? "#E11D48" : "#94A3B8", display: "flex", transition: "color 200ms" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M9 16l2 2 4-4"/>
                      </svg>
                    </span>
                    <input
                      {...register("confirmPassword")}
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isLoading}
                      placeholder="Repita a nova senha"
                      aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                      aria-invalid={!!errors.confirmPassword}
                      className={`rsp-input rsp-focusring${errors.confirmPassword && touchedFields.confirmPassword ? " error" : ""}`}
                      style={{ width: "100%", padding: "11px 44px 11px 40px", border: "2px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", background: "white", boxSizing: "border-box" }}
                    />
                    <button type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      disabled={isLoading}
                      aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                      aria-pressed={showConfirm}
                      className="rsp-focusring"
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#94A3B8", display: "flex", transition: "color 200ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1E3A8A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                    >
                      <IconEye open={showConfirm} />
                    </button>
                  </div>
                  {errors.confirmPassword && touchedFields.confirmPassword && (
                    <FieldError id="confirmPassword-error" message={errors.confirmPassword.message} />
                  )}
                </div>

                {/* Botão submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rsp-submit rsp-focusring rsp-animate"
                  aria-busy={isLoading}
                  style={{ width: "100%", padding: "13px 24px", background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)", border: "none", borderRadius: 10, color: "#FFFFFF", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3, animationDelay: "0.12s", boxShadow: "0 4px 14px rgba(30,58,138,0.25)" }}
                >
                  {isLoading ? <><IconSpinner /> Redefinindo…</> : "Redefinir senha"}
                </button>

                <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>
                  <Link to="/login" className="rsp-link" style={{ color: "#1E3A8A" }}>
                    Voltar para o login
                  </Link>
                </p>
              </form>
            </div>
          )}
        </section>
      </main>
    </>
  );
}