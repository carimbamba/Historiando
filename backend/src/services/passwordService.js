"use strict";

const bcrypt = require("bcryptjs");
const pool   = require("../db/client");

const SALT_ROUNDS    = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const MAX_PW_HISTORY = 5;

/**
 * Hash a plain-text password using bcrypt.
 * @param {string} plain
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain-text password with a stored bcrypt hash.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Check whether a new password matches any of the user's last N passwords.
 * Queries historico_senhas for previous hashes and compares via bcrypt.
 * @param {string} userId
 * @param {string} plain  — the NEW plain-text password
 * @returns {Promise<boolean>} true if it is in history (should reject)
 */
async function isPasswordInHistory(userId, plain) {
  const { rows } = await pool.query(
    `SELECT hash_senha_anterior
       FROM historico_senhas
      WHERE usuario_id = $1
      ORDER BY data_alteracao DESC
      LIMIT $2`,
    [userId, MAX_PW_HISTORY]
  );

  for (const row of rows) {
    if (await bcrypt.compare(plain, row.hash_senha_anterior)) {
      return true;
    }
  }
  return false;
}

/**
 * Record the old password hash into historico_senhas, keeping only the last N.
 * @param {string} userId
 * @param {string} oldHash  — the bcrypt hash being retired
 */
async function savePasswordToHistory(userId, oldHash) {
  await pool.query(
    `INSERT INTO historico_senhas (usuario_id, hash_senha_anterior)
     VALUES ($1, $2)`,
    [userId, oldHash]
  );

  // Enforce max 5 records per user — delete oldest excess rows
  await pool.query(
    `DELETE FROM historico_senhas
      WHERE id IN (
        SELECT id FROM historico_senhas
         WHERE usuario_id = $1
         ORDER BY data_alteracao DESC
         OFFSET $2
      )`,
    [userId, MAX_PW_HISTORY]
  );
}

module.exports = { hashPassword, verifyPassword, isPasswordInHistory, savePasswordToHistory };
