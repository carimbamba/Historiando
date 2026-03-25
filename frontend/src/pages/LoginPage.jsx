/**
 * LoginPage.jsx — Historiando
 * Localização: src/pages/LoginPage.jsx
 *
 * Dependências: npm install react-hook-form zod @hookform/resolvers
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";

// ─── Constantes ────────────────────────────────────────────────────
const MAX_ATTEMPTS  = 5;
const LOCK_DURATION = 15 * 60 * 1000;
const SESSION_KEY   = "historiando_session";
const RATE_KEY      = "historiando_rate";
const REMEMBER_TTL  = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_TTL   =      24 * 60 * 60 * 1000;

// ─── Zod schema ────────────────────────────────────────────────────
const RFC5322 =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const loginSchema = z.object({
  email:      z.string().min(1, "E-mail é obrigatório").regex(RFC5322, "Formato de e-mail inválido"),
  password:   z.string().min(1, "Senha é obrigatória").min(6, "Senha deve ter no mínimo 6 caracteres"),
  rememberMe: z.boolean().optional().default(false),
});

// ─── Redirecionamento por role ──────────────────────────────────────
const ROLE_REDIRECT = {
  professor:   "/",
  coordenador: "/analytics",
  aluno:       "/conteudo",
};

// ─── Rate limit ─────────────────────────────────────────────────────
const getRateState = () => {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, firstAttempt: Date.now(), blockedUntil: null };
};

const setRateStateFn = (state) => {
  try { localStorage.setItem(RATE_KEY, JSON.stringify(state)); } catch {}
};

const clearRateState = () => {
  try { localStorage.removeItem(RATE_KEY); } catch {}
};

const recordFailedAttempt = () => {
  const state = getRateState();
  const now   = Date.now();
  if (now - state.firstAttempt > LOCK_DURATION) {
    const next = { count: 1, firstAttempt: now, blockedUntil: null };
    setRateStateFn(next);
    return next;
  }
  const newCount = state.count + 1;
  const next = {
    count:        newCount,
    firstAttempt: state.firstAttempt,
    blockedUntil: newCount >= MAX_ATTEMPTS ? now + LOCK_DURATION : null,
  };
  setRateStateFn(next);
  return next;
};

// ─── Sessão ──────────────────────────────────────────────────────────
const saveSession = (data, rememberMe) => {
  const ttl     = rememberMe ? REMEMBER_TTL : DEFAULT_TTL;
  const session = {
    token:     data.token,
    role:      data.role,
    name:      data.name,
    expiresAt: Date.now() + (data.expiresIn ? data.expiresIn * 1000 : ttl),
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
};

const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
};

// ─── Força da senha ───────────────────────────────────────────────────
const calcStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8)          score++;
  if (password.length >= 12)         score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const map = {
    0: { score: 0, label: "",             color: ""        },
    1: { score: 1, label: "Muito fraca",  color: "#E11D48" },
    2: { score: 2, label: "Fraca",        color: "#F97316" },
    3: { score: 3, label: "Boa",          color: "#EAB308" },
    4: { score: 4, label: "Forte",        color: "#059669" },
    5: { score: 4, label: "Muito forte",  color: "#059669" },
  };
  return map[Math.min(score, 5)];
};

// ─── Toast ────────────────────────────────────────────────────────────
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
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, show };
};

// ─── Utilitários ──────────────────────────────────────────────────────
const formatCountdown = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const mapServerError = (raw) => {
  const l = raw.toLowerCase();
  if (l.includes("not found") || l.includes("user not found"))
    return "Nenhuma conta encontrada com este e-mail. Verifique o endereço ou crie uma conta.";
  if (l.includes("invalid password") || l.includes("wrong password"))
    return "Senha incorreta. Verifique sua senha e tente novamente.";
  if (l.includes("account disabled"))
    return "Esta conta foi desativada. Entre em contato com o suporte.";
  if (l.includes("email not verified"))
    return "E-mail ainda não verificado. Verifique sua caixa de entrada.";
  if (l.includes("network") || l.includes("fetch"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  return "Ocorreu um erro ao fazer login. Tente novamente em instantes.";
};

// ─── API login ───────────────────────────────────────────────────────────────
const apiLogin = async (email, password) => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const res  = await fetch(`${base}/api/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao fazer login");
  return data; // { token, role, name, username, expiresIn }
};

// ─── CSS do componente ────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  @keyframes lp-spin        { to { transform: rotate(360deg); } }
  @keyframes lp-fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes lp-fadeIn      { from { opacity:0; } to { opacity:1; } }
  @keyframes lp-shake       { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
  @keyframes lp-toastIn     { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }

  .lp-animate { animation: lp-fadeSlideUp 0.35s ease both; }
  .lp-shake   { animation: lp-shake 0.4s ease; }

  .lp-focusring:focus-visible {
    outline: 3px solid #3B82F6;
    outline-offset: 2px;
  }
  .lp-input {
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }
  .lp-input:focus {
    outline: none;
    border-color: #1E3A8A !important;
    box-shadow: 0 0 0 3px rgba(30,58,138,0.15);
  }
  .lp-input.error {
    border-color: #E11D48 !important;
    box-shadow: 0 0 0 3px rgba(225,29,72,0.12);
  }
  .lp-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 18px; height: 18px;
    border: 2px solid #CBD5E1;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 200ms ease;
    position: relative;
    background: white;
  }
  .lp-checkbox:checked { background: #1E3A8A; border-color: #1E3A8A; }
  .lp-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 4px; top: 1px;
    width: 6px; height: 10px;
    border: 2px solid white;
    border-top: none; border-left: none;
    transform: rotate(45deg);
  }
  .lp-checkbox:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; }

  .lp-submit { transition: transform 200ms ease, box-shadow 200ms ease; }
  .lp-submit:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(30,58,138,0.35) !important;
  }
  .lp-submit:not(:disabled):active { transform: translateY(0); }
  .lp-submit:disabled { cursor: not-allowed; opacity: 0.65; }

  .lp-link { transition: color 200ms ease; text-decoration: none; font-weight: 600; }
  .lp-link:hover { text-decoration: underline; }
  .lp-link:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; border-radius: 2px; }

  .lp-left::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 59px,
      rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px
    );
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .lp-grid       { grid-template-columns: 1fr !important; }
    .lp-left       { display: none !important; }
    .lp-mobile-logo{ display: flex !important; }
  }
`;

// ─── Ícones ────────────────────────────────────────────────────────────
function IconEye({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
      style={{ animation: "lp-spin 0.7s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────
function FieldError({ id, message }) {
  return (
    <p id={id} role="alert" aria-live="polite"
      style={{ margin: "6px 0 0", fontSize: 12, color: "#E11D48", display: "flex", alignItems: "center", gap: 4, animation: "lp-fadeSlideUp 0.2s ease" }}>
      <span aria-hidden="true" style={{ fontSize: 11 }}>✕</span>
      {message}
    </p>
  );
}

function ServerErrorBanner({ message }) {
  return (
    <div role="alert" aria-live="assertive"
      style={{ margin: "0 0 16px", padding: "12px 14px", background: "#FFF1F2", border: "1.5px solid #FECDD3", borderLeft: "4px solid #E11D48", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10, animation: "lp-fadeSlideUp 0.2s ease" }}>
      <span aria-hidden="true"
        style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#FEE2E2", border: "1.5px solid #E11D48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#E11D48", marginTop: 1 }}>!</span>
      <p style={{ margin: 0, fontSize: 13, color: "#9F1239", lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

function StrengthBar({ strength, id }) {
  if (!strength.label) return null;
  return (
    <div id={id} aria-label={`Força da senha: ${strength.label}`} aria-live="polite" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} role="presentation"
            style={{ flex: 1, height: 3, borderRadius: 99, background: i <= strength.score ? strength.color : "#E2E8F0", transition: "background-color 300ms ease" }} />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: strength.color, transition: "color 300ms ease" }}>
        Senha {strength.label}
      </p>
    </div>
  );
}

function RateLimitBanner({ countdown }) {
  return (
    <div role="alert" aria-live="assertive"
      style={{ marginBottom: 20, padding: "14px 16px", background: "#FFFBEB", border: "1.5px solid #FCD34D", borderLeft: "4px solid #D97706", borderRadius: 10, animation: "lp-fadeSlideUp 0.3s ease" }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, color: "#92400E", fontWeight: 600 }}>
        🔒 Conta temporariamente bloqueada
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
        Após {MAX_ATTEMPTS} tentativas incorretas, o acesso foi suspenso por {Math.ceil(LOCK_DURATION / 60000)} minutos.{" "}
        {countdown > 0 && (
          <strong>Tente novamente em <span aria-live="off">{formatCountdown(countdown)}</span>.</strong>
        )}
      </p>
    </div>
  );
}

function AttemptsIndicator({ count }) {
  const remaining = MAX_ATTEMPTS - count;
  return (
    <p aria-live="polite"
      style={{ marginTop: 10, fontSize: 12, textAlign: "center", color: remaining <= 2 ? "#B45309" : "#94A3B8", fontWeight: remaining <= 2 ? 600 : 400 }}>
      {remaining} tentativa{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""} antes do bloqueio
    </p>
  );
}

function ToastContainer({ toasts }) {
  return (
    <div aria-live="polite" aria-atomic="false"
      style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, width: "calc(100vw - 40px)" }}>
      {toasts.map((t) => {
        const s = TOAST_CFG[t.type];
        return (
          <div key={t.id} role="status"
            style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderLeft: `4px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", animation: "lp-toastIn 0.3s ease", fontSize: 13, fontWeight: 500, color: "#1E293B" }}>
            <span aria-hidden="true"
              style={{ width: 20, height: 20, borderRadius: "50%", background: s.border, color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

function LeftPanel() {
  const years = ["1500", "1822", "1888", "1930", "1964", "1985", "2025"];
  return (
    <section className="lp-left" aria-hidden="true"
      style={{ background: "linear-gradient(160deg, #0F2461 0%, #1E3A8A 45%, #1D4ED8 100%)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px", color: "white" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 24, opacity: 0.18, userSelect: "none" }}>
        {years.map((year, i) => (
          <div key={year} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "white" }}>{year}</span>
            <div style={{ width: i % 3 === 0 ? 10 : 6, height: i % 3 === 0 ? 10 : 6, borderRadius: "50%", background: i % 3 === 0 ? "#93C5FD" : "rgba(255,255,255,0.5)", border: "1.5px solid rgba(255,255,255,0.5)" }} />
          </div>
        ))}
      </div>
      <div style={{ position: "relative", zIndex: 1, marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "serif", backdropFilter: "blur(8px)" }}>H</div>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>Historiando</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Gestão Pedagógica</span>
      </div>
      <div style={{ position: "relative", zIndex: 1, marginBottom: 40 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Syne', sans-serif", lineHeight: 1.15, margin: "0 0 16px", letterSpacing: -0.8 }}>
          O passado<br />
          <span style={{ color: "#93C5FD" }}>ensina o futuro.</span>
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 340, margin: 0 }}>
          Gestão de sala, ocorrências e progresso dos alunos — tudo em um só lugar, para professores que fazem a diferença.
        </p>
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[
          { value: "2.400+", label: "Professores" },
          { value: "98%",    label: "Satisfação"  },
          { value: "40k+",   label: "Alunos"      },
        ].map((s) => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 12px", backdropFilter: "blur(8px)", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "#93C5FD", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Componente principal ──────────────────────────────────────────────
export default function LoginPage() {
  const navigate            = useNavigate();
  const { toasts, show: toast } = useToast();
  const formRef             = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [serverError,  setServerError]  = useState(null);
  const [rateState,    setRateState_]   = useState(getRateState);
  const [countdown,    setCountdown]    = useState(0);

  useEffect(() => {
    if (!rateState.blockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, rateState.blockedUntil - Date.now());
      setCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        clearRateState();
        setRateState_({ count: 0, firstAttempt: Date.now(), blockedUntil: null });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rateState.blockedUntil]);

  useEffect(() => {
    const session = getSession();
    if (session) navigate(ROLE_REDIRECT[session.role] ?? "/", { replace: true });
  }, [navigate]);

  const { register, handleSubmit, watch, formState: { errors, touchedFields } } = useForm({
    resolver:      zodResolver(loginSchema),
    mode:          "onTouched",
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const passwordValue = watch("password");
  const strength      = calcStrength(passwordValue);
  const isBlocked     = !!rateState.blockedUntil && Date.now() < rateState.blockedUntil;

  const onSubmit = async (data) => {
    if (isBlocked) return;
    setServerError(null);
    setIsLoading(true);
    try {
      const result = await apiLogin(data.email, data.password);

      clearRateState();
      const session = saveSession(result, data.rememberMe ?? false);
      toast("Login realizado com sucesso!", "success");
      setTimeout(() => navigate(ROLE_REDIRECT[session.role] ?? "/", { replace: true }), 600);

    } catch (err) {
      const message     = err instanceof Error ? err.message : "Erro interno";
      const userMessage = mapServerError(message);
      setServerError(userMessage);
      const newState = recordFailedAttempt();
      setRateState_(newState);
      if (newState.blockedUntil) {
        toast(`Conta bloqueada por ${Math.ceil(LOCK_DURATION / 60000)} minutos após ${MAX_ATTEMPTS} tentativas.`, "warning");
      } else if (MAX_ATTEMPTS - newState.count <= 2) {
        toast(`Atenção: ${MAX_ATTEMPTS - newState.count} tentativa(s) restante(s).`, "warning");
      }
      if (formRef.current) {
        formRef.current.classList.remove("lp-shake");
        void formRef.current.offsetWidth;
        formRef.current.classList.add("lp-shake");
        setTimeout(() => formRef.current?.classList.remove("lp-shake"), 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ToastContainer toasts={toasts} />

      <main className="lp-grid"
        style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC" }}>

        <LeftPanel />

        {/* Logo mobile */}
        <div className="lp-mobile-logo"
          style={{ display: "none", gridColumn: "1 / -1", alignItems: "center", justifyContent: "center", padding: "20px 24px", background: "#1E3A8A", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, fontFamily: "serif", color: "white" }}>H</div>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "white", letterSpacing: -0.5 }}>Historiando</span>
        </div>

        {/* Formulário */}
        <section
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#FFFFFF" }}
          aria-label="Formulário de login">
          <div style={{ width: "100%", maxWidth: 420, animation: "lp-fadeSlideUp 0.4s ease both" }}>

            <header style={{ marginBottom: 36 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", letterSpacing: -0.5, margin: 0, lineHeight: 1.2 }}>
                Bem-vindo de volta
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748B" }}>
                Entre na sua conta para continuar
              </p>
            </header>

            {isBlocked && <RateLimitBanner countdown={countdown} />}

            <div ref={formRef}>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>

                {/* E-mail */}
                <div className="lp-animate" style={{ marginBottom: 20, animationDelay: "0.05s" }}>
                  <label htmlFor="email"
                    style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    E-mail
                  </label>
                  <div style={{ position: "relative" }}>
                    <span aria-hidden="true"
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.email ? "#E11D48" : "#94A3B8", display: "flex", transition: "color 200ms" }}>
                      <IconMail />
                    </span>
                    <input
                      {...register("email")}
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      disabled={isBlocked || isLoading}
                      placeholder="professor@escola.edu.br"
                      aria-describedby={errors.email ? "email-error" : undefined}
                      aria-invalid={!!errors.email}
                      className={`lp-input lp-focusring${errors.email && touchedFields.email ? " error" : ""}`}
                      style={{ width: "100%", padding: "11px 12px 11px 40px", border: "2px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", background: isBlocked ? "#F8FAFC" : "white", boxSizing: "border-box" }}
                    />
                  </div>
                  {errors.email && touchedFields.email && (
                    <FieldError id="email-error" message={errors.email.message} />
                  )}
                </div>

                {/* Senha */}
                <div className="lp-animate" style={{ marginBottom: 8, animationDelay: "0.10s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <label htmlFor="password"
                      style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: 0.5, textTransform: "uppercase" }}>
                      Senha
                    </label>
                    <Link to="/forgot-password" className="lp-link lp-focusring" style={{ fontSize: 12, color: "#1E3A8A" }}>
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span aria-hidden="true"
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.password ? "#E11D48" : "#94A3B8", display: "flex", transition: "color 200ms" }}>
                      <IconLock />
                    </span>
                    <input
                      {...register("password")}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={isBlocked || isLoading}
                      placeholder="••••••••"
                      aria-describedby={[errors.password ? "password-error" : "", passwordValue ? "password-strength" : ""].filter(Boolean).join(" ") || undefined}
                      aria-invalid={!!errors.password}
                      className={`lp-input lp-focusring${errors.password && touchedFields.password ? " error" : ""}`}
                      style={{ width: "100%", padding: "11px 44px 11px 40px", border: "2px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", background: isBlocked ? "#F8FAFC" : "white", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      disabled={isBlocked || isLoading}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                      className="lp-focusring"
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
                  {passwordValue && <StrengthBar strength={strength} id="password-strength" />}
                </div>

                {serverError && !isBlocked && <ServerErrorBanner message={serverError} />}

                {/* Manter conectado */}
                <div className="lp-animate" style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 24px", animationDelay: "0.15s" }}>
                  <input
                    {...register("rememberMe")}
                    id="rememberMe"
                    type="checkbox"
                    disabled={isBlocked || isLoading}
                    className="lp-checkbox"
                    aria-describedby="rememberMe-hint"
                  />
                  <div>
                    <label htmlFor="rememberMe"
                      style={{ fontSize: 14, color: "#374151", cursor: "pointer", userSelect: "none", fontWeight: 500 }}>
                      Manter conectado
                    </label>
                    <p id="rememberMe-hint" style={{ margin: 0, fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>
                      Salva sua sessão por 30 dias
                    </p>
                  </div>
                </div>

                {/* Botão submit */}
                <button
                  type="submit"
                  disabled={isBlocked || isLoading}
                  className="lp-submit lp-focusring lp-animate"
                  aria-busy={isLoading}
                  style={{ width: "100%", padding: "13px 24px", background: isBlocked ? "#94A3B8" : "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)", border: "none", borderRadius: 10, color: "#FFFFFF", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: isBlocked || isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3, animationDelay: "0.2s", boxShadow: isBlocked ? "none" : "0 4px 14px rgba(30,58,138,0.25)" }}
                >
                  {isLoading
                    ? <><IconSpinner /> Entrando…</>
                    : isBlocked
                    ? `Bloqueado por ${formatCountdown(countdown)}`
                    : "Entrar na plataforma"}
                </button>

                {!isBlocked && rateState.count > 0 && rateState.count < MAX_ATTEMPTS && (
                  <AttemptsIndicator count={rateState.count} />
                )}

                <p className="lp-animate"
                  style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#64748B", animationDelay: "0.25s" }}>
                  Não tem uma conta?{" "}
                  <Link to="/register" className="lp-link lp-focusring" style={{ color: "#059669" }}>
                    Criar conta grátis
                  </Link>
                </p>
              </form>
            </div>

            <footer style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #F1F5F9", textAlign: "center", animation: "lp-fadeIn 0.5s ease 0.4s both" }}>
              <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6 }}>
                Ao entrar, você concorda com nossos{" "}
                <Link to="/terms"   className="lp-link" style={{ color: "#94A3B8" }}>Termos de Uso</Link>{" "}
                e{" "}
                <Link to="/privacy" className="lp-link" style={{ color: "#94A3B8" }}>Política de Privacidade</Link>.
              </p>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
