-- ============================================================
-- Historiando — Migration 001: Auth tables
-- ============================================================

-- Enable uuid_generate_v4() extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. usuarios ──────────────────────────────────────────────
CREATE TYPE role_enum AS ENUM ('professor', 'coordenador', 'aluno', 'admin');
CREATE TYPE evento_enum AS ENUM ('login_sucesso', 'login_falha', 'cadastro', 'reset_senha');

CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  nome_completo VARCHAR(255) NOT NULL,
  role          role_enum    NOT NULL DEFAULT 'professor',
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP    NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP    NOT NULL DEFAULT NOW(),
  ultimo_login  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email    ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios (username);
CREATE INDEX IF NOT EXISTS idx_usuarios_role     ON usuarios (role);

-- ── 2. senhas_usuarios ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS senhas_usuarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  hash_senha  VARCHAR(255) NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW(),
  ativo       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_senhas_usuario_ativo ON senhas_usuarios (usuario_id, ativo);

-- ── 3. historico_senhas ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS historico_senhas (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id           UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  hash_senha_anterior  VARCHAR(255) NOT NULL,
  data_alteracao       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_usuario ON historico_senhas (usuario_id, data_alteracao DESC);

-- ── 4. tokens_reset_senha ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens_reset_senha (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expira_em   TIMESTAMP    NOT NULL,
  usado       BOOLEAN      NOT NULL DEFAULT FALSE,
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_token      ON tokens_reset_senha (token);
CREATE INDEX IF NOT EXISTS idx_reset_usuario    ON tokens_reset_senha (usuario_id, usado, expira_em);

-- ── 5. logs_autenticacao ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs_autenticacao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  email_tentativa VARCHAR(255),
  tipo_evento     evento_enum   NOT NULL,
  ip_origem       VARCHAR(45),
  user_agent      TEXT,
  criado_em       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_usuario_data  ON logs_autenticacao (usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_evento_data   ON logs_autenticacao (tipo_evento, criado_em DESC);
