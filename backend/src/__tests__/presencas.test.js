const request = require("supertest");
const app = require("../app");
const pool = require("../db/client");

describe("Testes de Presença (presencas.test.js)", () => {
  let token;
  let headers;
  let turmaId;
  let alunoId;

  beforeAll(async () => {
    await pool.query("TRUNCATE TABLE usuarios CASCADE;");
    await pool.query("TRUNCATE TABLE turmas CASCADE;");
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Prof Presencas", email: "profpresencas@escola.br",
      username: "prof_presencas", password: "StrongPassword123!", role: "professor"
    });
    
    const login = await request(app).post("/api/auth/login").send({
      email: "profpresencas@escola.br", password: "StrongPassword123!"
    });
    token = login.body.token;
    headers = { Authorization: `Bearer ${token}` };

    const turmaReq = await request(app).post("/api/turmas")
      .set(headers).send({ nome: "1º Ano Medio", serie: "1_medio", turno: "matutino", maxAlunos: 30 });
    turmaId = turmaReq.body.turma.id;

    const alunoReq = await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send({
      nomeCompleto: "Aluno Presença 1", matricula: "PRE20261", email: "pre1@escola.br"
    });
    alunoId = alunoReq.body.aluno.id;
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE presencas CASCADE;");
  });

  const hoje = new Date().toISOString().slice(0, 10);

  it("Salvar presença → sucesso", async () => {
    const res = await request(app).post("/api/presencas")
      .set(headers).send({
        turmaId,
        data: hoje,
        presencas: [{ alunoId, status: "presente", observacoes: "Chegou cedo" }]
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  it("Carregar presença do dia → retorna dados", async () => {
    // Insere primeiro
    await request(app).post("/api/presencas").set(headers).send({
      turmaId, data: hoje, presencas: [{ alunoId, status: "ausente" }]
    });

    const res = await request(app).get(`/api/presencas?turmaId=${turmaId}&data=${hoje}`).set(headers);
    expect(res.statusCode).toBe(200);
    expect(res.body.presencas).toBeInstanceOf(Array);
    expect(res.body.presencas[0].status).toBe("ausente");
  });

  it("Marcar todos como presentes (salvar multiplos) → sucesso", async () => {
    // Insere um segundo aluno
    const a2 = await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send({
      nomeCompleto: "Aluno Presença 2", matricula: "PRE20262", email: "pre2@escola.br"
    });

    const res = await request(app).post("/api/presencas").set(headers).send({
      turmaId, data: hoje, 
      presencas: [
        { alunoId, status: "presente" },
        { alunoId: a2.body.aluno.id, status: "presente" }
      ]
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it("Exportar chamada → gera arquivo Excel", async () => {
    await request(app).post("/api/presencas").set(headers).send({
      turmaId, data: hoje, presencas: [{ alunoId, status: "justificado" }]
    });

    const res = await request(app).get(`/api/presencas/exportar?turmaId=${turmaId}&data=${hoje}`).set(headers);
    
    // Verifica Buffer recebido usando o headers mime type do ExcelJS
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.body instanceof Buffer).toBeTruthy();
  });
});
