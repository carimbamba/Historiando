"use strict";

const pool = require("../db/client");

/**
 * Fire-and-forget auth event logger.
 * Will not throw — errors are silently swallowed to avoid disrupting request flow.
 *
 * @param {{
 *   usuarioId?:     string|null,
 *   emailTentativa?: string|null,
 *   tipoEvento:     'login_sucesso'|'login_falha'|'cadastro'|'reset_senha',
 *   ipOrigem?:      string|null,
 *   userAgent?:     string|null
 * }} options
 */
function logAuthEvent({ usuarioId = null, emailTentativa = null, tipoEvento, ipOrigem = null, userAgent = null }) {
  pool.query(
    `INSERT INTO logs_autenticacao
       (usuario_id, email_tentativa, tipo_evento, ip_origem, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, emailTentativa, tipoEvento, ipOrigem, userAgent]
  ).catch((err) => {
    console.error("[logAuth] Failed to write auth log:", err.message);
  });
}

/**
 * Extract the real client IP from the request (handles proxies).
 * @param {import('express').Request} req
 * @returns {string}
 */
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

module.exports = { logAuthEvent, getClientIp };
