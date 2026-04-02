const request = require("supertest");
const app = require("../app");
const pool = require("../db/client");

describe("Testes de Turmas (turmas.test.js)", () => {
  let token;
  let headers;

  beforeAll(async () => {
    await pool.query("TRUNCATE TABLE usuarios CASCADE;");
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Prof Teste Turmas",
      email: "profturmas@escola.br",
      username: "prof_turmas",
      password: "StrongPassword123!",
      role: "professor"
    });
    
    const login = await request(app).post("/api/auth/login").send({
      email: "profturmas@escola.br",
      password: "StrongPassword123!"
    });
    token = login.body.token;
    headers = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {
    // Clear turmas instead of users to keep token valid
    await pool.query("TRUNCATE TABLE turmas CASCADE;");
  });

  const bodyValido = {
    nome: "7º Ano B",
    serie: "7_fund",
    turno: "vespertino",
    maxAlunos: 30
  };

  it("Criar turma com dados válidos → sucesso", async () => {
    const res = await request(app).post("/api/turmas")
      .set(headers).send(bodyValido);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.turma).toBeDefined();
    expect(res.body.turma.nome).toBe(bodyValido.nome);
  });

  it("Criar turma com nome duplicado → erro", async () => {
    await request(app).post("/api/turmas").set(headers).send(bodyValido);
    const res = await request(app).post("/api/turmas").set(headers).send(bodyValido);
    
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/já existe/i);
  });

  it("Listar turmas do professor → retorna lista", async () => {
    await request(app).post("/api/turmas").set(headers).send(bodyValido);
    const res = await request(app).get("/api/turmas").set(headers);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.turmas).toBeInstanceOf(Array);
    expect(res.body.turmas.length).toBe(1);
  });

  it("Editar turma → sucesso", async () => {
    const criador = await request(app).post("/api/turmas").set(headers).send(bodyValido);
    const id = criador.body.turma.id;

    const res = await request(app).put(`/api/turmas/${id}`)
      .set(headers).send({ ...bodyValido, nome: "7º Ano Editado" });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.turma.nome).toBe("7º Ano Editado");
  });

  it("Deletar turma → sucesso", async () => {
    const criador = await request(app).post("/api/turmas").set(headers).send(bodyValido);
    const id = criador.body.turma.id;

    const res = await request(app).delete(`/api/turmas/${id}`).set(headers);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/removida/i);
    
    // Validate soft delete
    const val = await request(app).get("/api/turmas").set(headers);
    expect(val.body.turmas.length).toBe(0);
  });
});
