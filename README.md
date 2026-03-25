# Historiando — Monorepo

Plataforma de gestão pedagógica e ensino gamificado de História.

## Estrutura

```
historiando-v2/
├── frontend/     # React + Vite (interface web)
├── backend/      # Node.js + Express (API REST — JWT, bcrypt, PostgreSQL)
└── package.json  # npm workspaces root
```

## Requisitos

- Node.js >= 18
- PostgreSQL (Neon ou local)

## Setup rápido

```bash
# 1. Instalar dependências de todos os pacotes
npm install

# 2. Configurar variáveis de ambiente do backend
cp backend/.env.example backend/.env
# → edite backend/.env com sua DATABASE_URL e JWT_SECRET

# 3. Rodar a migration (cria as tabelas no banco)
npm run migrate

# 4. Iniciar backend (porta 3001) e frontend (porta 5173) em terminais separados
npm run dev:backend
npm run dev:frontend
```

## Pacotes

| Pacote | Tecnologia | Porta |
|--------|-----------|-------|
| `frontend` | React 18 + Vite + react-hook-form + Zod | 5173 |
| `backend`  | Express + bcryptjs + jsonwebtoken + pg  | 3001 |
