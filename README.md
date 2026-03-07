# Historiando 📚

> Plataforma de gestão pedagógica e ensino gamificado de História  
> React 18 · React Router DOM v6 · Context API · Recharts · Vite

---

## 🚀 Rodando localmente

```bash
# 1. Instale as dependências
npm install

# 2. Suba o servidor de desenvolvimento
npm run dev

# 3. Abra no navegador
# → http://localhost:5173
```

---

## 📁 Estrutura do projeto

```
historiando/
├── index.html                   ← Entry point HTML (RAIZ, não em /public!)
├── vite.config.js
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                 ← Providers + BrowserRouter
    ├── App.jsx                  ← Routes (React Router v6)
    ├── styles/
    │   └── global.css           ← Reset, animações, scrollbars
    ├── utils/
    │   └── theme.js             ← makeTheme() — design tokens
    ├── context/
    │   ├── ThemeContext.jsx      ← Dark/Light mode global
    │   └── AppContext.jsx        ← Alunos, ocorrências, turma ativa
    ├── components/
    │   ├── Sidebar.jsx           ← Navegação lateral persistente
    │   └── AvatarCircle.jsx      ← Avatar reutilizável
    └── pages/
        ├── Dashboard.jsx         ← Visão geral + gráfico + alertas
        ├── MapaSala.jsx          ← Mapa drag-drop + undo/redo + IA
        ├── Ocorrencias.jsx       ← Formulário + accordion + chart
        ├── Analytics.jsx         ← Comparação + risco + sugestões
        └── Conteudo.jsx          ← Módulos de História
```

---

## ✨ Funcionalidades implementadas

### Dashboard
- Gráfico de presença semanal (Recharts AreaChart)
- Top 5 alunos com barras de progresso
- Feed de alertas filtrável (hoje / 7 dias)
- Atalhos rápidos com navegação real

### Mapa da Sala
- Grade 4×6 com drag-and-drop nativo
- Posicionar = registrar presença
- **Undo/Redo** com `useReducer` (Ctrl+Z / Ctrl+Y)
- Sugestão IA de posicionamento com badge "IA"
- Timeline drawer com histórico de movimentos
- Popover de aluno com ações (gratificar / advertir)

### Ocorrências
- 4 categorias visuais (Advertência, Gratificação, Observação, Notif. Azul)
- Templates de texto rápido por categoria
- Upload de fotos/vídeos com drag-and-drop e preview
- Histórico em accordion expansível com galeria
- Gráfico de tendências (30 dias) — Área ou Barras
- Filtros por categoria + busca em tempo real

### Analytics
- Cards de turma clicáveis para comparação
- Gráficos reordenáveis via drag-and-drop
- Export CSV funcional (download real)
- Cards "Risco de Evasão" com badge pulsante
- Sugestões pedagógicas 💡 com sistema aplicar/dispensar

### Conteúdo
- Grid de módulos temáticos com barra de progresso

---

## 🛠️ Tecnologias

| Tech | Uso |
|------|-----|
| **React 18** | Componentes, hooks |
| **React Router DOM v6** | SPA routing (useNavigate, useLocation) |
| **Context API** | Estado global (ThemeContext + AppContext) |
| **useReducer** | Undo/Redo no Mapa da Sala |
| **Recharts** | Gráficos interativos |
| **Vite** | Dev server + bundler |

---

## 📦 Deploy no Vercel (gratuito)

1. Suba o projeto no GitHub
2. Acesse vercel.com → Import Project → selecione o repositório
3. Clique Deploy — pronto em ~2 minutos

---

## 👨‍💻 Autor

**[Seu Nome]**  
[![GitHub](https://img.shields.io/badge/GitHub-black?style=flat&logo=github)](https://github.com/SEU_USUARIO)
