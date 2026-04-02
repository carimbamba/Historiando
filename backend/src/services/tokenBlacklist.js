"use strict";

/**
 * Token Blacklist — invalidação de JWTs no logout.
 *
 * Armazena tokens revogados em memória com auto-limpeza.
 * Em produção, migrar para Redis para persistência entre deploys.
 */

const blacklist = new Map(); // token → expiresAt (ms)

// Limpeza automática a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of blacklist) {
    if (expiresAt <= now) blacklist.delete(token);
  }
}, 10 * 60 * 1000).unref();

/**
 * Adiciona um token à blacklist até sua expiração natural.
 * @param {string} token — JWT raw
 * @param {number} expiresAt — timestamp (ms) de quando o JWT expira
 */
function revokeToken(token, expiresAt) {
  blacklist.set(token, expiresAt);
}

/**
 * Verifica se um token foi revogado.
 * @param {string} token
 * @returns {boolean}
 */
function isTokenRevoked(token) {
  return blacklist.has(token);
}

module.exports = { revokeToken, isTokenRevoked };
