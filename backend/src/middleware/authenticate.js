"use strict";

const { verifyAccessToken } = require("../services/tokenService");

/**
 * Express middleware — validates Bearer JWT in Authorization header.
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

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError"
      ? "Token expirado. Faça login novamente."
      : "Token inválido.";
    return res.status(401).json({ message });
  }
}

module.exports = authenticate;
