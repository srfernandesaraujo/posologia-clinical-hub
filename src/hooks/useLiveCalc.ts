import { useEffect, useRef } from "react";

// "Cálculo ao digitar" (plano de redesign, Fase 5). A calculadora continua com a
// função `calcular` e o botão Calcular (que mostra as mensagens de validação),
// mas a cada alteração dos campos o resultado é recalculado em silêncio:
// se os dados ainda estão incompletos ou inválidos, a execução automática não
// mostra erro, apenas esconde o resultado desatualizado.
// Verdadeiro só durante a execução automática: o histórico de cálculos não deve
// receber um registro a cada tecla, apenas quando a pessoa clica em Calcular.
let liveRunning = false;
export const isLiveCalcRunning = () => liveRunning;

export function useLiveCalc({
  run, deps, erro, clear, delay = 300,
}: {
  run: () => void;
  deps: readonly unknown[];
  erro: string;
  /** Limpa o erro e o resultado (chamado quando a execução automática falha). */
  clear: () => void;
  delay?: number;
}) {
  const runRef = useRef(run);
  const clearRef = useRef(clear);
  useEffect(() => { runRef.current = run; clearRef.current = clear; });
  const live = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = window.setTimeout(() => {
      live.current = true;
      liveRunning = true;
      try { runRef.current(); } finally { liveRunning = false; }
      window.setTimeout(() => { live.current = false; }, 100);
    }, delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (live.current && erro) {
      live.current = false;
      clearRef.current();
    }
  }, [erro]);
}
