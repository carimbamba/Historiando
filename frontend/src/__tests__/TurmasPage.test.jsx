import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import TurmasPage from "../pages/TurmasPage";

const mockTurmas = [
  { id: "1", nome: "Turma A", serie: "1_medio", turno: "matutino", total_alunos: 25, ativo: true },
  { id: "2", nome: "Turma B", serie: "9_fund", turno: "vespertino", total_alunos: 30, ativo: true }
];

describe("TurmasPage (Dashboard de Turmas)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("historiando_session", JSON.stringify({ token: "fake-jwt", name: "Prof Tests" }));

    // Mock do fetch global
    global.fetch = vi.fn((url) => {
      if (url.includes("/api/turmas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ turmas: mockTurmas })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  const renderPage = () => render(
    <MemoryRouter>
      <TurmasPage />
    </MemoryRouter>
  );

  it("renderiza cabeçalho e saudação do professor", async () => {
    renderPage();
    // A saudação depende do nome no localstorage mockado
    expect(screen.getByText(/Prof Tests/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Turmas e Diários/i })).toBeInTheDocument();
  });

  it("busca as turmas na API e exibe os cards corretos", async () => {
    renderPage();
    
    // Mostra loading inicial
    expect(screen.getByText(/Carregando turmas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Carregando turmas/i)).not.toBeInTheDocument();
      expect(screen.getByText("Turma A")).toBeInTheDocument();
      expect(screen.getByText("Turma B")).toBeInTheDocument();
    });

    // Filtros de contagem no card
    expect(screen.getByText("25 alunos")).toBeInTheDocument();
  });

  it("abre o modal de nova turma ao clicar no botão Nova Turma", async () => {
    renderPage();
    const user = userEvent.setup();

    const btnNova = screen.getByRole("button", { name: /\+ Nova Turma/i });
    await user.click(btnNova);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Criar Nova Turma" })).toBeInTheDocument();
    });
  });

  it("busca turmas pelo campo de pesquisa", async () => {
    renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Turma A")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome/i);
    await user.type(searchInput, "Turma B");

    // "Turma A" sumirá
    await waitFor(() => {
      expect(screen.queryByText("Turma A")).not.toBeInTheDocument();
      expect(screen.getByText("Turma B")).toBeInTheDocument();
    });
  });
});
