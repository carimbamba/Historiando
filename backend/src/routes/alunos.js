"use strict";

const express      = require("express");
const pool         = require("../db/client");
const authenticate = require("../middleware/authenticate");

const router = express.Router({ mergeParams: true }); // access :turmaId

router.use(authenticate);

/**
 * Helper: verify teacher owns the turma and it's active.
 */
async function verifyTurmaOwnership(turmaId, userId) {
  const { rows } = await pool.query(
    "SELECT id, max_alunos FROM turmas WHERE id = $1 AND professor_id = $2 AND ativo = TRUE",
    [turmaId, userId]
  );
  return rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/turmas/:turmaId/alunos — listar alunos
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { turmaId } = req.params;
  const { busca } = req.query;

  const turma = await verifyTurmaOwnership(turmaId, req.user.userId);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada." });

  try {
    let sql = `SELECT id, nome_completo, matricula, email, data_nascimento,
                      responsavel_nome, responsavel_telefone, criado_em
                 FROM alunos
                WHERE turma_id = $1 AND ativo = TRUE`;
    const params = [turmaId];

    if (busca) {
      sql += ` AND (nome_completo ILIKE $2 OR matricula ILIKE $2)`;
      params.push(`%${busca}%`);
    }

    sql += ` ORDER BY nome_completo ASC`;

    const { rows } = await pool.query(sql, params);
    return res.json({ alunos: rows, maxAlunos: turma.max_alunos });
  } catch (err) {
    console.error("[alunos:list]", err.message);
    return res.status(500).json({ message: "Erro ao listar alunos." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/turmas/:turmaId/alunos — adicionar aluno
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { turmaId } = req.params;
  const {
    nomeCompleto, matricula, email,
    dataNascimento = null,
    responsavelNome = null, responsavelTelefone = null,
  } = req.body;

  if (!nomeCompleto || !matricula || !email) {
    return res.status(400).json({ message: "Nome, matrícula e email são obrigatórios." });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Email inválido." });
  }

  const turma = await verifyTurmaOwnership(turmaId, req.user.userId);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada." });

  try {
    // Check capacity
    const { rows: [{ count }] } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM alunos WHERE turma_id = $1 AND ativo = TRUE",
      [turmaId]
    );
    if (count >= turma.max_alunos) {
      return res.status(400).json({ message: `Limite de ${turma.max_alunos} alunos atingido.` });
    }

    // Check uniqueness of matricula in turma
    const dup = await pool.query(
      "SELECT id FROM alunos WHERE turma_id = $1 AND matricula = $2 AND ativo = TRUE",
      [turmaId, matricula]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: "Já existe um aluno com essa matrícula nesta turma." });
    }

    const { rows: [aluno] } = await pool.query(
      `INSERT INTO alunos (turma_id, nome_completo, matricula, email, data_nascimento, responsavel_nome, responsavel_telefone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nome_completo, matricula, email, data_nascimento, responsavel_nome, responsavel_telefone, criado_em`,
      [turmaId, nomeCompleto, matricula, email.toLowerCase(), dataNascimento, responsavelNome, responsavelTelefone]
    );

    return res.status(201).json({ message: "Aluno adicionado!", aluno });
  } catch (err) {
    console.error("[alunos:create]", err.message);
    return res.status(500).json({ message: "Erro ao adicionar aluno." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/turmas/:turmaId/alunos/:id — editar aluno
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { turmaId, id } = req.params;
  const { nomeCompleto, matricula, email, dataNascimento, responsavelNome, responsavelTelefone } = req.body;

  const turma = await verifyTurmaOwnership(turmaId, req.user.userId);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada." });

  try {
    // Check matricula uniqueness if changing
    if (matricula) {
      const dup = await pool.query(
        "SELECT id FROM alunos WHERE turma_id = $1 AND matricula = $2 AND id != $3 AND ativo = TRUE",
        [turmaId, matricula, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ message: "Outra matrícula já utiliza esse número." });
      }
    }

    const { rows } = await pool.query(
      `UPDATE alunos
          SET nome_completo        = COALESCE($1, nome_completo),
              matricula            = COALESCE($2, matricula),
              email                = COALESCE($3, email),
              data_nascimento      = COALESCE($4, data_nascimento),
              responsavel_nome     = COALESCE($5, responsavel_nome),
              responsavel_telefone = COALESCE($6, responsavel_telefone),
              atualizado_em        = NOW()
        WHERE id = $7 AND turma_id = $8 AND ativo = TRUE
        RETURNING id, nome_completo, matricula, email, data_nascimento, responsavel_nome, responsavel_telefone`,
      [nomeCompleto || null, matricula || null, email || null, dataNascimento, responsavelNome, responsavelTelefone, id, turmaId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Aluno não encontrado." });
    return res.json({ message: "Aluno atualizado.", aluno: rows[0] });
  } catch (err) {
    console.error("[alunos:update]", err.message);
    return res.status(500).json({ message: "Erro ao atualizar aluno." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/turmas/:turmaId/alunos/:id — soft delete
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const { turmaId, id } = req.params;

  const turma = await verifyTurmaOwnership(turmaId, req.user.userId);
  if (!turma) return res.status(404).json({ message: "Turma não encontrada." });

  try {
    const result = await pool.query(
      "UPDATE alunos SET ativo = FALSE, atualizado_em = NOW() WHERE id = $1 AND turma_id = $2 AND ativo = TRUE RETURNING id",
      [id, turmaId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Aluno não encontrado." });
    return res.json({ message: "Aluno removido com sucesso." });
  } catch (err) {
    console.error("[alunos:delete]", err.message);
    return res.status(500).json({ message: "Erro ao remover aluno." });
  }
});

module.exports = router;
