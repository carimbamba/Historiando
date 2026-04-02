import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import LoginPage from "../pages/LoginPage";

describe("LoginPage (Auth)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  const renderPage = () => render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

  it("renderiza o formulário de login corretamente", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrar na plataforma/i })).toBeInTheDocument();
  });

  it("exibe erros de validação ao submeter vazio", async () => {
    renderPage();
    const btn = screen.getByRole("button", { name: /Entrar na plataforma/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/E-mail é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Senha deve ter no mínimo 6 caracteres/i)).toBeInTheDocument();
    });
  });

  it("realiza login usando mock do fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "fake-jwt", role: "professor", name: "Prof Tests" })
    });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/E-mail/i), "prof@teste.com");
    await user.type(screen.getByLabelText(/Senha/i), "Senh@123!");
    
    const btn = screen.getByRole("button", { name: /Entrar na plataforma/i });
    await user.click(btn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      // Confirma que a sessão foi para localStorage
      expect(localStorage.getItem("historiando_session")).toContain("fake-jwt");
    });
  });

  it("simula bloqueio de taxa após 5 tentativas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Invalid password" })
    });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/E-mail/i), "prof@teste.com");
    await user.type(screen.getByLabelText(/Senha/i), "Wrong111!");

    const btn = screen.getByRole("button", { name: /Entrar na plataforma/i });
    
    // Tentar 5 vezes
    for (let i = 0; i < 5; i++) {
      await user.click(btn);
    }

    await waitFor(() => {
      expect(screen.getByText(/Conta temporariamente bloqueada/i)).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });
});
