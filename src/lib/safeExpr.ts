/**
 * Avaliador de expressões aritméticas SEGURO (sem eval/Function) para o painel "modelo" dos simuladores criados por IA.
 * Suporta: números, variáveis, + - * / % ^, comparações (< <= > >= == !=), && || !, ternário (c ? a : b), parênteses e as
 * funções min, max, round, ceil, floor, abs, sqrt, pow, log, log10, exp, clamp(x, lo, hi). Booleanos valem 1 e 0.
 *
 * ATENÇÃO: este arquivo é copiado byte a byte para supabase/functions/_shared/safe-expr.ts (a edge function não importa de
 * src/). O teste src/lib/safeExpr.test.ts garante que as duas cópias são idênticas: edite as duas juntas.
 */

type Tok = { t: "num" | "id" | "op"; v: string };

const MAX_LEN = 400;
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const FUNCS: Record<string, (...a: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  round: (x, d = 0) => { const f = Math.pow(10, d); return Math.round(x * f) / f; },
  ceil: Math.ceil,
  floor: Math.floor,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
};
const CONSTS: Record<string, number> = { pi: Math.PI };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = src.slice(i, j);
      if (!/^\d*\.?\d+$|^\d+\.$/.test(n)) throw new Error(`número inválido: ${n}`);
      out.push({ t: "num", v: n });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "==", "!=", "&&", "||"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/%^()<>!?:,".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`caractere não permitido: ${c}`);
  }
  return out;
}

/** Avalia `src` com as variáveis de `scope`. Lança Error se a expressão for inválida ou usar variável desconhecida. */
export function evalExpr(src: string, scope: Record<string, number>): number {
  if (typeof src !== "string" || !src.trim()) throw new Error("expressão vazia");
  if (src.length > MAX_LEN) throw new Error("expressão longa demais");
  const toks = tokenize(src);
  let p = 0;
  let depth = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const isOp = (v: string) => peek()?.t === "op" && peek().v === v;
  const expect = (v: string) => { if (!isOp(v)) throw new Error(`esperado '${v}'`); p++; };
  const guard = () => { if (++depth > 60) throw new Error("expressão aninhada demais"); };

  function ternary(): number {
    guard();
    const c = or();
    if (isOp("?")) {
      p++;
      const a = ternary();
      expect(":");
      const b = ternary();
      depth--;
      return c ? a : b;
    }
    depth--;
    return c;
  }
  function or(): number { let l = and(); while (isOp("||")) { p++; const r = and(); l = l || r ? 1 : 0; } return l; }
  function and(): number { let l = eq(); while (isOp("&&")) { p++; const r = eq(); l = l && r ? 1 : 0; } return l; }
  function eq(): number {
    let l = rel();
    while (isOp("==") || isOp("!=")) { const o = next().v; const r = rel(); l = (o === "==" ? l === r : l !== r) ? 1 : 0; }
    return l;
  }
  function rel(): number {
    let l = add();
    while (isOp("<") || isOp("<=") || isOp(">") || isOp(">=")) {
      const o = next().v; const r = add();
      l = (o === "<" ? l < r : o === "<=" ? l <= r : o === ">" ? l > r : l >= r) ? 1 : 0;
    }
    return l;
  }
  function add(): number { let l = mul(); while (isOp("+") || isOp("-")) { const o = next().v; const r = mul(); l = o === "+" ? l + r : l - r; } return l; }
  function mul(): number {
    let l = unary();
    while (isOp("*") || isOp("/") || isOp("%")) { const o = next().v; const r = unary(); l = o === "*" ? l * r : o === "/" ? l / r : l % r; }
    return l;
  }
  function unary(): number {
    if (isOp("-")) { p++; return -unary(); }
    if (isOp("+")) { p++; return unary(); }
    if (isOp("!")) { p++; return unary() ? 0 : 1; }
    return power();
  }
  function power(): number {
    const b = primary();
    if (isOp("^")) { p++; return Math.pow(b, unary()); }
    return b;
  }
  function primary(): number {
    const tk = next();
    if (!tk) throw new Error("expressão incompleta");
    if (tk.t === "num") return Number(tk.v);
    if (tk.t === "id") {
      if (isOp("(")) {
        if (!own(FUNCS, tk.v)) throw new Error(`função desconhecida: ${tk.v}`);
        const fn = FUNCS[tk.v];
        p++;
        const args: number[] = [];
        if (!isOp(")")) { do { args.push(ternary()); } while (isOp(",") && ++p); }
        expect(")");
        return fn(...args);
      }
      if (own(scope, tk.v)) return scope[tk.v];
      if (own(CONSTS, tk.v)) return CONSTS[tk.v];
      throw new Error(`variável desconhecida: ${tk.v}`);
    }
    if (tk.v === "(") { const v = ternary(); expect(")"); return v; }
    throw new Error(`símbolo inesperado: ${tk.v}`);
  }

  const v = ternary();
  if (p < toks.length) throw new Error(`sobrou texto: ${toks[p].v}`);
  return v;
}

/** Retorna null se a expressão é válida para as variáveis dadas, ou a mensagem do erro. */
export function checkExpr(src: string, scope: Record<string, number>): string | null {
  try {
    const v = evalExpr(src, scope);
    return Number.isFinite(v) ? null : "resultado não finito (divisão por zero ou log inválido)";
  } catch (e) {
    return e instanceof Error ? e.message : "expressão inválida";
  }
}
