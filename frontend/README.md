# Historiando 📚

![Historiando Screenshot](assets/Captura%20de%20tela%20de%202026-03-06%2021-49-53.png)
*Interface moderna e intuitiva do Historiando em ação — Dashboard principal com gráficos e navegação.*

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.3.9-646CFF.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Revolucione o Ensino de História com Gamificação!** 🚀  
> Uma plataforma inovadora para gestão pedagógica e aprendizado interativo de História, combinando tecnologia e criatividade para tornar as aulas mais envolventes e eficazes.

---

## 🌟 Sobre o Projeto

O **Historiando** é uma aplicação web desenvolvida para professores e estudantes de História, visando transformar o ensino tradicional em uma experiência gamificada e interativa. Com ferramentas avançadas de gestão de sala de aula, analytics educacionais e módulos de conteúdo dinâmicos, o projeto está em sua fase inicial (MVP) e tem um enorme potencial de crescimento.

### 🎯 Missão
Facilitar o aprendizado de História através de:
- **Gamificação**: Mapa da sala interativo com drag-and-drop.
- **Análise de Dados**: Dashboards com gráficos e insights pedagógicos.
- **Gestão Eficiente**: Controle de ocorrências e presença em tempo real.

### 🚀 Status do Projeto
Este é um projeto em **desenvolvimento ativo**, com funcionalidades core implementadas. Estamos na versão inicial, mas com planos ambiciosos para expansão, incluindo integração com IA avançada, multiplayer online e módulos educacionais expansivos. Sua contribuição é essencial para acelerar o crescimento!

---

## 🚀 Rodando Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/carimbamba/Historiando.git
cd historiando

# 2. Instale as dependências
npm install

# 3. Suba o servidor de desenvolvimento
npm run dev

# 4. Abra no navegador
# → http://localhost:5173
```

---

## 📁 Estrutura do Projeto

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

## ✨ Funcionalidades Implementadas (Versão Inicial)

### 🏠 Dashboard
- 📊 Gráfico de presença semanal (Recharts AreaChart)
- 🏆 Top 5 alunos com barras de progresso
- 🔔 Feed de alertas filtrável (hoje / 7 dias)
- ⚡ Atalhos rápidos com navegação real

### 🗺️ Mapa da Sala
- 🎯 Grade 4×6 com drag-and-drop nativo
- 📍 Posicionar = registrar presença
- ↩️ **Undo/Redo** com `useReducer` (Ctrl+Z / Ctrl+Y)
- 🤖 Sugestão IA de posicionamento com badge "IA"
- 📜 Timeline drawer com histórico de movimentos
- 💬 Popover de aluno com ações (gratificar / advertir)

### 📝 Ocorrências
- 🟡 4 categorias visuais (Advertência, Gratificação, Observação, Notif. Azul)
- 📝 Templates de texto rápido por categoria
- 📎 Upload de fotos/vídeos com drag-and-drop e preview
- 📚 Histórico em accordion expansível com galeria
- 📈 Gráfico de tendências (30 dias) — Área ou Barras
- 🔍 Filtros por categoria + busca em tempo real

### 📊 Analytics
- 📋 Cards de turma clicáveis para comparação
- 📊 Gráficos reordenáveis via drag-and-drop
- 📥 Export CSV funcional (download real)
- ⚠️ Cards "Risco de Evasão" com badge pulsante
- 💡 Sugestões pedagógicas com sistema aplicar/dispensar

### 📖 Conteúdo
- 🎓 Grid de módulos temáticos com barra de progresso

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|-----------|
| **React 18** | Framework para construção de interfaces |
| **React Router DOM v6** | Roteamento SPA |
| **Context API** | Gerenciamento de estado global |
| **useReducer** | Lógica complexa (Undo/Redo) |
| **Recharts** | Gráficos interativos |
| **Vite** | Ferramenta de build rápida |

---

## 🌍 Deploy no Vercel 

https://historiando-rust.vercel.app/

---

## 🚀 Roadmap e Futuro

O Historiando está apenas começando! Aqui estão algumas ideias para expansão:

- 🤖 **IA Avançada**: Recomendações personalizadas para alunos
- 🌐 **Multiplayer**: Aulas colaborativas online
- 📱 **Mobile App**: Versão nativa para iOS/Android
- 🎮 **Gamificação Extra**: Badges, níveis e recompensas
- 📊 **Integrações**: Conexão com Google Classroom, Moodle
- 🌍 **Internacionalização**: Suporte a múltiplos idiomas

**Quer ajudar a construir o futuro do ensino?** Contribua conosco!

---

## 🤝 Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**[Pedro Vinicius Rodrigues]**  
[![GitHub](https://img.shields.io/badge/GitHub-black?style=flat&logo=github)](https://github.com/carimbamba)  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/pedro-vinicius-rodrigues-9b85422a5/)  

---

⭐ **Dê uma estrela se gostou do projeto!** Ajude-nos a crescer e inspirar mais educadores.
