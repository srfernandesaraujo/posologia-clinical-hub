import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { BUILT_IN_CASES } from "@/lib/cadeiaSuprimentos/casos";
import BancadaSelecao from "./BancadaSelecao";
import BancadaProgramacao from "./BancadaProgramacao";
import BancadaAquisicao from "./BancadaAquisicao";
import BancadaArmazenamento from "./BancadaArmazenamento";
import BancadaDistribuicao from "./BancadaDistribuicao";
import BancadaDispensacao from "./BancadaDispensacao";

// jsdom não tem ResizeObserver nem layout: os componentes Radix (Slider/Select) e o Recharts precisam disso.
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? RO;
(Element.prototype as any).scrollIntoView = (Element.prototype as any).scrollIntoView ?? (() => {});
(Element.prototype as any).hasPointerCapture = (Element.prototype as any).hasPointerCapture ?? (() => false);

const ultimoEstado = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls[fn.mock.calls.length - 1][0] as Record<string, any>;

describe("bancadas do simulador de Cadeia de Suprimentos (renderização e interação)", () => {
  it("Seleção: marcar uma solicitação recalcula o custo e o estado enviado ao Modo Desafio", () => {
    const onState = vi.fn();
    render(<BancadaSelecao caso={BUILT_IN_CASES[0]} onState={onState} />);
    expect(screen.getByText("Elenco em revisão (REMUME)")).toBeTruthy();
    expect(ultimoEstado(onState).etapa).toBe("selecao");
    expect(Math.round(ultimoEstado(onState).resultado.custoAnualTotal)).toBe(224760);
    fireEvent.click(screen.getByLabelText("Incluir Espironolactona 25 mg (comprimido)"));
    expect(ultimoEstado(onState).incluidos).toContain("espironolactona");
    expect(Math.round(ultimoEstado(onState).resultado.custoAnualTotal)).toBe(231240);
    expect(screen.getByText("R$ 231.240")).toBeTruthy();
    cleanup();
  });

  it("Programação: mostra os indicadores e guarda os parâmetros de cada item", () => {
    const onState = vi.fn();
    render(<BancadaProgramacao caso={BUILT_IN_CASES[1]} onState={onState} />);
    const e = ultimoEstado(onState);
    expect(e.etapa).toBe("programacao");
    expect(Object.keys(e.itens)).toEqual(["losartana", "amoxicilina", "insulina"]);
    expect(e.itens.losartana.resultado.rupturaDias).toBe(13);
    expect(screen.getByText("Os 12 meses seguintes")).toBeTruthy();
    expect(screen.getByText("Pedidos no ano")).toBeTruthy();
    cleanup();
  });

  it("Aquisição: desmarcar cotações muda o preço de referência; classificar muda a vencedora", () => {
    const onState = vi.fn();
    render(<BancadaAquisicao caso={BUILT_IN_CASES[2]} onState={onState} />);
    expect(ultimoEstado(onState).precoRef).toBe(24.35);
    for (const fonte of ["Tabela CMED (preço máximo de venda ao governo)", "Compra emergencial de outro órgão (dispensa por emergência)", "Ata de registro de preços vencida há 2 anos"]) {
      fireEvent.click(screen.getByLabelText(`Usar a cotação: ${fonte}`));
    }
    expect(ultimoEstado(onState).precoRef).toBe(21.94);
    expect(ultimoEstado(onState).vencedorId).toBe("p1");
    for (const f of ["Distribuidora Alfa Saúde", "Beta Farma", "Ômega Distribuidora"]) fireEvent.click(screen.getByLabelText(`Classificar a proposta de ${f}`));
    expect(ultimoEstado(onState).vencedorId).toBe("p4");
    cleanup();
  });

  it("Armazenamento: envia a exposição e as avaliações por lote", () => {
    const onState = vi.fn();
    render(<BancadaArmazenamento caso={BUILT_IN_CASES[3]} onState={onState} />);
    const e = ultimoEstado(onState);
    expect(e.etapa).toBe("armazenamento");
    expect(e.transferenciaH).toBe(7);
    expect(e.exposicao.picoC).toBe(12);
    expect(Object.keys(e.avaliacoes)).toEqual(["insulina", "vacina", "ocitocina"]);
    expect(screen.getByText("Conduta por lote")).toBeTruthy();
    cleanup();
  });

  it("Distribuição: o estado inicial não distribui nada e traz o resultado por UBS", () => {
    const onState = vi.fn();
    render(<BancadaDistribuicao caso={BUILT_IN_CASES[4]} onState={onState} />);
    const e = ultimoEstado(onState);
    expect(e.etapa).toBe("distribuicao");
    expect(e.criterio).toBe("");
    expect(e.resultado.totalAlocado).toBe(0);
    expect(e.resultado.linhas).toHaveLength(6);
    expect(screen.getByText("Cobertura resultante")).toBeTruthy();
    cleanup();
  });

  it("Dispensação: receita, cartões dos três itens e estado inicial sem acertos", () => {
    const onState = vi.fn();
    render(<BancadaDispensacao caso={BUILT_IN_CASES[5]} onState={onState} />);
    const e = ultimoEstado(onState);
    expect(e.etapa).toBe("dispensacao");
    expect(e.todosCorretos).toBe(false);
    expect(screen.getByText("Receita apresentada")).toBeTruthy();
    expect(screen.getAllByText(/Estoque na farmácia/).length).toBe(3);
    expect(within(document.body).getByText(/há 15 dias/)).toBeTruthy();
    cleanup();
  });
});
