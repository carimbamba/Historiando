"use strict";

const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");
const authRoutes      = require("./routes/auth");
const turmasRoutes    = require("./routes/turmas");
const alunosRoutes    = require("./routes/alunos");
const presencasRoutes = require("./routes/presencas");

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Rate limiters (granulares por endpoint) ──────────────────────────────────

// Geral: proteção ampla contra abuso em todos os endpoints de auth
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutos
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

// Login: máximo 5 tentativas por IP em 15 minutos (anti brute-force)
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => getClientIp(req),
  message:         { message: "Muitas tentativas de login. Aguarde 15 minutos." },
});

// Reset senha: máximo 3 tentativas por IP em 1 hora
const resetLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => getClientIp(req),
  message:         { message: "Limite de solicitações de reset atingido. Tente novamente em 1 hora." },
});

// ── Helper ────────────────────────────────────────────────────────────────────
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

// ── Routes ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use("/api/auth/login",           authLimiter, loginLimiter);
  app.use("/api/auth/forgot-password", authLimiter, resetLimiter);
  app.use("/api/auth/reset-password",  authLimiter, resetLimiter);
  app.use("/api/auth",                 authLimiter);
}
app.use("/api/auth", authRoutes);

// ── Turmas / Alunos / Presenças (JWT-protected via router middleware) ─────────
app.use("/api/turmas",                       turmasRoutes);
app.use("/api/turmas/:turmaId/alunos",       alunosRoutes);
app.use("/api/presencas",                    presencasRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[app]", err.message);
  res.status(500).json({ message: "Erro interno do servidor" });
});

module.exports = app;
