-- ============================================================
-- Historiando — Migration 002: Turmas, Alunos e Presenças
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE serie_enum AS ENUM (
    '6_fund', '7_fund', '8_fund', '9_fund',
    '1_medio', '2_medio', '3_medio'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE turno_enum AS ENUM ('matutino', 'vespertino', 'noturno');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_presenca_enum AS ENUM ('presente', 'ausente', 'justificado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. turmas ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS turmas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id  UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome          VARCHAR(100) NOT NULL,
  serie         serie_enum   NOT NULL,
  turno         turno_enum   NOT NULL DEFAULT 'matutino',
  max_alunos    INTEGER      NOT NULL DEFAULT 30 CHECK (max_alunos > 0 AND max_alunos <= 50),
  descricao     TEXT,
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP    NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP    NOT NULL DEFAULT NOW(),

  UNIQUE (professor_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_turmas_professor ON turmas (professor_id, ativo);

-- ── 2. alunos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alunos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id              UUID         NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  nome_completo         VARCHAR(255) NOT NULL,
  matricula             VARCHAR(50)  NOT NULL,
  email                 VARCHAR(255) NOT NULL,
  data_nascimento       DATE,
  responsavel_nome      VARCHAR(255),
  responsavel_telefone  VARCHAR(20),
  ativo                 BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em             TIMESTAMP    NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMP    NOT NULL DEFAULT NOW(),

  UNIQUE (turma_id, matricula)
);

CREATE INDEX IF NOT EXISTS idx_alunos_turma   ON alunos (turma_id, ativo);
CREATE INDEX IF NOT EXISTS idx_alunos_email   ON alunos (email);

-- ── 3. presencas ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS presencas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id      UUID                  NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id      UUID                  NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  data          DATE                  NOT NULL,
  status        status_presenca_enum  NOT NULL DEFAULT 'ausente',
  observacoes   TEXT,
  criado_em     TIMESTAMP             NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP             NOT NULL DEFAULT NOW(),

  UNIQUE (aluno_id, turma_id, data)
);

CREATE INDEX IF NOT EXISTS idx_presencas_turma_data  ON presencas (turma_id, data);
CREATE INDEX IF NOT EXISTS idx_presencas_aluno       ON presencas (aluno_id, data);
