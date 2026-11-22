import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useMovableContent } from "./ChallengeDock";

// Garante a promessa central do modo flutuante: alternar entre "ao lado" e
// "janela" move o desafio sem desmontá-lo — o aluno continua na mesma questão.

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>questão {n}</button>;
}

function Harness() {
  const [where, setWhere] = useState<"side" | "float">("side");
  const { portal, slotRef } = useMovableContent(<Counter />);
  return (
    <div>
      <button onClick={() => setWhere(where === "side" ? "float" : "side")}>alternar</button>
      {where === "side" ? <section data-testid="side"><div ref={slotRef} /></section> : <aside data-testid="float"><div ref={slotRef} /></aside>}
      {portal}
    </div>
  );
}

describe("useMovableContent", () => {
  it("move o conteúdo entre áreas sem perder o estado", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("questão 0"));
    fireEvent.click(screen.getByText("questão 1"));
    expect(screen.getByTestId("side").textContent).toContain("questão 2");

    fireEvent.click(screen.getByText("alternar"));
    expect(screen.getByTestId("float").textContent).toContain("questão 2");

    fireEvent.click(screen.getByText("questão 2"));
    fireEvent.click(screen.getByText("alternar"));
    expect(screen.getByTestId("side").textContent).toContain("questão 3");
  });
});
