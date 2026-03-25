"use strict";

const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");
const authRoutes = require("./routes/auth");

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

// ── Rate limiter (auth endpoints) ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);

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
