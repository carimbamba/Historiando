"use strict";

const { verifyAccessToken } = require("../services/tokenService");
const { isTokenRevoked }    = require("../services/tokenBlacklist");

/**
 * Express middleware — validates Bearer JWT in Authorization header.
 * Rejects revoked tokens (logout blacklist).
 * Attaches decoded payload to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token      = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token de acesso não fornecido" });
  }

  // ── Blacklist check (logout) ──────────────────────────────────────────
  if (isTokenRevoked(token)) {
    return res.status(401).json({ message: "Sessão encerrada. Faça login novamente." });
  }

  try {
    req.user  = verifyAccessToken(token);
    req.token = token; // preserve raw token for logout route
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError"
      ? "Token expirado. Faça login novamente."
      : "Token inválido.";
    return res.status(401).json({ message });
  }
}

module.exports = authenticate;
