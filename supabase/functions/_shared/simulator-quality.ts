/**
 * Regras de qualidade compartilhadas pelas funções que geram simuladores/casos por IA (generate-tool, generate-case).
 * Padrão de desafios da plataforma: ver .claude/skills/revisar-desafios-simulador/references/padrao-de-desafios.md
 */
import { checkExpr, evalExpr as evalNum } from "./safe-expr.ts";

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

/**
 * Painel "modelo" (parâmetros ajustáveis + fórmulas): devolve os problemas que o tornam inutilizável (`fatais`) e os que
 * só o enfraquecem (`avisos`). Toda fórmula é avaliada com os valores padrão e nos extremos de cada controle.
 */
export function validarModelo(p: any): { fatais: string[]; avisos: string[] } {
  const fatais: string[] = [];
  const avisos: string[] = [];
  const cfg = p?.modeloConfig;
  if (!cfg || typeof cfg !== "object") return { fatais: ["modeloConfig ausente"], avisos };
  const inputs = Array.isArray(cfg.inputs) ? cfg.inputs : [];
  const outputs = Array.isArray(cfg.outputs) ? cfg.outputs : [];
  if (inputs.length < 1 || inputs.length > 5) fatais.push("inputs precisa de 1 a 5 controles");
  if (outputs.length < 1 || outputs.length > 6) fatais.push("outputs precisa de 1 a 6 resultados");
  const nomes = inputs.map((i: any) => i?.name);
  if (new Set(nomes).size !== nomes.length) fatais.push("inputs com name repetido");
  for (const i of inputs) {
    if (typeof i?.name !== "string" || !/^[a-z_][a-z0-9_]*$/.test(i.name) || i.name === "t" || i.name === "pi") fatais.push(`input '${i?.name}': name deve ser snake_case sem acento e diferente de t/pi`);
    else if (![i.min, i.max, i.default].every((n: any) => typeof n === "number" && Number.isFinite(n)) || i.min >= i.max || i.default < i.min || i.default > i.max) fatais.push(`input '${i.name}': min < max e default dentro do intervalo`);
    else if (typeof i.label !== "string" || !i.label.trim()) fatais.push(`input '${i.name}': label ausente`);
  }
  if (fatais.length) return { fatais, avisos };

  const padrao: Record<string, number> = Object.fromEntries(inputs.map((i: any) => [i.name, i.default]));
  const ext = (nome: string, valor: number) => ({ ...padrao, [nome]: valor });
  for (const o of outputs) {
    if (typeof o?.label !== "string" || typeof o?.expr !== "string") { fatais.push("output sem label/expr"); continue; }
    for (const [campo, expr] of [["expr", o.expr], ["bom", o.bom], ["ruim", o.ruim]] as const) {
      if (expr === undefined || expr === null || expr === "") continue;
      for (const escopo of [padrao, ...inputs.flatMap((i: any) => [ext(i.name, i.min), ext(i.name, i.max)])]) {
        const erro = checkExpr(String(expr), escopo);
        if (erro) { fatais.push(`output '${o.label}' (${campo}): ${erro}`); break; }
      }
    }
  }
  const s = cfg.series;
  if (s) {
    if (![s.xFrom, s.xTo].every((n: any) => typeof n === "number" && Number.isFinite(n)) || s.xFrom >= s.xTo) fatais.push("series: xFrom < xTo");
    const linhas = Array.isArray(s.lines) ? s.lines : [];
    if (linhas.length < 1 || linhas.length > 4) fatais.push("series.lines precisa de 1 a 4 linhas");
    if (!fatais.length) {
      for (const l of linhas) {
        for (const t of [s.xFrom, (s.xFrom + s.xTo) / 2, s.xTo]) {
          const erro = checkExpr(String(l?.expr ?? ""), { ...padrao, t });
          if (erro) { fatais.push(`series '${l?.name}': ${erro} (em t=${t})`); break; }
        }
      }
    }
  }
  if (fatais.length) return { fatais, avisos };

  // cada controle precisa mexer em algum resultado ou curva (senão é enfeite)
  const saidas = (escopo: Record<string, number>) => [
    ...outputs.map((o: any) => { try { return checkExpr(o.expr, escopo) ? NaN : evalNum(o.expr, escopo); } catch { return NaN; } }),
    ...(s ? s.lines.map((l: any) => { try { return evalNum(l.expr, { ...escopo, t: (s.xFrom + s.xTo) / 2 }); } catch { return NaN; } }) : []),
  ];
  const base = saidas(padrao);
  for (const i of inputs) {
    const a = saidas(ext(i.name, i.min));
    const b = saidas(ext(i.name, i.max));
    const mexe = a.some((v, k) => v !== base[k] || b[k] !== base[k]);
    if (!mexe) avisos.push(`o controle '${i.label}' não altera nenhum resultado nem curva do modelo`);
  }
  if (!s && outputs.length < 2) avisos.push("modelo com um único resultado e sem gráfico: acrescente um segundo resultado ou uma curva");
  return { fatais, avisos };
}

export function sanitizeAndLintSteps(steps: any[]): { steps: any[]; warnings: string[] } {
  const warnings: string[] = [];
  let hasExplorer = false;
  const cleaned = (Array.isArray(steps) ? steps : []).map((step: any, si: number) => {
    const where = "Etapa " + (si + 1);
    const panels = (step.panels || [])
      .filter((p: any) => {
        if (p.type === "modelo") {
          const v = validarModelo(p);
          v.avisos.forEach((a) => warnings.push(where + " (" + p.title + "): " + a));
          if (v.fatais.length === 0) return true;
          warnings.push(where + " (" + p.title + "): painel modelo inválido foi removido: " + v.fatais.join("; "));
          return false;
        }
        if (p.type !== "explorer") return true;
        if (isValidExplorer(p)) return true;
        warnings.push(where + ": painel explorer inválido foi removido (precisa de 2+ opções, cada uma com resultados).");
        return false;
      })
      .map((p: any) => {
        if (p.type === "explorer" || p.type === "modelo") { hasExplorer = true; return p; }
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
    const hasExp = panels.some((p: any) => p.type === "explorer" || p.type === "modelo");
    const hasDecision = panels.some((p: any) => p.type === "radio" || p.type === "checklist");
    if (hasExp && !hasDecision) warnings.push(where + ": tem explorer/modelo mas nenhum painel de decisão (radio/checklist) para o aluno interpretar o que viu.");
    if (panels.length > 3) warnings.push(where + ": mais de 3 painéis na etapa.");
    return { ...step, panels };
  });
  if (!hasExplorer) warnings.push("Nenhuma etapa usa o painel explorer ou modelo: o aluno não manipula nada antes de decidir (padrão de desafios da plataforma).");
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
