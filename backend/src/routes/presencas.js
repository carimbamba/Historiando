"use strict";

const express      = require("express");
const pool         = require("../db/client");
const authenticate = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/presencas?turmaId=X&data=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { turmaId, data } = req.query;

  if (!turmaId || !data) {
    return res.status(400).json({ message: "turmaId e data são obrigatórios." });
  }

  try {
    // Verify ownership
    const { rows: owned } = await pool.query(
      "SELECT id FROM turmas WHERE id = $1 AND professor_id = $2 AND ativo = TRUE",
      [turmaId, req.user.userId]
    );
    if (owned.length === 0) return res.status(404).json({ message: "Turma não encontrada." });

    // Get all active students with their attendance for the given date
    const { rows } = await pool.query(
      `SELECT a.id AS aluno_id, a.nome_completo, a.matricula,
              p.status, p.observacoes, p.id AS presenca_id
         FROM alunos a
         LEFT JOIN presencas p ON p.aluno_id = a.id AND p.turma_id = $1 AND p.data = $2
        WHERE a.turma_id = $1 AND a.ativo = TRUE
        ORDER BY a.nome_completo ASC`,
      [turmaId, data]
    );

    return res.json({ presencas: rows });
  } catch (err) {
    console.error("[presencas:get]", err.message);
    return res.status(500).json({ message: "Erro ao buscar presenças." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/presencas — salvar chamada (bulk upsert)
// Body: { turmaId, data, presencas: [{ alunoId, status, observacoes? }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { turmaId, data, presencas } = req.body;

  if (!turmaId || !data || !Array.isArray(presencas) || presencas.length === 0) {
    return res.status(400).json({ message: "turmaId, data e presencas[] são obrigatórios." });
  }

  const validStatuses = ["presente", "ausente", "justificado"];
  for (const p of presencas) {
    if (!p.alunoId || !validStatuses.includes(p.status)) {
      return res.status(400).json({ message: `Status inválido para aluno ${p.alunoId || "?"}. Use: presente, ausente ou justificado.` });
    }
  }

  try {
    // Verify ownership
    const { rows: owned } = await pool.query(
      "SELECT id FROM turmas WHERE id = $1 AND professor_id = $2 AND ativo = TRUE",
      [turmaId, req.user.userId]
    );
    if (owned.length === 0) return res.status(404).json({ message: "Turma não encontrada." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const p of presencas) {
        await client.query(
          `INSERT INTO presencas (aluno_id, turma_id, data, status, observacoes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (aluno_id, turma_id, data)
           DO UPDATE SET status = $4, observacoes = $5, atualizado_em = NOW()`,
          [p.alunoId, turmaId, data, p.status, p.observacoes || null]
        );
      }

      await client.query("COMMIT");
      return res.json({ message: "Chamada salva com sucesso!", total: presencas.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[presencas:save]", err.message);
    return res.status(500).json({ message: "Erro ao salvar chamada." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/presencas/exportar?turmaId=X&de=YYYY-MM-DD&ate=YYYY-MM-DD
// Returns JSON data for client-side Excel generation
// ─────────────────────────────────────────────────────────────────────────────
router.get("/exportar", async (req, res) => {
  const { turmaId, de, ate } = req.query;

  if (!turmaId) {
    return res.status(400).json({ message: "turmaId é obrigatório." });
  }

  try {
    // Verify ownership
    const { rows: turmaRows } = await pool.query(
      "SELECT id, nome FROM turmas WHERE id = $1 AND professor_id = $2 AND ativo = TRUE",
      [turmaId, req.user.userId]
    );
    if (turmaRows.length === 0) return res.status(404).json({ message: "Turma não encontrada." });

    let sql = `
      SELECT a.nome_completo, a.matricula, p.data, p.status, p.observacoes
        FROM presencas p
        JOIN alunos a ON a.id = p.aluno_id
       WHERE p.turma_id = $1`;
    const params = [turmaId];

    if (de) {
      params.push(de);
      sql += ` AND p.data >= $${params.length}`;
    }
    if (ate) {
      params.push(ate);
      sql += ` AND p.data <= $${params.length}`;
    }

    sql += ` ORDER BY p.data ASC, a.nome_completo ASC`;

    const { rows } = await pool.query(sql, params);

    return res.json({
      turma: turmaRows[0].nome,
      registros: rows,
    });
  } catch (err) {
    console.error("[presencas:export]", err.message);
    return res.status(500).json({ message: "Erro ao exportar dados." });
  }
});

module.exports = router;
