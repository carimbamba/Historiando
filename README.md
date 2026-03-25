<div align="center">
  <img src="./frontend/public/favicon.svg" alt="Historiando Logo" width="120" />

  # Historiando 🏛️

  **Plataforma de Gestão Pedagógica e Ensino Gamificado de História**

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

  [🚀 Começando](#-como-rodar-o-projeto) •
  [✨ Funcionalidades](#-funcionalidades) •
  [🛠️ Arquitetura](#️-arquitetura-e-tecnologias) •
  [📸 Tela](#-visualização)
</div>

---

## 📖 O Projeto

O **Historiando** é um ecossistema educacional completo focado no ensino de História. A plataforma une um ambiente imersivo para os **alunos** com um painel de gestão poderoso para **professores e coordenadores**, permitindo acompanhar engajamento, aplicar conteúdos temáticos e gerenciar turmas com eficiência.

Foi projetado com foco em **segurança** e **usabilidade**, utilizando o que há de mais moderno em design de interfaces (UI/UX) e arquitetura de autenticação (JWT + Bcrypt + Neon Postgres).

---

## 📸 Visualização

Aqui está uma prévia de como o projeto é apresentado visualmente:

<div align="center">
  <img src="./frontend/assets/Captura%20de%20tela%20de%202026-03-06%2021-49-53.png" width="800" alt="Painel do Historiando" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
  
  *Interface principal com autenticação dinâmica e gestão responsiva.*
</div>

---

## ✨ Funcionalidades

### 🔐 Segurança e Autenticação
- **Login e Cadastro Real-time:** Sistema de registro integrado com verificação de conflitos (email/usuário únicos).
- **Recuperação de Senha Segura:** Tokens criptografados de uso único com expiração em 1 hora, impedindo reuso.
- **Histórico de Senhas:** Validação que impede a reutilização das 5 últimas senhas cadastradas.
- **Proteção Anti-Brute Force:** Rate-Limiting integrado no backend.
- **Auditoria Completa:** Registro no banco de dados de todas as tentativas de acesso, resets e cadastros (Tabela `logs_autenticacao`).

### 📚 Gestão Escolar (Múltiplos Perfis)
- `Professor`, `Coordenador`, `Aluno` ou `Admin` — cada perfil gerencia ou consome conteúdos específicos com base no nível de permissão (RBAC).

---

## 🛠️ Arquitetura e Tecnologias

Este repositório foi reestruturado de forma modular (Padrão **Monorepo**), facilitando o desenvolvimento simultâneo entre frente e traseira da aplicação.

### 🎨 Frontend (React + Vite)
- **Frameworks/Bibliotecas:** React 18, React Router DOM, React Hook Form
- **Validação de Schema:** Zod
- **Estilizações Dinâmicas:** CSS Moderno, Animações e Interfaces Responsivas

### ⚙️ Backend (Node.js + Express)
- **Servidor:** Express.js com arquitetura MVC voltada aos serviços (`/routes`, `/services`, `/middleware`).
- **Autenticação:** JWT (JSON Web Tokens) com ciclo de vida de 24h + Bcrypt com Salt Round 12.
- **Banco de Dados:** **PostgreSQL** hospedado na Neon.
- **Segurança:** Helmet e Express-Rate-Limit.

---

## 🚀 Como Rodar o Projeto

Siga as instruções abaixo para preparar o ambiente de desenvolvimento em sua máquina local.

### 1. Pré-requisitos
- **Node.js**: Versão `>= 18`
- **PostgreSQL**: Credenciais de um banco de dados rodando (local ou nuvem como [Neon](https://neon.tech/)).

### 2. Passo a Passo

Clone o repositório e instale todas as dependências do monorepo de uma vez:

```bash
git clone https://github.com/carimbamba/Historiando.git
cd Historiando
npm install
```

Configure as variáveis de ambiente necessárias para o backend:

```bash
cp backend/.env.example backend/.env
```
> ⚠️ **Importante:** Abra o arquivo `backend/.env` e substitua a `DATABASE_URL` com sua connection string real do PostgreSQL e gere um `JWT_SECRET` válido.

Rode as migrações (Isso criará automaticamente as 5 tabelas necessárias no seu banco):

```bash
npm run migrate
```

Inicie os servidores paralelamente:

**Em um terminal (inicia a API):**
```bash
npm run dev:backend
# Disponível em: http://localhost:3001
```

**Em um segundo terminal (inicia o React):**
```bash
npm run dev:frontend
# Disponível em: http://localhost:5173
```

---

<div align="center">
  Desenvolvido com dedicação para uma melhor didática histórica. 🏺✨
</div>
