/**
 * RegisterPage.jsx — Historiando
 * Localização: src/pages/RegisterPage.jsx
 *
 * Dependências (já instaladas): react-hook-form zod @hookform/resolvers
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";

// ─── Constantes ────────────────────────────────────────────────────────────
const HISTORY_KEY = "historiando_pw_history"; // localStorage — hashes anteriores (mock)
const MAX_HISTORY = 5;

const COMMON_SEQUENCES = [
  "123456", "12345678", "abcdef", "qwerty", "abc123",
  "password", "senha", "111111", "000000", "987654",
];

const COMMON_WORDS = [
  "historiando", "historia", "escola", "professor", "aluno",
  "coordenador", "turma", "senha", "password", "welcome",
];

const RFC5322 =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const PERFIS = [
  { value: "professor",   label: "Professor",            icon: "◉", desc: "Acesso ao painel de sala e ocorrências" },
  { value: "coordenador", label: "Coordenador Pedagógico", icon: "◈", desc: "Acesso a analytics e relatórios"         },
  { value: "aluno",       label: "Aluno",                icon: "⊞", desc: "Acesso ao conteúdo e progresso pessoal"  },
];

// ─── Histórico de senhas (mock frontend) ──────────────────────────────────
// Em produção: o backend valida os hashes das últimas N senhas.
// Aqui simulamos com uma lista de strings "hasheadas" no localStorage.
const getPwHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const addToPwHistory = (password) => {
  const history = getPwHistory();
  // mock "hash": usamos os primeiros 8 chars + length como fingerprint de demonstração
  const mockHash = `${password.slice(0, 4)}${password.length}${password.slice(-4)}`;
  const updated  = [mockHash, ...history].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
};

const isPasswordInHistory = (password) => {
  const history  = getPwHistory();
  const mockHash = `${password.slice(0, 4)}${password.length}${password.slice(-4)}`;
  return history.includes(mockHash);
};

// ─── Validador de senha ────────────────────────────────────────────────────
const validatePassword = (password, username = "", fullName = "") => {
  const errors = [];

  if (password.length < 12)
    errors.push("min12");
  if (!/[A-Z]/.test(password))
    errors.push("uppercase");
  if (!/[a-z]/.test(password))
    errors.push("lowercase");
  if (!/[0-9]/.test(password))
    errors.push("number");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push("special");

  const lower = password.toLowerCase();

  if (COMMON_SEQUENCES.some((seq) => lower.includes(seq)))
    errors.push("sequence");

  if (COMMON_WORDS.some((word) => lower.includes(word)))
    errors.push("dictionary");

  if (username && username.length >= 3 && lower.includes(username.toLowerCase()))
    errors.push("username");

  const nameParts = fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
  if (nameParts.some((part) => lower.includes(part)))
    errors.push("name");

  if (isPasswordInHistory(password))
    errors.push("history");

  return errors;
};

// ─── Força da senha ────────────────────────────────────────────────────────
const calcStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "#E2E8F0" };
  const errors = validatePassword(password);
  const criticalCount = ["min12", "uppercase", "lowercase", "number", "special"]
    .filter((e) => errors.includes(e)).length;

  if (criticalCount === 5) return { score: 1, label: "Muito fraca",  color: "#E11D48" };
  if (criticalCount === 4) return { score: 1, label: "Muito fraca",  color: "#E11D48" };
  if (criticalCount === 3) return { score: 2, label: "Fraca",        color: "#F97316" };
  if (criticalCount === 2) return { score: 2, label: "Fraca",        color: "#F97316" };
  if (criticalCount === 1) return { score: 3, label: "Boa",          color: "#EAB308" };
  if (errors.length === 0 && password.length >= 16)
                           return { score: 5, label: "Muito forte",  color: "#059669" };
  if (errors.length === 0) return { score: 4, label: "Forte",        color: "#16A34A" };
                           return { score: 3, label: "Boa",          color: "#EAB308" };
};

// ─── Checklist de requisitos ───────────────────────────────────────────────
const REQUIREMENTS = [
  { key: "min12",    label: "Mínimo 12 caracteres"         },
  { key: "uppercase",label: "Pelo menos 1 letra maiúscula" },
  { key: "lowercase",label: "Pelo menos 1 letra minúscula" },
  { key: "number",   label: "Pelo menos 1 número"          },
  { key: "special",  label: "Pelo menos 1 caractere especial (!@#$%^&*)" },
  { key: "sequence", label: "Sem sequências comuns (123456, qwerty…)", inverse: true },
  { key: "dictionary",label: "Sem palavras comuns",         inverse: true },
];

// ─── Schema Zod ────────────────────────────────────────────────────────────
const registerSchema = z.object({
  fullName:   z.string()
    .min(3,   "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[A-Za-zÀ-ÿ\s'-]+$/, "Nome deve conter apenas letras"),

  email: z.string()
    .min(1, "E-mail é obrigatório")
    .regex(RFC5322, "Formato de e-mail inválido"),

  username: z.string()
    .min(3,  "Usuário deve ter no mínimo 3 caracteres")
    .max(20, "Usuário deve ter no máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e underscore (_)"),

  password: z.string()
    .min(1, "Senha é obrigatória")
    .superRefine((val, ctx) => {
      const errors = validatePassword(val);
      const criticalErrors = errors.filter((e) =>
        ["min12", "uppercase", "lowercase", "number", "special"].includes(e)
      );
      if (criticalErrors.includes("min12"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha deve ter no mínimo 12 caracteres" });
      else if (criticalErrors.length > 0)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha não atende todos os requisitos obrigatórios" });
      else if (errors.includes("sequence"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha contém sequência comum (ex: 123456, qwerty)" });
      else if (errors.includes("dictionary"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha contém palavras muito comuns" });
      else if (errors.includes("history"))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Senha não pode ser igual às últimas ${MAX_HISTORY} senhas utilizadas` });
    }),

  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),

  perfil: z.enum(["professor", "coordenador", "aluno"], {
    errorMap: () => ({ message: "Selecione um perfil" }),
  }),

  terms: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar os Termos de Serviço para continuar" }),
  }),
}).superRefine((data, ctx) => {
  // Validações cruzadas (precisam de outros campos)
  if (data.password && data.username) {
    const crossErrors = validatePassword(data.password, data.username, data.fullName);
    if (crossErrors.includes("username")) {
      ctx.addIssue({
        path: ["password"],
        code: z.ZodIssueCode.custom,
        message: "Senha não pode conter seu nome de usuário",
      });
    }
    if (crossErrors.includes("name")) {
      ctx.addIssue({
        path: ["password"],
        code: z.ZodIssueCode.custom,
        message: "Senha não pode conter partes do seu nome",
      });
    }
  }
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      path: ["confirmPassword"],
      code: z.ZodIssueCode.custom,
      message: "As senhas não coincidem",
    });
  }
});

// ─── Mock de cadastro ──────────────────────────────────────────────────────
// REMOVA e substitua pela chamada tRPC/fetch em produção
const MOCK_EXISTING_EMAILS    = ["professor@escola.edu.br", "coord@escola.edu.br", "aluno@escola.edu.br"];
const MOCK_EXISTING_USERNAMES = ["prof_marcos", "coord_patricia", "joao_pedro"];

const mockRegister = async ({ fullName, email, username, password, perfil }) => {
  await new Promise((r) => setTimeout(r, 1100));

  if (MOCK_EXISTING_EMAILS.includes(email.toLowerCase()))
    throw new Error("email_exists");
  if (MOCK_EXISTING_USERNAMES.includes(username.toLowerCase()))
    throw new Error("username_exists");

  // Simula sucesso
  return { ok: true, name: fullName.split(" ")[0] };
};

// ─── Mapeamento de erros do servidor ──────────────────────────────────────
const mapServerError = (raw) => {
  if (raw === "email_exists")
    return { field: "email",    message: "Este e-mail já está cadastrado. Faça login ou use outro endereço." };
  if (raw === "username_exists")
    return { field: "username", message: "Este nome de usuário já está em uso. Escolha outro." };
  return { field: null, message: "Erro ao criar conta. Tente novamente em instantes." };
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

  @keyframes rp-spin        { to { transform: rotate(360deg); } }
  @keyframes rp-fadeSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes rp-fadeIn      { from { opacity:0; } to { opacity:1; } }
  @keyframes rp-toastIn     { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
  @keyframes rp-checkPop    { 0%{transform:scale(0.6)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }

  .rp-animate { animation: rp-fadeSlideUp 0.3s ease both; }

  .rp-focusring:focus-visible {
    outline: 3px solid #3B82F6;
    outline-offset: 2px;
  }
  .rp-input {
    transition: border-color 200ms ease, box-shadow 200ms ease;
    font-family: 'DM Sans', sans-serif;
  }
  .rp-input:focus {
    outline: none;
    border-color: #1E3A8A !important;
    box-shadow: 0 0 0 3px rgba(30,58,138,0.14);
  }
  .rp-input.error {
    border-color: #E11D48 !important;
    box-shadow: 0 0 0 3px rgba(225,29,72,0.1);
  }
  .rp-input.success {
    border-color: #16A34A !important;
  }
  .rp-checkbox {
    appearance: none; -webkit-appearance: none;
    width: 18px; height: 18px;
    border: 2px solid #CBD5E1; border-radius: 4px;
    cursor: pointer; flex-shrink: 0;
    transition: all 200ms ease; position: relative; background: white;
  }
  .rp-checkbox:checked { background: #1E3A8A; border-color: #1E3A8A; }
  .rp-checkbox:checked::after {
    content: '';
    position: absolute; left: 4px; top: 1px;
    width: 6px; height: 10px;
    border: 2px solid white; border-top: none; border-left: none;
    transform: rotate(45deg);
  }
  .rp-checkbox:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; }

  .rp-perfil-card {
    border: 2px solid #E2E8F0; border-radius: 10px;
    padding: 12px 14px; cursor: pointer;
    transition: all 200ms ease; background: white;
    display: flex; align-items: flex-start; gap: 10;
    text-align: left; width: 100%;
  }
  .rp-perfil-card:hover { border-color: #93C5FD; background: #F0F7FF; }
  .rp-perfil-card.selected {
    border-color: #1E3A8A; background: #EFF6FF;
    box-shadow: 0 0 0 3px rgba(30,58,138,0.12);
  }
  .rp-perfil-card:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; }

  .rp-submit { transition: transform 200ms ease, box-shadow 200ms ease; }
  .rp-submit:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(30,58,138,0.35) !important;
  }
  .rp-submit:not(:disabled):active { transform: translateY(0); }
  .rp-submit:disabled { cursor: not-allowed; opacity: 0.65; }

  .rp-link { transition: color 200ms ease; text-decoration: none; font-weight: 600; }
  .rp-link:hover { text-decoration: underline; }
  .rp-link:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; border-radius: 2px; }

  .rp-check-item { animation: rp-checkPop 0.25s ease; }

  .rp-left::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 59px,
      rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px
    );
    pointer-events: none;
  }

  @media (max-width: 860px) {
    .rp-grid  { grid-template-columns: 1fr !important; }
    .rp-left  { display: none !important; }
    .rp-mobile-logo { display: flex !important; }
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
      style={{ animation: "rp-spin 0.7s linear infinite" }}>
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
function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {children}
      {required && <span style={{ color: "#E11D48", marginLeft: 3 }} aria-hidden="true">*</span>}
    </label>
  );
}

function FieldError({ id, message }) {
  return (
    <p id={id} role="alert" aria-live="polite"
      style={{ margin: "6px 0 0", fontSize: 12, color: "#E11D48", display: "flex", alignItems: "center", gap: 4, animation: "rp-fadeSlideUp 0.2s ease" }}>
      <span aria-hidden="true" style={{ flexShrink: 0 }}><IconX size={11} /></span>
      {message}
    </p>
  );
}

function InputWrapper({ icon, error, touched, success, children }) {
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: error && touched ? "#E11D48" : success ? "#16A34A" : "#94A3B8", display: "flex", transition: "color 200ms" }}>
          {icon}
        </span>
      )}
      {children}
      {success && !error && (
        <span aria-hidden="true" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#16A34A", display: "flex" }}>
          <IconCheck size={15} />
        </span>
      )}
    </div>
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
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: strength.color, transition: "color 300ms ease" }}>
        Senha {strength.label}
      </p>
    </div>
  );
}

function PasswordChecklist({ password, username, fullName }) {
  if (!password) return null;
  const errors = validatePassword(password, username, fullName);

  return (
    <div style={{ marginTop: 10, padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }} aria-label="Requisitos da senha" role="list">
      <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase" }}>Requisitos</p>
      {REQUIREMENTS.map(({ key, label, inverse }) => {
        const failed  = errors.includes(key);
        const ok      = inverse ? failed  // para "sem sequências": falhar na regex = ok
                               : !failed; // para os demais: não ter erro = ok
        // inversão: "sequence" e "dictionary" são erros quando presentes
        const passed  = inverse ? !failed : !failed;

        return (
          <div key={key} role="listitem" className={passed ? "rp-check-item" : ""}
            style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: passed ? "#DCFCE7" : "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 250ms ease" }}>
              <span style={{ color: passed ? "#16A34A" : "#E11D48", transition: "color 250ms ease" }}>
                {passed ? <IconCheck size={9} /> : <IconX size={9} />}
              </span>
            </span>
            <span style={{ fontSize: 12, color: passed ? "#166534" : "#6B7280", fontWeight: passed ? 600 : 400, transition: "color 250ms ease" }}>
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
            style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderLeft: `4px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", animation: "rp-toastIn 0.3s ease", fontSize: 13, fontWeight: 500, color: "#1E293B" }}>
            <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", background: s.border, color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

function LeftPanel() {
  const steps = [
    { icon: "◉", title: "Crie sua conta",          desc: "Preencha seus dados e escolha seu perfil"  },
    { icon: "✉", title: "Confirme seu e-mail",      desc: "Verifique sua caixa de entrada"            },
    { icon: "⊞", title: "Acesse a plataforma",      desc: "Comece a usar o Historiando imediatamente" },
  ];

  return (
    <section className="rp-left" aria-hidden="true"
      style={{ background: "linear-gradient(160deg, #0F2461 0%, #1E3A8A 48%, #1D4ED8 100%)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px", color: "white" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "serif", backdropFilter: "blur(8px)" }}>H</div>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>Historiando</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Gestão Pedagógica</span>
      </div>

      {/* Headline */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 48 }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "'Syne', sans-serif", lineHeight: 1.18, margin: "0 0 16px", letterSpacing: -0.7 }}>
          Junte-se a<br />
          <span style={{ color: "#93C5FD" }}>2.400+ professores.</span>
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 320, margin: 0 }}>
          Gerencie sua sala, registre ocorrências e acompanhe o progresso de cada aluno em um único lugar.
        </p>
      </div>

      {/* Steps */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
              {step.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate            = useNavigate();
  const { toasts, show: toast } = useToast();

  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [serverError,     setServerError]     = useState(null);
  const [success,         setSuccess]         = useState(false);
  const [emailChecking,   setEmailChecking]   = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, touchedFields, dirtyFields },
  } = useForm({
    resolver:      zodResolver(registerSchema),
    mode:          "onTouched",
    defaultValues: {
      fullName: "", email: "", username: "",
      password: "", confirmPassword: "",
      perfil: undefined, terms: false,
    },
  });

  const passwordValue = watch("password");
  const usernameValue = watch("username");
  const fullNameValue = watch("fullName");
  const perfilValue   = watch("perfil");
  const strength      = calcStrength(passwordValue);

  // Simulação de verificação de e-mail único (debounced)
  const emailValue = watch("email");
  useEffect(() => {
    if (!emailValue || !RFC5322.test(emailValue)) return;
    setEmailChecking(true);
    const timer = setTimeout(() => {
      setEmailChecking(false);
      // Em produção: chamar trpc.auth.checkEmail.useQuery({ email })
    }, 600);
    return () => clearTimeout(timer);
  }, [emailValue]);

  const onSubmit = async (data) => {
    setServerError(null);
    setIsLoading(true);

    try {
      /*
       * ── INTEGRAÇÃO tRPC ──────────────────────────────────────────────
       * await trpc.auth.register.mutateAsync({
       *   fullName:  data.fullName,
       *   email:     data.email,
       *   username:  data.username,
       *   password:  data.password,
       *   perfil:    data.perfil,
       * });
       *
       * ── INTEGRAÇÃO fetch ─────────────────────────────────────────────
       * const res = await fetch("/api/auth/register", {
       *   method: "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body: JSON.stringify({
       *     fullName: data.fullName, email: data.email,
       *     username: data.username, password: data.password,
       *     perfil: data.perfil,
       *   }),
       * });
       * if (!res.ok) { const err = await res.json(); throw new Error(err.code); }
       */
      await mockRegister(data); // ← remover em prod

      addToPwHistory(data.password);
      setSuccess(true);
      toast(`Conta criada com sucesso! Bem-vindo(a), ${data.fullName.split(" ")[0]}.`, "success");
      setTimeout(() => navigate("/login"), 2500);

    } catch (err) {
      const raw     = err instanceof Error ? err.message : "unknown";
      const mapped  = mapServerError(raw);

      if (mapped.field) {
        setError(mapped.field, { type: "server", message: mapped.message });
      } else {
        setServerError(mapped.message);
      }
      toast(mapped.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Campo helper
  const inputClass = (name) => {
    const hasError   = !!errors[name] && !!touchedFields[name];
    const hasSuccess = !errors[name] && !!dirtyFields[name] && !!touchedFields[name];
    return `rp-input rp-focusring${hasError ? " error" : hasSuccess ? " success" : ""}`;
  };

  const baseInputStyle = (disabled = false) => ({
    width: "100%", padding: "11px 12px 11px 40px",
    border: "2px solid #E2E8F0", borderRadius: 10,
    fontSize: 14, color: "#1E293B",
    background: disabled ? "#F8FAFC" : "white",
    boxSizing: "border-box",
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ToastContainer toasts={toasts} />

      <main className="rp-grid"
        style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC" }}>

        <LeftPanel />

        {/* Logo mobile */}
        <div className="rp-mobile-logo"
          style={{ display: "none", gridColumn: "1 / -1", alignItems: "center", justifyContent: "center", padding: "20px 24px", background: "#1E3A8A", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, fontFamily: "serif", color: "white" }}>H</div>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "white", letterSpacing: -0.5 }}>Historiando</span>
        </div>

        {/* Painel do formulário */}
        <section
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px", background: "#FFFFFF", overflowY: "auto" }}
          aria-label="Formulário de cadastro">

          {/* Tela de sucesso */}
          {success ? (
            <div style={{ width: "100%", maxWidth: 420, textAlign: "center", paddingTop: 80, animation: "rp-fadeSlideUp 0.5s ease" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", border: "3px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>✓</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", margin: "0 0 12px" }}>Conta criada!</h2>
              <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6, margin: "0 0 24px" }}>
                Redirecionando para o login em instantes…
              </p>
              <div style={{ width: 200, height: 3, background: "#E2E8F0", borderRadius: 99, margin: "0 auto", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#1E3A8A", borderRadius: 99, animation: "rp-progress 2.4s linear forwards" }} />
              </div>
              <style>{`@keyframes rp-progress { from { width:0% } to { width:100% } }`}</style>
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: 440, animation: "rp-fadeSlideUp 0.4s ease both" }}>

              {/* Cabeçalho */}
              <header style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", letterSpacing: -0.5, margin: 0, lineHeight: 1.2 }}>
                  Criar conta
                </h1>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748B" }}>
                  Preencha os dados abaixo para começar.{" "}
                  <Link to="/login" className="rp-link" style={{ color: "#1E3A8A" }}>Já tem conta?</Link>
                </p>
              </header>

              {/* Erro global */}
              {serverError && (
                <div role="alert" aria-live="assertive"
                  style={{ margin: "0 0 20px", padding: "12px 14px", background: "#FFF1F2", border: "1.5px solid #FECDD3", borderLeft: "4px solid #E11D48", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10, animation: "rp-fadeSlideUp 0.2s ease" }}>
                  <span aria-hidden="true" style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#FEE2E2", border: "1.5px solid #E11D48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#E11D48" }}>!</span>
                  <p style={{ margin: 0, fontSize: 13, color: "#9F1239", lineHeight: 1.5 }}>{serverError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>

                {/* ── Nome completo ── */}
                <div className="rp-animate" style={{ marginBottom: 16, animationDelay: "0.04s" }}>
                  <Label htmlFor="fullName" required>Nome completo</Label>
                  <InputWrapper
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    error={errors.fullName} touched={touchedFields.fullName}
                    success={!errors.fullName && dirtyFields.fullName && touchedFields.fullName}
                  >
                    <input
                      {...register("fullName")}
                      id="fullName" type="text" autoComplete="name"
                      disabled={isLoading} placeholder="Ex: Marcos Pereira da Silva"
                      aria-describedby={errors.fullName ? "fullName-error" : undefined}
                      aria-invalid={!!errors.fullName}
                      className={inputClass("fullName")}
                      style={{ ...baseInputStyle(isLoading), paddingRight: 36 }}
                    />
                  </InputWrapper>
                  {errors.fullName && touchedFields.fullName && (
                    <FieldError id="fullName-error" message={errors.fullName.message} />
                  )}
                </div>

                {/* ── E-mail ── */}
                <div className="rp-animate" style={{ marginBottom: 16, animationDelay: "0.07s" }}>
                  <Label htmlFor="email" required>E-mail institucional</Label>
                  <InputWrapper
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    error={errors.email} touched={touchedFields.email}
                    success={!errors.email && dirtyFields.email && touchedFields.email}
                  >
                    <input
                      {...register("email")}
                      id="email" type="email" autoComplete="email"
                      disabled={isLoading} placeholder="professor@escola.edu.br"
                      aria-describedby={errors.email ? "email-error" : undefined}
                      aria-invalid={!!errors.email}
                      className={inputClass("email")}
                      style={{ ...baseInputStyle(isLoading), paddingRight: 36 }}
                    />
                  </InputWrapper>
                  {errors.email && touchedFields.email && (
                    <FieldError id="email-error" message={errors.email.message} />
                  )}
                </div>

                {/* ── Usuário ── */}
                <div className="rp-animate" style={{ marginBottom: 16, animationDelay: "0.10s" }}>
                  <Label htmlFor="username" required>Nome de usuário</Label>
                  <InputWrapper
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                    error={errors.username} touched={touchedFields.username}
                    success={!errors.username && dirtyFields.username && touchedFields.username}
                  >
                    <input
                      {...register("username")}
                      id="username" type="text" autoComplete="username"
                      disabled={isLoading} placeholder="prof_marcos (3–20 caracteres)"
                      aria-describedby={errors.username ? "username-error" : "username-hint"}
                      aria-invalid={!!errors.username}
                      className={inputClass("username")}
                      style={{ ...baseInputStyle(isLoading), paddingRight: 36 }}
                    />
                  </InputWrapper>
                  {errors.username && touchedFields.username ? (
                    <FieldError id="username-error" message={errors.username.message} />
                  ) : (
                    <p id="username-hint" style={{ margin: "5px 0 0", fontSize: 11, color: "#94A3B8" }}>
                      Letras, números e underscore (_). Mín. 3, máx. 20 caracteres.
                    </p>
                  )}
                </div>

                {/* ── Perfil ── */}
                <div className="rp-animate" style={{ marginBottom: 16, animationDelay: "0.13s" }}>
                  <Label required>Perfil de acesso</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }} role="radiogroup" aria-required="true" aria-label="Selecione o perfil de acesso">
                    {PERFIS.map((p) => {
                      const selected = perfilValue === p.value;
                      return (
                        <label key={p.value}
                          className={`rp-perfil-card rp-focusring${selected ? " selected" : ""}`}
                          style={{ border: `2px solid ${selected ? "#1E3A8A" : "#E2E8F0"}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", background: selected ? "#EFF6FF" : "white", display: "flex", alignItems: "center", gap: 12, transition: "all 200ms", boxShadow: selected ? "0 0 0 3px rgba(30,58,138,0.12)" : "none" }}>
                          <input
                            {...register("perfil")}
                            type="radio" value={p.value}
                            disabled={isLoading}
                            style={{ display: "none" }}
                          />
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: selected ? "#1E3A8A" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "all 200ms" }}>
                            <span style={{ color: selected ? "#fff" : "#64748B" }}>{p.icon}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: selected ? "#1E3A8A" : "#1E293B" }}>{p.label}</div>
                            <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4, marginTop: 1 }}>{p.desc}</div>
                          </div>
                          {selected && (
                            <div style={{ marginLeft: "auto", flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#1E3A8A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <IconCheck size={11} />
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {errors.perfil && touchedFields.perfil && (
                    <FieldError id="perfil-error" message={errors.perfil.message} />
                  )}
                </div>

                {/* Divisor */}
                <div style={{ margin: "20px 0 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: "#F1F5F9" }} />
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Segurança</span>
                  <div style={{ flex: 1, height: 1, background: "#F1F5F9" }} />
                </div>

                {/* ── Senha ── */}
                <div className="rp-animate" style={{ marginBottom: 16, animationDelay: "0.16s" }}>
                  <Label htmlFor="password" required>Senha</Label>
                  <InputWrapper
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                    error={errors.password} touched={touchedFields.password}
                  >
                    <input
                      {...register("password")}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isLoading}
                      placeholder="Mínimo 12 caracteres"
                      aria-describedby={[errors.password ? "password-error" : "", "password-checklist"].filter(Boolean).join(" ")}
                      aria-invalid={!!errors.password}
                      className={inputClass("password")}
                      style={{ ...baseInputStyle(isLoading), paddingRight: 44 }}
                    />
                    <button type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      disabled={isLoading}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                      className="rp-focusring"
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#94A3B8", display: "flex", transition: "color 200ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1E3A8A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                    >
                      <IconEye open={showPassword} />
                    </button>
                  </InputWrapper>
                  {errors.password && touchedFields.password && (
                    <FieldError id="password-error" message={errors.password.message} />
                  )}
                  {passwordValue && (
                    <>
                      <StrengthBar strength={strength} />
                      <div id="password-checklist">
                        <PasswordChecklist
                          password={passwordValue}
                          username={usernameValue}
                          fullName={fullNameValue}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* ── Confirmar senha ── */}
                <div className="rp-animate" style={{ marginBottom: 20, animationDelay: "0.19s" }}>
                  <Label htmlFor="confirmPassword" required>Confirmar senha</Label>
                  <InputWrapper
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M9 16l2 2 4-4"/></svg>}
                    error={errors.confirmPassword} touched={touchedFields.confirmPassword}
                    success={!errors.confirmPassword && !!watch("confirmPassword") && touchedFields.confirmPassword}
                  >
                    <input
                      {...register("confirmPassword")}
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isLoading}
                      placeholder="Repita a senha"
                      aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                      aria-invalid={!!errors.confirmPassword}
                      className={inputClass("confirmPassword")}
                      style={{ ...baseInputStyle(isLoading), paddingRight: 44 }}
                    />
                    <button type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      disabled={isLoading}
                      aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                      aria-pressed={showConfirm}
                      className="rp-focusring"
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#94A3B8", display: "flex", transition: "color 200ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1E3A8A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                    >
                      <IconEye open={showConfirm} />
                    </button>
                  </InputWrapper>
                  {errors.confirmPassword && touchedFields.confirmPassword && (
                    <FieldError id="confirmPassword-error" message={errors.confirmPassword.message} />
                  )}
                </div>

                {/* ── Termos ── */}
                <div className="rp-animate" style={{ marginBottom: 24, animationDelay: "0.22s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <input
                      {...register("terms")}
                      id="terms" type="checkbox"
                      disabled={isLoading}
                      className="rp-checkbox"
                      aria-describedby={errors.terms ? "terms-error" : undefined}
                      aria-invalid={!!errors.terms}
                      style={{ marginTop: 2 }}
                    />
                    <label htmlFor="terms" style={{ fontSize: 13, color: "#374151", cursor: "pointer", lineHeight: 1.5 }}>
                      Li e concordo com os{" "}
                      <Link to="/terms" className="rp-link" style={{ color: "#1E3A8A" }}>Termos de Serviço</Link>
                      {" "}e a{" "}
                      <Link to="/privacy" className="rp-link" style={{ color: "#1E3A8A" }}>Política de Privacidade</Link>.
                    </label>
                  </div>
                  {errors.terms && (
                    <FieldError id="terms-error" message={errors.terms.message} />
                  )}
                </div>

                {/* ── Botão submit ── */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rp-submit rp-focusring rp-animate"
                  aria-busy={isLoading}
                  style={{ width: "100%", padding: "13px 24px", background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)", border: "none", borderRadius: 10, color: "#FFFFFF", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3, animationDelay: "0.25s", boxShadow: "0 4px 14px rgba(30,58,138,0.25)" }}
                >
                  {isLoading ? <><IconSpinner /> Criando conta…</> : "Criar conta gratuitamente"}
                </button>

                <p className="rp-animate"
                  style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#64748B", animationDelay: "0.28s" }}>
                  Já tem uma conta?{" "}
                  <Link to="/login" className="rp-link rp-focusring" style={{ color: "#1E3A8A" }}>
                    Entrar
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