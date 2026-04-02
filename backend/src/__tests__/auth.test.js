const request = require("supertest");
const app = require("../app");
const pool = require("../db/client");

describe("Testes de Autenticação e Senha", () => {
  
  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE usuarios CASCADE;");
  });

  const validUser = {
    fullName: "João Professor",
    email: "joao@escola.com",
    username: "joao_prof",
    password: "StrongPassword123!",
    role: "professor"
  };

  describe("Testes de Validação de Senha", () => {
    it("Senha com 12+ caracteres → válida", async () => {
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, password: "StrongPassword123!"
      });
      expect(res.statusCode).toBe(201);
    });

    it("Senha com menos de 12 caracteres → inválida", async () => {
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, password: "Short1!"
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/mínimo 12 caracteres/);
    });

    it("Senha sem maiúscula → inválida", async () => {
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, password: "weakpassword123!"
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/letra maiúscula/);
    });

    it("Senha sem número → inválida", async () => {
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, password: "StrongPassword!"
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/um número/);
    });

    it("Senha sem caractere especial → inválida", async () => {
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, password: "StrongPassword123"
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/caractere especial/);
    });

    it("Senha com sequência comum → inválida", async () => {
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, password: "SecretPassword123!"
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/sequência comum/);
    });
  });

  describe("Fluxo de Cadastro e Login", () => {
    it("Cadastro com dados válidos → sucesso", async () => {
      const res = await request(app).post("/api/auth/register").send(validUser);
      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe(validUser.email);
    });

    it("Cadastro com email duplicado → erro", async () => {
      await request(app).post("/api/auth/register").send(validUser);
      const res = await request(app).post("/api/auth/register").send({
        ...validUser, username: "another_user"
      });
      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/já está cadastrado/);
    });

    it("Login com credenciais válidas → retorna JWT", async () => {
      await request(app).post("/api/auth/register").send(validUser);
      const res = await request(app).post("/api/auth/login").send({
        email: validUser.email,
        password: validUser.password
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it("Login com senha incorreta → erro", async () => {
      await request(app).post("/api/auth/register").send(validUser);
      const res = await request(app).post("/api/auth/login").send({
        email: validUser.email,
        password: "WrongSecret123!"
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Credenciais inválidas");
    });
  });

  describe("Recuperação de Senha", () => {
    it("Solicitar reset e usar token válido → sucesso", async () => {
      await request(app).post("/api/auth/register").send(validUser);
      
      const reqReset = await request(app).post("/api/auth/request-reset").send({ email: validUser.email });
      expect(reqReset.statusCode).toBe(200);
      const token = reqReset.body.test_token; // Exposed only for test envs
      
      const resetRes = await request(app).post("/api/auth/reset").send({
        token,
        newPassword: "BrandNewSecret123!"
      });
      expect(resetRes.statusCode).toBe(200);

      const loginRes = await request(app).post("/api/auth/login").send({
        email: validUser.email,
        password: "BrandNewSecret123!"
      });
      expect(loginRes.statusCode).toBe(200);
    });

    it("Reset de senha com token inválido/expirado → erro", async () => {
      const res = await request(app).post("/api/auth/reset").send({
        token: "fake-uuid-token",
        newPassword: "BrandNewSecret123!"
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Token inválido/);
    });

    it("Reutilização de senha anterior → inválida", async () => {
      await request(app).post("/api/auth/register").send(validUser);
      const reqReset = await request(app).post("/api/auth/request-reset").send({ email: validUser.email });
      const token = reqReset.body.test_token;
      
      const resetRes = await request(app).post("/api/auth/reset").send({
        token,
        newPassword: validUser.password // trying to reuse the very first password
      });
      expect(resetRes.statusCode).toBe(400);
      expect(resetRes.body.code).toBe("password_reused");
    });
  });
});
