/**
 * ForgotPasswordPage.jsx — Historiando
 * Localização: src/pages/ForgotPasswordPage.jsx
 *
 * Dependências (já instaladas): react-hook-form zod @hookform/resolvers
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";

// ─── Constantes ────────────────────────────────────────────────────────────
const RESET_RATE_KEY  = "historiando_reset_rate";
const MAX_ATTEMPTS    = 3;               // máx. 3 solicitações por janela
const WINDOW_DURATION = 60 * 60 * 1000; // janela de 1 hora

const RFC5322 =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// ─── Rate limit ──────────────────────────────────────────────────────────────
const getResetRate = () => {
  try {
    const raw = localStorage.getItem(RESET_RATE_KEY);
    return raw ? JSON.parse(raw) : { count: 0, windowStart: Date.now(), blockedUntil: null };
  } catch { return { count: 0, windowStart: Date.now(), blockedUntil: null }; }
};

const recordResetAttempt = () => {
  const state = getResetRate();
  const now   = Date.now();

  // Reset da janela se passou mais de 1 hora
  if (now - state.windowStart > WINDOW_DURATION) {
    const next = { count: 1, windowStart: now, blockedUntil: null };
    try { localStorage.setItem(RESET_RATE_KEY, JSON.stringify(next)); } catch {}
    return next;
  }

  const newCount = state.count + 1;
  const next = {
    count:       newCount,
    windowStart: state.windowStart,
    blockedUntil: newCount >= MAX_ATTEMPTS
      ? state.windowStart + WINDOW_DURATION
      : null,
  };
  try { localStorage.setItem(RESET_RATE_KEY, JSON.stringify(next)); } catch {}
  return next;
};

// ─── Log de tentativas (mock) ────────────────────────────────────────────────
// Em produção: registrado no backend com IP + timestamp + email (mascarado)
const LOG_KEY = "historiando_reset_log";
const logResetAttempt = (email) => {
  try {
    const log  = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    const entry = {
      ts:     Date.now(),
      email:  email.replace(/(.{2}).+(@.+)/, "$1***$2"), // mascara: ma***@escola.edu.br
      ip:     "client",  // backend registraria o IP real
    };
    localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...log].slice(0, 50)));
  } catch {}
};

// ─── Schema Zod ──────────────────────────────────────────────────────────────
const forgotSchema = z.object({
  email: z.string()
    .min(1, "E-mail é obrigatório")
    .regex(RFC5322, "Formato de e-mail inválido"),
});

// ─── Mock de envio ────────────────────────────────────────────────────────────
// REMOVA e substitua pela chamada tRPC/fetch em produção.
// IMPORTANTE: por segurança, o backend SEMPRE retorna sucesso
// independente de o e-mail existir ou não (evita user enumeration).
const mockRequestReset = async (email) => {
  await new Promise((r) => setTimeout(r, 1200));
  // Simula falha de rede ocasional (1 em 20)
  if (Math.random() < 0.05) throw new Error("network");
  return { ok: true }; // sempre ok — não revela se e-mail existe
};

// ─── Toast ────────────────────────────────────────────────────────────────────
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

// ─── Utilitários ─────────────────────────────────────────────────────────────
const formatCountdown = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  @keyframes fp-spin        { to { transform: rotate(360deg); } }
  @keyframes fp-fadeSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fp-fadeIn      { from { opacity:0; } to { opacity:1; } }
  @keyframes fp-toastIn     { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fp-pulse       { 0%,100%{opacity:1} 50%{opacity:0.5} }

  .fp-animate { animation: fp-fadeSlideUp 0.3s ease both; }

  .fp-focusring:focus-visible {
    outline: 3px solid #3B82F6;
    outline-offset: 2px;
  }
  .fp-input {
    transition: border-color 200ms ease, box-shadow 200ms ease;
    font-family: 'DM Sans', sans-serif;
  }
  .fp-input:focus {
    outline: none;
    border-color: #1E3A8A !important;
    box-shadow: 0 0 0 3px rgba(30,58,138,0.14);
  }
  .fp-input.error {
    border-color: #E11D48 !important;
    box-shadow: 0 0 0 3px rgba(225,29,72,0.1);
  }
  .fp-input.success {
    border-color: #16A34A !important;
  }
  .fp-submit { transition: transform 200ms ease, box-shadow 200ms ease; }
  .fp-submit:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(30,58,138,0.35) !important;
  }
  .fp-submit:not(:disabled):active { transform: translateY(0); }
  .fp-submit:disabled { cursor: not-allowed; opacity: 0.65; }

  .fp-link { transition: color 200ms ease; text-decoration: none; font-weight: 600; }
  .fp-link:hover { text-decoration: underline; }
  .fp-link:focus-visible { outline: 3px solid #3B82F6; outline-offset: 2px; border-radius: 2px; }

  .fp-left::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 59px,
      rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px
    );
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .fp-grid       { grid-template-columns: 1fr !important; }
    .fp-left       { display: none !important; }
    .fp-mobile-logo{ display: flex !important; }
  }
`;

// ─── Ícones ───────────────────────────────────────────────────────────────────
function IconSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
      style={{ animation: "fp-spin 0.7s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
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

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function FieldError({ id, message }) {
  return (
    <p id={id} role="alert" aria-live="polite"
      style={{ margin: "6px 0 0", fontSize: 12, color: "#E11D48", display: "flex", alignItems: "center", gap: 4, animation: "fp-fadeSlideUp 0.2s ease" }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      {message}
    </p>
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
            style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderLeft: `4px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", animation: "fp-toastIn 0.3s ease", fontSize: 13, fontWeight: 500, color: "#1E293B" }}>
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
    <section className="fp-left" aria-hidden="true"
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

      {/* Conteúdo */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 48 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <IconShield />
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Syne', sans-serif", lineHeight: 1.18, margin: "0 0 16px", letterSpacing: -0.7 }}>
          Recuperação<br />
          <span style={{ color: "#93C5FD" }}>segura de acesso.</span>
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 320, margin: 0 }}>
          Enviaremos um link com validade de 1 hora para o e-mail cadastrado. O link só pode ser usado uma vez.
        </p>
      </div>

      {/* Avisos de segurança */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { icon: "🔒", text: "Link expira em 1 hora" },
          { icon: "🔑", text: "Uso único — token invalidado após usar" },
          { icon: "📋", text: "Tentativas registradas por segurança" },
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate            = useNavigate();
  const { toasts, show: toast } = useToast();

  const [isLoading,   setIsLoading]   = useState(false);
  const [sent,        setSent]        = useState(false);
  const [sentEmail,   setSentEmail]   = useState("");
  const [rateState,   setRateState_]  = useState(getResetRate);
  const [countdown,   setCountdown]   = useState(0);
  const [resendIn,    setResendIn]    = useState(0); // cooldown de reenvio (60s)

  const isBlocked = !!rateState.blockedUntil && Date.now() < rateState.blockedUntil;

  // Countdown de bloqueio
  useEffect(() => {
    if (!rateState.blockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, rateState.blockedUntil - Date.now());
      setCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        try { localStorage.removeItem(RESET_RATE_KEY); } catch {}
        setRateState_({ count: 0, windowStart: Date.now(), blockedUntil: null });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rateState.blockedUntil]);

  // Cooldown de reenvio
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const { register, handleSubmit, watch, formState: { errors, touchedFields } } = useForm({
    resolver:      zodResolver(forgotSchema),
    mode:          "onTouched",
    defaultValues: { email: "" },
  });

  const emailValue = watch("email");

  const onSubmit = async (data) => {
    if (isBlocked || resendIn > 0) return;
    setIsLoading(true);

    try {
      logResetAttempt(data.email);

      /*
       * ── INTEGRAÇÃO tRPC ──────────────────────────────────────────────
       * await trpc.auth.requestPasswordReset.mutateAsync({ email: data.email });
       *
       * ── INTEGRAÇÃO fetch ─────────────────────────────────────────────
       * const res = await fetch("/api/auth/forgot-password", {
       *   method:  "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body:    JSON.stringify({ email: data.email }),
       * });
       * if (!res.ok) throw new Error("network");
       */
      await mockRequestReset(data.email); // ← remover em prod

      const newState = recordResetAttempt();
      setRateState_(newState);

      setSentEmail(data.email);
      setSent(true);
      setResendIn(60);

    } catch (err) {
      const msg = err?.message === "network"
        ? "Sem conexão com o servidor. Verifique sua internet e tente novamente."
        : "Ocorreu um erro ao enviar o e-mail. Tente novamente em instantes.";
      toast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setSent(false);
    setResendIn(0);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ToastContainer toasts={toasts} />

      <main className="fp-grid"
        style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "'DM Sans', sans-serif", background: "#F8FAFC" }}>

        <LeftPanel />

        {/* Logo mobile */}
        <div className="fp-mobile-logo"
          style={{ display: "none", gridColumn: "1 / -1", alignItems: "center", justifyContent: "center", padding: "20px 24px", background: "#1E3A8A", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, fontFamily: "serif", color: "white" }}>H</div>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "white", letterSpacing: -0.5 }}>Historiando</span>
        </div>

        {/* Formulário */}
        <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#FFFFFF" }} aria-label="Recuperação de senha">

          {/* ── Tela de sucesso ── */}
          {sent ? (
            <div style={{ width: "100%", maxWidth: 420, animation: "fp-fadeSlideUp 0.4s ease" }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#EFF6FF", border: "3px solid #1E3A8A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }} aria-hidden="true">✉</div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", margin: "0 0 10px", letterSpacing: -0.5 }}>
                  Verifique seu e-mail
                </h1>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.65, margin: 0 }}>
                  Se o endereço <strong style={{ color: "#1E293B" }}>{sentEmail}</strong> estiver cadastrado, você receberá um link em instantes.
                </p>
              </div>

              {/* Instruções */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase" }}>Próximos passos</p>
                {[
                  "Abra o e-mail com o assunto 'Redefinir senha — Historiando'",
                  "Clique no link de redefinição",
                  "O link expira em 1 hora e só pode ser usado uma vez",
                  "Não encontrou? Verifique a pasta de spam",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#1E3A8A", color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>

              {/* Ações */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {resendIn > 0 ? (
                  <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", fontWeight: 500 }} aria-live="polite">
                    Reenviar disponível em <strong style={{ color: "#1E3A8A" }}>{resendIn}s</strong>
                  </p>
                ) : (
                  <button onClick={handleResend}
                    className="fp-focusring"
                    style={{ width: "100%", padding: "12px", background: "white", border: "2px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#1E293B", cursor: "pointer", transition: "all 200ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1E3A8A"; e.currentTarget.style.color = "#1E3A8A"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#1E293B"; }}
                  >
                    Usar outro e-mail
                  </button>
                )}
                <Link to="/login"
                  className="fp-focusring"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", background: "#1E3A8A", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "white", textDecoration: "none", fontFamily: "'Syne', sans-serif", textAlign: "center", transition: "all 200ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1D4ED8")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#1E3A8A")}
                >
                  Voltar para o login
                </Link>
              </div>

              {/* Aviso de segurança */}
              <p style={{ marginTop: 20, fontSize: 11, color: "#94A3B8", textAlign: "center", lineHeight: 1.6 }}>
                Esta solicitação foi registrada por segurança. Se você não pediu a redefinição, ignore este e-mail — sua senha não será alterada.
              </p>
            </div>

          ) : (
            /* ── Formulário ── */
            <div style={{ width: "100%", maxWidth: 420, animation: "fp-fadeSlideUp 0.4s ease both" }}>

              {/* Voltar */}
              <Link to="/login"
                className="fp-link fp-focusring"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", marginBottom: 28, textDecoration: "none", fontWeight: 600 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#1E3A8A")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
              >
                <IconArrowLeft /> Voltar para o login
              </Link>

              {/* Cabeçalho */}
              <header style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1E3A8A", fontFamily: "'Syne', sans-serif", letterSpacing: -0.5, margin: 0, lineHeight: 1.2 }}>
                  Esqueceu a senha?
                </h1>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
                  Informe seu e-mail cadastrado. Enviaremos um link de redefinição válido por 1 hora.
                </p>
              </header>

              {/* Bloqueio por rate limit */}
              {isBlocked && (
                <div role="alert" aria-live="assertive"
                  style={{ marginBottom: 20, padding: "14px 16px", background: "#FFFBEB", border: "1.5px solid #FCD34D", borderLeft: "4px solid #D97706", borderRadius: 10, animation: "fp-fadeSlideUp 0.3s ease" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#92400E", fontWeight: 700 }}>🔒 Muitas solicitações</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
                    Você atingiu o limite de {MAX_ATTEMPTS} solicitações por hora.{" "}
                    {countdown > 0 && (
                      <strong>Tente novamente em <span aria-live="off">{formatCountdown(countdown)}</span>.</strong>
                    )}
                  </p>
                </div>
              )}

              {/* Contador de tentativas */}
              {!isBlocked && rateState.count > 0 && rateState.count < MAX_ATTEMPTS && (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true" style={{ fontSize: 14 }}>⚠</span>
                  <p style={{ margin: 0, fontSize: 12, color: "#92400E" }}>
                    {MAX_ATTEMPTS - rateState.count} solicitação{MAX_ATTEMPTS - rateState.count !== 1 ? "ões" : ""} restante{MAX_ATTEMPTS - rateState.count !== 1 ? "s" : ""} nesta hora.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="fp-animate" style={{ marginBottom: 24 }}>
                  <label htmlFor="email"
                    style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    E-mail cadastrado
                  </label>
                  <div style={{ position: "relative" }}>
                    <span aria-hidden="true"
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.email ? "#E11D48" : "#94A3B8", display: "flex", transition: "color 200ms" }}>
                      <IconMail />
                    </span>
                    <input
                      {...register("email")}
                      id="email" type="email" autoComplete="email" autoFocus
                      disabled={isBlocked || isLoading}
                      placeholder="professor@escola.edu.br"
                      aria-describedby={errors.email ? "email-error" : undefined}
                      aria-invalid={!!errors.email}
                      className={`fp-input fp-focusring${errors.email && touchedFields.email ? " error" : ""}`}
                      style={{ width: "100%", padding: "11px 12px 11px 40px", border: "2px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", background: isBlocked ? "#F8FAFC" : "white", boxSizing: "border-box" }}
                    />
                  </div>
                  {errors.email && touchedFields.email && (
                    <FieldError id="email-error" message={errors.email.message} />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isBlocked || isLoading}
                  className="fp-submit fp-focusring fp-animate"
                  aria-busy={isLoading}
                  style={{ width: "100%", padding: "13px 24px", background: isBlocked ? "#94A3B8" : "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)", border: "none", borderRadius: 10, color: "#FFFFFF", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: isBlocked || isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3, boxShadow: isBlocked ? "none" : "0 4px 14px rgba(30,58,138,0.25)", animationDelay: "0.05s" }}
                >
                  {isLoading
                    ? <><IconSpinner /> Enviando…</>
                    : isBlocked
                    ? `Aguarde ${formatCountdown(countdown)}`
                    : "Enviar link de redefinição"}
                </button>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#64748B" }}>
                  Lembrou a senha?{" "}
                  <Link to="/login" className="fp-link fp-focusring" style={{ color: "#1E3A8A" }}>
                    Entrar
                  </Link>
                </p>
              </form>

              <footer style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #F1F5F9", textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6 }}>
                  Por segurança, não informamos se o e-mail está cadastrado. Se não receber o e-mail em alguns minutos, verifique a pasta de spam.
                </p>
              </footer>
            </div>
          )}
        </section>
      </main>
    </>
  );
}