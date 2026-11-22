import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

let shouldThrow = true;

function Bomba() {
  if (shouldThrow) throw new Error("falha de teste");
  return <p>Conteúdo normal</p>;
}

describe("ErrorBoundary", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    shouldThrow = true;
    // React e o próprio boundary registram o erro no console; silencia no teste.
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("mostra o fallback quando um filho lança erro no render", () => {
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Algo deu errado nesta tela")).toBeInTheDocument();
    expect(screen.getByText("falha de teste")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voltar ao Painel/ })).toHaveAttribute("href", "/dashboard");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("'Tentar de novo' re-renderiza os filhos", () => {
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo/ }));
    expect(screen.getByText("Conteúdo normal")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("variante inline mostra o aviso compacto", () => {
    render(
      <ErrorBoundary variant="inline" inlineMessage="O desafio encontrou um erro — recarregue a página.">
        <Bomba />
      </ErrorBoundary>,
    );
    expect(screen.getByText("O desafio encontrou um erro — recarregue a página.")).toBeInTheDocument();
    expect(screen.queryByText("Algo deu errado nesta tela")).not.toBeInTheDocument();
  });

  it("renderiza os filhos normalmente quando não há erro", () => {
    shouldThrow = false;
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Conteúdo normal")).toBeInTheDocument();
  });
});
