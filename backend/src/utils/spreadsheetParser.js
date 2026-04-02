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
 * Lê uma planilha binária (.xlsx ou .csv) e de-serializa de forma inteligente
 * Tolerante a arquivos sem headers ou planilhas cruas.
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

  if (aoa.length === 0) {
    throw new Error("A planilha está vazia.");
  }

  // 1. Extrair Detalhes da Turma (Heurística)
  let turmaNome = "";
  let serie = "6_fund";
  let turno = "matutino";

  const isTemplateForm = String(aoa[0]?.[0] || "").toLowerCase() === "turma";
  
  if (isTemplateForm) {
    turmaNome = String(aoa[1]?.[0] || "").trim();
    serie = normalizeSerie(aoa[1]?.[1]);
    turno = normalizeTurno(aoa[1]?.[2]);
  } else {
    // Tenta caçar a palavra "Turma" nos primeiros registros
    for (let i = 0; i < Math.min(5, aoa.length); i++) {
       const row = aoa[i];
       if (!row) continue;
       for (let j = 0; j < row.length; j++) {
         const val = String(row[j] || "").trim();
         if (val.toLowerCase().startsWith("turma")) {
            const spl = val.split(/[:=]/);
            if (spl.length > 1 && spl[1].trim()) turmaNome = spl[1].trim();
            else if (row[j+1]) turmaNome = String(row[j+1]).trim();
         }
       }
    }
    // Fallback: usar o nome do arquivo se a Turma não for declarada
    if (!turmaNome) {
      turmaNome = originalname.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      if (turmaNome.toLowerCase() === "importar" || !turmaNome) turmaNome = "Nova Turma " + Date.now();
    }
  }

  const turma = { nome: turmaNome, serie, turno, maxAlunos: 50 };

  // 2. Extrair Alunos (Heurística Robusta)
  let alunos = [];
  let nameCol = -1;
  let matCol = -1;
  let emailCol = -1;
  let headerRowIdx = -1;

  // Busca na linha 0 até 10 para identificar cabeçalhos explícitos
  for (let i = 0; i < Math.min(10, aoa.length); i++) {
    const row = aoa[i];
    if (!row) continue;
    let foundNameHeader = false;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toLowerCase().trim();
      if (cell.includes("nome") || cell === "aluno") { nameCol = j; foundNameHeader = true; }
      else if (cell.includes("matr") || cell === "ra" || cell.includes("registro")) { matCol = j; }
      else if (cell.includes("email") || cell.includes("e-mail")) { emailCol = j; }
    }
    if (foundNameHeader) {
      headerRowIdx = i;
      break;
    }
  }

  // Lógica de Extração de Linhas
  if (headerRowIdx !== -1) {
    // A planilha TEM cabeçalho. Iteramos das linhas seguintes.
    for (let i = headerRowIdx + 1; i < aoa.length; i++) {
      const row = aoa[i];
      if (!row || row.length === 0) continue;
      
      const nome = String(row[nameCol] || "").trim();
      if (!nome) continue; // Nome é obrigatório
      
      const matricula = matCol !== -1 ? String(row[matCol] || "").trim() : "";
      const email = emailCol !== -1 ? String(row[emailCol] || "").trim() : "";
      
      alunos.push({ 
        nomeCompleto: nome,
        matricula: matricula || `ID-${Date.now()}-${i}`,
        email: email || `aluno${Date.now()}-${i}@escola.historiando.local`
      });
    }
  } else {
    // A planilha NÃO TEM cabeçalho (ex: é só uma lista jogada "Nome, Matrícula").
    // Vamos adivinhar coluna por coluna para cada linha.
    // Ignoramos a primeira linha se coincidir com o "templateForm" que já lemos a turma.
    let startIdx = isTemplateForm ? 2 : 0;
    
    for (let i = startIdx; i < aoa.length; i++) {
      const row = aoa[i];
      if (!row || row.length === 0) continue;
      
      let nome = "", matricula = "", email = "";
      
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || "").trim();
        if (!val) continue;
        
        if (val.includes("@")) {
          email = val;
        } else if (/^[\d.-]+$/.test(val) || val.toLowerCase().includes("ra")) {
          // É primordialmente número -> assume que é Matrícula
          if (!matricula) matricula = val;
        } else if (val.length > 2 && isNaN(val)) {
          // É puramente texto -> assume que é Nome
          if (!nome) nome = val;
        }
      }
      
      if (nome) {
        alunos.push({
          nomeCompleto: nome,
          matricula: matricula || `ID-${Date.now()}-${i}`,
          email: email || `aluno${Date.now()}-${i}@escola.historiando.local`
        });
      }
    }
  }

  if (alunos.length === 0) {
    throw new Error("Nenhum aluno identificado. Verifique se a planilha contém nomes legíveis.");
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
