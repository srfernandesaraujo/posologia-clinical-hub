import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useLiveCalc, isLiveCalcRunning } from "./useLiveCalc";

function setup() {
  const seen: boolean[] = [];
  return renderHook(() => {
    const [v, setV] = useState("");
    const [res, setRes] = useState<number | null>(null);
    const [erro, setErro] = useState("");
    const run = () => {
      seen.push(isLiveCalcRunning());
      if (!v) { setErro("Preencha"); return; }
      setRes(Number(v) * 2);
    };
    useLiveCalc({ run, deps: [v], erro, clear: () => { setErro(""); setRes(null); } });
    return { v, setV, res, erro, run, seen };
  });
}

describe("useLiveCalc", () => {
  it("recalcula ao digitar e sinaliza a execução automática", () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => { result.current.setV("4"); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current.res).toBe(8);
    expect(result.current.seen).toEqual([true]);
    vi.useRealTimers();
  });

  it("não mostra erro quando os dados ficam incompletos e esconde o resultado velho", () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => { result.current.setV("4"); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(150); });
    act(() => { result.current.setV(""); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current.erro).toBe("");
    expect(result.current.res).toBeNull();
    vi.useRealTimers();
  });
});
