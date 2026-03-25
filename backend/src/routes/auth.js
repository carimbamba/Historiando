"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db/client");
const { hashPassword, verifyPassword, isPasswordInHistory, savePasswordToHistory } = require("../services/passwordService");
const { signAccessToken } = require("../services/tokenService");
const authenticate = require("../middleware/authenticate");
const { logAuthEvent, getClientIp } = require("../middleware/logAuth");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { fullName, email, username, password, role = "professor" } = req.body;
  const ip        = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ message: "Campos obrigatórios: fullName, email, username, password" });
  }

  const validRoles = ["professor", "coordenador", "aluno", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Role inválido. Use: professor, coordenador, aluno ou admin" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Uniqueness check ──────────────────────────────────────────────────
    const existing = await client.query(
      "SELECT id, email, username FROM usuarios WHERE email = $1 OR username = $2",
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      const conflict = existing.rows[0];
      if (conflict.email === email.toLowerCase()) {
        return res.status(409).json({ code: "email_exists", message: "Este e-mail já está cadastrado." });
      }
      return res.status(409).json({ code: "username_exists", message: "Este nome de usuário já está em uso." });
    }

    // ── Hash password ─────────────────────────────────────────────────────
    const hash = await hashPassword(password);

    // ── Create user ───────────────────────────────────────────────────────
    const { rows: [user] } = await client.query(
      `INSERT INTO usuarios (email, username, nome_completo, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, nome_completo, role, criado_em`,
      [email.toLowerCase(), username.toLowerCase(), fullName, role]
    );

    // ── Store active password hash ────────────────────────────────────────
    await client.query(
      `INSERT INTO senhas_usuarios (usuario_id, hash_senha)
       VALUES ($1, $2)`,
      [user.id, hash]
    );

    await client.query("COMMIT");

    // ── Audit log ─────────────────────────────────────────────────────────
    logAuthEvent({ usuarioId: user.id, emailTentativa: email, tipoEvento: "cadastro", ipOrigem: ip, userAgent });

    return res.status(201).json({
      message: "Conta criada com sucesso!",
      user: {
        id:       user.id,
        email:    user.email,
        username: user.username,
        name:     user.nome_completo,
        role:     user.role,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[register]", err.message);
    return res.status(500).json({ message: "Erro interno ao criar conta." });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const ip        = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;

  if (!email || !password) {
    return res.status(400).json({ message: "E-mail e senha são obrigatórios" });
  }

  try {
    // ── Fetch user ────────────────────────────────────────────────────────
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, u.nome_completo, u.role, u.ativo,
              s.hash_senha
         FROM usuarios u
         JOIN senhas_usuarios s ON s.usuario_id = u.id AND s.ativo = TRUE
        WHERE u.email = $1
        LIMIT 1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      logAuthEvent({ emailTentativa: email, tipoEvento: "login_falha", ipOrigem: ip, userAgent });
      // Generic message — no user enumeration
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const user = rows[0];

    if (!user.ativo) {
      logAuthEvent({ usuarioId: user.id, emailTentativa: email, tipoEvento: "login_falha", ipOrigem: ip, userAgent });
      return res.status(403).json({ message: "Account disabled" });
    }

    const passwordOk = await verifyPassword(password, user.hash_senha);
    if (!passwordOk) {
      logAuthEvent({ usuarioId: user.id, emailTentativa: email, tipoEvento: "login_falha", ipOrigem: ip, userAgent });
      return res.status(401).json({ message: "Invalid password" });
    }

    // ── Update ultimo_login ───────────────────────────────────────────────
    await pool.query("UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1", [user.id]);

    // ── Issue JWT ─────────────────────────────────────────────────────────
    const token = signAccessToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      username: user.username,
    });

    logAuthEvent({ usuarioId: user.id, emailTentativa: email, tipoEvento: "login_sucesso", ipOrigem: ip, userAgent });

    return res.status(200).json({
      token,
      role:      user.role,
      name:      user.nome_completo,
      username:  user.username,
      expiresIn: 86400, // 24h in seconds
    });
  } catch (err) {
    console.error("[login]", err.message);
    return res.status(500).json({ message: "Erro interno ao fazer login." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, username, nome_completo, role, ativo, criado_em, ultimo_login
         FROM usuarios
        WHERE id = $1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    const user = rows[0];
    return res.json({
      id:         user.id,
      email:      user.email,
      username:   user.username,
      name:       user.nome_completo,
      role:       user.role,
      ativo:      user.ativo,
      criadoEm:   user.criado_em,
      ultimoLogin: user.ultimo_login,
    });
  } catch (err) {
    console.error("[me]", err.message);
    return res.status(500).json({ message: "Erro interno." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const ip        = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;

  if (!email) {
    return res.status(400).json({ message: "E-mail é obrigatório" });
  }

  // Always return 200 — never reveal if email exists (user enumeration prevention)
  try {
    const { rows } = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1 AND ativo = TRUE LIMIT 1",
      [email.toLowerCase()]
    );

    if (rows.length > 0) {
      const userId = rows[0].id;

      // Invalidate any previous unused tokens for this user
      await pool.query(
        "UPDATE tokens_reset_senha SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE",
        [userId]
      );

      const token    = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `INSERT INTO tokens_reset_senha (usuario_id, token, expira_em)
         VALUES ($1, $2, $3)`,
        [userId, token, expiresAt]
      );

      logAuthEvent({ usuarioId: userId, emailTentativa: email, tipoEvento: "reset_senha", ipOrigem: ip, userAgent });

      // In production: send email with reset link
      // In dev: log to console so developers can test without SMTP
      const resetUrl = `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/reset-password?token=${token}`;
      console.log(`\n[forgot-password] ✉  Reset link for ${email}:\n  ${resetUrl}\n`);
    }

    // Always respond with success
    return res.status(200).json({
      message: "Se o e-mail estiver cadastrado, você receberá um link em instantes.",
    });
  } catch (err) {
    console.error("[forgot-password]", err.message);
    // Still return 200 — don't leak internal errors to client
    return res.status(200).json({
      message: "Se o e-mail estiver cadastrado, você receberá um link em instantes.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Validate token ────────────────────────────────────────────────────
    const { rows } = await client.query(
      `SELECT t.id AS token_id, t.usuario_id, t.expira_em, t.usado,
              s.hash_senha AS current_hash
         FROM tokens_reset_senha t
         JOIN senhas_usuarios s ON s.usuario_id = t.usuario_id AND s.ativo = TRUE
        WHERE t.token = $1
        LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    const record = rows[0];

    if (record.usado) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Este link de redefinição já foi utilizado" });
    }

    if (new Date() > new Date(record.expira_em)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Token expirado. Solicite um novo link." });
    }

    // ── Password history check ────────────────────────────────────────────
    const inHistory = await isPasswordInHistory(record.usuario_id, password);
    if (inHistory) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Nova senha não pode ser igual às últimas 5 senhas utilizadas" });
    }

    // ── Also check against current password ───────────────────────────────
    const sameAsCurrent = await verifyPassword(password, record.current_hash);
    if (sameAsCurrent) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Nova senha não pode ser igual à senha atual" });
    }

    const newHash = await hashPassword(password);

    // ── Archive old hash to history ───────────────────────────────────────
    await savePasswordToHistory(record.usuario_id, record.current_hash);

    // ── Deactivate old password + insert new one ──────────────────────────
    await client.query(
      "UPDATE senhas_usuarios SET ativo = FALSE WHERE usuario_id = $1 AND ativo = TRUE",
      [record.usuario_id]
    );
    await client.query(
      "INSERT INTO senhas_usuarios (usuario_id, hash_senha) VALUES ($1, $2)",
      [record.usuario_id, newHash]
    );

    // ── Mark token as used ────────────────────────────────────────────────
    await client.query(
      "UPDATE tokens_reset_senha SET usado = TRUE WHERE id = $1",
      [record.token_id]
    );

    // ── Update atualizado_em ──────────────────────────────────────────────
    await client.query(
      "UPDATE usuarios SET atualizado_em = NOW() WHERE id = $1",
      [record.usuario_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({ message: "Senha redefinida com sucesso!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reset-password]", err.message);
    return res.status(500).json({ message: "Erro interno ao redefinir senha." });
  } finally {
    client.release();
  }
});

module.exports = router;
