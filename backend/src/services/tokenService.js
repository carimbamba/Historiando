"use strict";

const jwt = require("jsonwebtoken");

const SECRET  = process.env.JWT_SECRET;
const EXPIRES = process.env.JWT_EXPIRES_IN || "24h";

if (!SECRET) {
  throw new Error("JWT_SECRET env var is required");
}

/**
 * Sign an access token.
 * @param {{ userId: string, email: string, role: string, username: string }} payload
 * @returns {string} signed JWT
 */
function signAccessToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES, algorithm: "HS256" });
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {{ userId: string, email: string, role: string, username: string, iat: number, exp: number }}
 * @throws if token is invalid or expired
 */
function verifyAccessToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] });
}

module.exports = { signAccessToken, verifyAccessToken };
