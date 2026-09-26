/**
 * Regras de qualidade compartilhadas pelas funções que geram simuladores/casos por IA (generate-tool, generate-case).
 * Padrão de desafios da plataforma: ver .claude/skills/revisar-desafios-simulador/references/padrao-de-desafios.md
 */

// ─── Qualidade dos simuladores gerados (padrão de desafios da plataforma) ───
// Modelos de linguagem tendem a colocar a alternativa correta primeiro e mais longa. Como correctAnswers guarda TEXTOS
// (não índices), embaralhar as opções em código é seguro e elimina esse vício de posição de forma determinística.
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ABSOLUTOS = /\b(sempre|nunca|apenas|somente|definitivamente|em nenhum|todos os casos|qualquer)\b/i;

function isValidExplorer(p: any): boolean {
  const cfg = p?.explorerConfig;
  return !!cfg && Array.isArray(cfg.options) && cfg.options.length >= 2
    && cfg.options.every((o: any) => o && typeof o.label === "string" && Array.isArray(o.outcomes) && o.outcomes.length > 0);
}

export function sanitizeAndLintSteps(steps: any[]): { steps: any[]; warnings: string[] } {
  const warnings: string[] = [];
  let hasExplorer = false;
  const cleaned = (Array.isArray(steps) ? steps : []).map((step: any, si: number) => {
    const where = "Etapa " + (si + 1);
    const panels = (step.panels || [])
      .filter((p: any) => {
        if (p.type !== "explorer") return true;
        if (isValidExplorer(p)) return true;
        warnings.push(where + ": painel explorer inválido foi removido (precisa de 2+ opções, cada uma com resultados).");
        return false;
      })
      .map((p: any) => {
        if (p.type === "explorer") { hasExplorer = true; return p; }
        if ((p.type === "radio" || p.type === "checklist") && Array.isArray(p.options) && p.options.length > 1) {
          const opts = shuffle<string>(p.options);
          const correct: string[] = p.correctAnswers || [];
          if (p.type === "radio" && opts.length >= 3 && correct.length === 1) {
            const others = opts.filter((o) => !correct.includes(o));
            const mean = others.reduce((sum, o) => sum + o.length, 0) / Math.max(others.length, 1);
            const c = correct[0].length;
            if (c > Math.max(...others.map((o) => o.length)) && c > mean * 1.12) warnings.push(where + " (" + p.title + "): a alternativa correta é a mais longa; reescreva as demais para o mesmo comprimento.");
            if (c < Math.min(...others.map((o) => o.length)) && c < mean * 0.88) warnings.push(where + " (" + p.title + "): a alternativa correta é a mais curta.");
            if (!ABSOLUTOS.test(correct[0]) && others.filter((o) => ABSOLUTOS.test(o)).length >= 2) warnings.push(where + " (" + p.title + "): 2+ distratores usam absolutos (sempre/nunca/apenas...) e a correta não.");
          }
          if (p.type === "radio" && opts.length < 3) warnings.push(where + " (" + p.title + "): menos de 3 alternativas.");
          return { ...p, options: opts };
        }
        return p;
      });
    const hasExp = panels.some((p: any) => p.type === "explorer");
    const hasDecision = panels.some((p: any) => p.type === "radio" || p.type === "checklist");
    if (hasExp && !hasDecision) warnings.push(where + ": tem explorer mas nenhum painel de decisão (radio/checklist) para o aluno interpretar o que viu.");
    if (panels.length > 3) warnings.push(where + ": mais de 3 painéis na etapa.");
    return { ...step, panels };
  });
  if (!hasExplorer) warnings.push("Nenhuma etapa usa o painel explorer: o aluno não manipula nada antes de decidir (padrão de desafios da plataforma).");
  return { steps: cleaned, warnings };
}

/**
 * Perguntas de múltipla escolha com índice numérico (ex.: perguntasLegais do simulador de dispensação):
 * embaralha as opções e remapeia o índice da correta, para a posição não ficar sempre a mesma.
 */
export function shuffleIndexedQuestions(questions: any[], optionsKey = "opcoes", correctKey = "correta"): any[] {
  if (!Array.isArray(questions)) return questions;
  return questions.map((q: any) => {
    const opts = q?.[optionsKey];
    const ci = q?.[correctKey];
    if (!Array.isArray(opts) || opts.length < 2 || typeof ci !== "number" || ci < 0 || ci >= opts.length) return q;
    const order = shuffle<number>(opts.map((_: any, i: number) => i));
    return { ...q, [optionsKey]: order.map((i: number) => opts[i]), [correctKey]: order.indexOf(ci) };
  });
}
