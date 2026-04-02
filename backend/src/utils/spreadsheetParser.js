"use strict";

const xlsx = require("xlsx");
const { parse: parseCsv } = require("csv-parse/sync");

const normalizeSerie = (s) => {
  const map = {
    "6º Ano": "6_fund", "7º Ano": "7_fund", "8º Ano": "8_fund", "9º Ano": "9_fund",
    "6º ano": "6_fund", "7º ano": "7_fund", "8º ano": "8_fund", "9º ano": "9_fund",
    "1º Ano": "1_medio", "2º Ano": "2_medio", "3º Ano": "3_medio",
    "1º ano": "1_medio", "2º ano": "2_medio", "3º ano": "3_medio",
  };
  return map[String(s).trim()] || "6_fund";
};

const normalizeTurno = (t) => {
  const v = String(t).toLowerCase();
  if (v.includes("manh") || v.includes("matut")) return "matutino";
  if (v.includes("tard") || v.includes("vesp")) return "vespertino";
  if (v.includes("noit") || v.includes("not")) return "noturno";
  return "matutino";
};

/**
 * Le uma planilha binária (.xlsx ou .csv) e de-serializa no modelo fixo do Historiando
 */
function parseWorksheet(buffer, originalname) {
  let aoa = []; // Array of Arrays

  if (originalname.toLowerCase().endsWith(".csv")) {
    const content = buffer.toString("utf-8");
    aoa = parseCsv(content, { skip_empty_lines: true });
  } else {
    // xlsx
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    aoa = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
  }

  // Expect at least Line 2 and Line 5
  if (aoa.length < 3) {
    throw new Error("Planilha vazia ou em formato incorreto. Baixe o template padrão.");
  }

  // Linha 1 = headers da turma
  // Linha 2 = dados da turma [Turma, Série, Turno, Ano] -> indices 0, 1, 2, 3
  const turmaRow = aoa[1] || [];
  const turmaName = String(turmaRow[0] || "").trim();
  const serie = normalizeSerie(turmaRow[1]);
  const turno = normalizeTurno(turmaRow[2]);
  
  if (!turmaName) {
    throw new Error("Nome da Turma não encontrado na Planilha (linha 2, coluna A).");
  }

  const turma = {
    nome: turmaName,
    serie,
    turno,
    maxAlunos: 50 // Default max
  };

  // Alunos vêm da linha 5 diante (índice 4 no array se a linha 3 for blank, mas para segurança, vamos iterar pulando as primeiras q n batem c aluno)
  // Linha 4 geralmente tem [Nome, Matrícula, Email, Telefone, Responsável]
  // Então dados a partir da linha 5 (index 4)
  const alunos = [];
  
  let startedStudents = false;
  for (let i = 2; i < aoa.length; i++) {
    const row = aoa[i];
    // Acha a linha header
    if (!startedStudents) {
      if (row[0] && String(row[0]).toLowerCase().includes("nome")) {
        startedStudents = true;
      }
      continue;
    }

    const n = String(row[0] || "").trim();
    if (!n) continue;

    const matricula = String(row[1] || `IMP-${Date.now()}-${i}`).trim();
    // Default fallback de email baseado na matrícula para caso não possuam email para a plataforma
    const email = String(row[2] || "").trim() || `aluno${matricula}@escola.historiando.local`;
    const respTelefone = String(row[3] || "").trim();
    const respNome = String(row[4] || "").trim();

    alunos.push({
      nomeCompleto: n,
      matricula,
      email,
      responsavelTelefone: respTelefone || null,
      responsavelNome: respNome || null,
    });
  }

  if (alunos.length > 50) {
    throw new Error(`Máximo de 50 alunos permitido. (Encontrado ${alunos.length})`);
  }

  return { turma, alunos };
}

/**
 * Gera um template `.xlsx` vazio retornando o Buffer
 */
function generateTemplateBuffer() {
  const wsData = [
    ["Turma", "Série (ex: 6º Ano)", "Turno (ex: Manhã)", "Ano"],
    ["Preencha aqui", "6º Ano", "Manhã", new Date().getFullYear()],
    [],
    ["Nome Completo do Aluno *", "Matrícula *", "Email do Aluno *", "Telefone Responsável", "Nome Responsável"],
    ["João da Silva Exemplo", "2026001", "joao@escola.br", "(11) 99999-0000", "Maria Exemplo"]
  ];

  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "ImportarTurma");

  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  parseWorksheet,
  generateTemplateBuffer
};
