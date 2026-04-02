const request = require("supertest");
const app = require("../app");
const pool = require("../db/client");

describe("Testes de Alunos (alunos.test.js)", () => {
  let token;
  let headers;
  let turmaId;

  beforeAll(async () => {
    await pool.query("TRUNCATE TABLE usuarios CASCADE;");
    await pool.query("TRUNCATE TABLE turmas CASCADE;");
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Prof Alunos", email: "profalunos@escola.br",
      username: "prof_alunos", password: "StrongPassword123!", role: "professor"
    });
    
    const login = await request(app).post("/api/auth/login").send({
      email: "profalunos@escola.br", password: "StrongPassword123!"
    });
    token = login.body.token;
    headers = { Authorization: `Bearer ${token}` };

    const turmaReq = await request(app).post("/api/turmas")
      .set(headers).send({ nome: "8º Ano B", serie: "8_fund", turno: "vespertino", maxAlunos: 30 });
    turmaId = turmaReq.body.turma.id;
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE alunos CASCADE;");
  });

  const bodyValido = {
    nomeCompleto: "João Silva",
    matricula: "2026101",
    email: "joao.silva@escola.br",
    responsavelNome: "Maria Silva",
    responsavelTelefone: "(11) 99999-9999"
  };

  it("Adicionar aluno à turma → sucesso", async () => {
    const res = await request(app).post(`/api/turmas/${turmaId}/alunos`)
      .set(headers).send(bodyValido);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.aluno.nome_completo).toBe(bodyValido.nomeCompleto);
  });

  it("Adicionar aluno com matrícula duplicada → erro", async () => {
    await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send(bodyValido);
    const res = await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send({
      ...bodyValido, nomeCompleto: "Outro Nome"
    });
    
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/matrícula/i);
  });

  it("Listar alunos da turma → retorna lista", async () => {
    await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send(bodyValido);
    const res = await request(app).get(`/api/turmas/${turmaId}/alunos`).set(headers);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.alunos).toBeInstanceOf(Array);
    expect(res.body.alunos.length).toBe(1);
  });

  it("Editar aluno → sucesso", async () => {
    const criador = await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send(bodyValido);
    const id = criador.body.aluno.id;

    const res = await request(app).put(`/api/turmas/${turmaId}/alunos/${id}`)
      .set(headers).send({ ...bodyValido, nomeCompleto: "João da Silva Sauro" });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.aluno.nome_completo).toBe("João da Silva Sauro");
  });

  it("Remover aluno → sucesso", async () => {
    const criador = await request(app).post(`/api/turmas/${turmaId}/alunos`).set(headers).send(bodyValido);
    const id = criador.body.aluno.id;

    const res = await request(app).delete(`/api/turmas/${turmaId}/alunos/${id}`).set(headers);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/removido/i);
    
    // soft delete check
    const list = await request(app).get(`/api/turmas/${turmaId}/alunos`).set(headers);
    expect(list.body.alunos.length).toBe(0);
  });
});
