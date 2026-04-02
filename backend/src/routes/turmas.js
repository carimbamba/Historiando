"use strict";

const express      = require("express");
const pool         = require("../db/client");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/turmas — listar turmas do professor
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.nome, t.serie, t.turno, t.max_alunos, t.descricao,
              t.criado_em, t.atualizado_em,
              COUNT(a.id)::int AS total_alunos
         FROM turmas t
         LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = TRUE
        WHERE t.professor_id = $1 AND t.ativo = TRUE
        GROUP BY t.id
        ORDER BY t.criado_em DESC`,
      [req.user.userId]
    );

    return res.json({ turmas: rows });
  } catch (err) {
    console.error("[turmas:list]", err.message);
    return res.status(500).json({ message: "Erro ao listar turmas." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/turmas — criar turma
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { nome, serie, turno = "matutino", maxAlunos = 30, descricao = null } = req.body;

  if (!nome || !serie) {
    return res.status(400).json({ message: "Nome e série são obrigatórios." });
  }

  const validSeries = ["6_fund", "7_fund", "8_fund", "9_fund", "1_medio", "2_medio", "3_medio"];
  if (!validSeries.includes(serie)) {
    return res.status(400).json({ message: "Série inválida." });
  }

  const validTurnos = ["matutino", "vespertino", "noturno"];
  if (!validTurnos.includes(turno)) {
    return res.status(400).json({ message: "Turno inválido." });
  }

  if (maxAlunos < 1 || maxAlunos > 50) {
    return res.status(400).json({ message: "Máximo de alunos deve ser entre 1 e 50." });
  }

  try {
    // Unique name per professor
    const existing = await pool.query(
      "SELECT id FROM turmas WHERE professor_id = $1 AND nome = $2 AND ativo = TRUE",
      [req.user.userId, nome]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Você já possui uma turma com esse nome." });
    }

    const { rows: [turma] } = await pool.query(
      `INSERT INTO turmas (professor_id, nome, serie, turno, max_alunos, descricao)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, serie, turno, max_alunos, descricao, criado_em`,
      [req.user.userId, nome, serie, turno, maxAlunos, descricao]
    );

    return res.status(201).json({
      message: "Turma criada com sucesso!",
      turma: { ...turma, total_alunos: 0 },
    });
  } catch (err) {
    console.error("[turmas:create]", err.message);
    return res.status(500).json({ message: "Erro ao criar turma." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/turmas/:id — editar turma
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, serie, turno, maxAlunos, descricao } = req.body;

  try {
    // Verify ownership
    const { rows: owned } = await pool.query(
      "SELECT id FROM turmas WHERE id = $1 AND professor_id = $2 AND ativo = TRUE",
      [id, req.user.userId]
    );
    if (owned.length === 0) {
      return res.status(404).json({ message: "Turma não encontrada." });
    }

    // Check name uniqueness if name is being changed
    if (nome) {
      const dup = await pool.query(
        "SELECT id FROM turmas WHERE professor_id = $1 AND nome = $2 AND id != $3 AND ativo = TRUE",
        [req.user.userId, nome, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ message: "Você já possui outra turma com esse nome." });
      }
    }

    const { rows: [turma] } = await pool.query(
      `UPDATE turmas
          SET nome          = COALESCE($1, nome),
              serie         = COALESCE($2, serie),
              turno         = COALESCE($3, turno),
              max_alunos    = COALESCE($4, max_alunos),
              descricao     = COALESCE($5, descricao),
              atualizado_em = NOW()
        WHERE id = $6
        RETURNING id, nome, serie, turno, max_alunos, descricao, atualizado_em`,
      [nome || null, serie || null, turno || null, maxAlunos || null, descricao, id]
    );

    return res.json({ message: "Turma atualizada.", turma });
  } catch (err) {
    console.error("[turmas:update]", err.message);
    return res.status(500).json({ message: "Erro ao atualizar turma." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/turmas/:id — soft delete
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE turmas SET ativo = FALSE, atualizado_em = NOW() WHERE id = $1 AND professor_id = $2 AND ativo = TRUE RETURNING id",
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Turma não encontrada." });
    }

    return res.json({ message: "Turma removida com sucesso." });
  } catch (err) {
    console.error("[turmas:delete]", err.message);
    return res.status(500).json({ message: "Erro ao remover turma." });
  }
});

module.exports = router;
