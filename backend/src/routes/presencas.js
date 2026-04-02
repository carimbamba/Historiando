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
// GET /api/presencas/exportar?turmaId=X&data=YYYY-MM-DD
// Retorna arquivo binário Excel estilizado
// ─────────────────────────────────────────────────────────────────────────────
router.get("/exportar", async (req, res) => {
  const { turmaId, data } = req.query;

  if (!turmaId) return res.status(400).json({ message: "turmaId é obrigatório." });
  
  const ExcelJS = require("exceljs");

  try {
    // 1. Validar e Buscar Infos da Turma
    const { rows: turmaRows } = await pool.query(
      "SELECT id, nome, serie, turno FROM turmas WHERE id = $1 AND professor_id = $2 AND ativo = TRUE",
      [turmaId, req.user.userId]
    );
    if (turmaRows.length === 0) return res.status(404).json({ message: "Turma não encontrada." });
    const { nome: turmaNome, serie, turno } = turmaRows[0];

    // 2. Buscar presenças. Se enviou 'data', puxa daquela data específica (com fallback pra N/I se faltar).
    // Para simplificar, buscamos todos os alunos ativos e checamos o status naquele dia (Left Join).
    let sql = `
      SELECT a.nome_completo, a.matricula, p.status, p.observacoes
        FROM alunos a
        LEFT JOIN presencas p ON p.aluno_id = a.id AND p.data = $2
       WHERE a.turma_id = $1 AND a.ativo = TRUE
       ORDER BY a.nome_completo ASC
    `;
    // Se data foi omitida, vamos pegar da data de hoje
    const targetDate = data || new Date().toISOString().slice(0, 10);
    const { rows: alunos } = await pool.query(sql, [turmaId, targetDate]);

    // 3. Montar Planilha ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HISTORIANDO";
    const sheet = workbook.addWorksheet("Chamada");

    // Configurando Fonte e Dimensões
    sheet.properties.defaultColWidth = 15;
    
    // Header
    sheet.mergeCells('A1:E2');
    const headerCell = sheet.getCell('A1');
    headerCell.value = "HISTORIANDO — Controle de Frequência";
    headerCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3730A3" } }; // Indigo-800
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Info Turma
    sheet.getCell('A4').value = "Turma:";
    sheet.getCell('B4').value = turmaNome;
    sheet.getCell('A5').value = "Data:";
    sheet.getCell('B5').value = targetDate.split('-').reverse().join('/');
    sheet.getCell('D4').value = "Série:";
    sheet.getCell('E4').value = serie.replace("_fund", "º Ano (F)").replace("_medio", "º Ano (M)");
    sheet.getCell('D5').value = "Turno:";
    sheet.getCell('E5').value = turno.toUpperCase();
    
    sheet.getRows(4, 2).forEach(row => {
      row.font = { name: "Arial", size: 11, bold: true };
    });

    // Colunas da Tabela
    sheet.getRow(7).values = ["Nº", "Matrícula", "Nome do Aluno", "Presença", "Observações"];
    sheet.getRow(7).font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } }; // Slate-600
    sheet.getRow(7).alignment = { horizontal: "center" };

    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'mat', width: 20 },
      { key: 'nome', width: 45 },
      { key: 'status', width: 14 },
      { key: 'obs', width: 35 }
    ];

    let countPres = 0, countAus = 0, countJus = 0;

    alunos.forEach((a, i) => {
      const rowNum = 8 + i;
      const statusLabel = a.status ? a.status.toUpperCase() : "N/I";
      
      const row = sheet.addRow({
        no: i + 1,
        mat: a.matricula,
        nome: a.nome_completo,
        status: statusLabel.charAt(0), // 'P', 'A', 'J' ou 'N'
        obs: a.observacoes || ""
      });

      row.font = { name: "Arial", size: 11 };
      
      const statusCell = row.getCell('status');
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      statusCell.font = { name: "Arial", size: 11, bold: true };

      if (a.status === 'presente') {
        countPres++;
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; // bg-green
        statusCell.font.color = { argb: "FF065F46" }; // text-green
      } else if (a.status === 'ausente') {
        countAus++;
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }; // bg-red
        statusCell.font.color = { argb: "FF9F1239" }; // text-red
      } else if (a.status === 'justificado') {
        countJus++;
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // bg-yellow
        statusCell.font.color = { argb: "FF92400E" }; // text-yellow
      }

      // Bordering
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
        };
      });
    });

    // Rodapé
    const footRow = sheet.addRow([""]);
    const sumRow = sheet.addRow([
      `TOTAL DA TURMA: ${alunos.length} ALUNOS | PRESENTES: ${countPres} | AUSENTES: ${countAus} | JUSTIFICADOS: ${countJus}`
    ]);
    sheet.mergeCells(`A${sumRow.number}:E${sumRow.number}`);
    sumRow.getCell('A').font = { name: "Arial", size: 10, bold: true, color: { argb:"FF475569" } };
    sumRow.getCell('A').alignment = { horizontal: 'center' };

    // Finalização e envio
    const safeData = targetDate;
    const safeTurma = turmaNome.replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `Chamada_${safeTurma}_${safeData}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[presencas:export]", err);
    res.status(500).json({ message: "Erro ao exportar chamada rica." });
  }
});

module.exports = router;
