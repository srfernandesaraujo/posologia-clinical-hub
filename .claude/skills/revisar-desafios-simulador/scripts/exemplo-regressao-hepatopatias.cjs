#!/usr/bin/env node
/**
 * EXEMPLO (não é genérico): regressão dos validadores do simulador de Hepatopatias.
 *
 * Mostra a técnica que vale para QUALQUER simulador com motor em TypeScript:
 *   1. carrega a função real de desafios (getXChallenges) transformando o .ts com esbuild;
 *   2. extrai do componente .tsx, por texto, os arrays literais do motor (DRUGS, BUILT_IN_CASES) e os avalia;
 *   3. replica `computeSimulation` (mantenha IDÊNTICA à do componente; se mudar o motor, mude aqui);
 *   4. para cada desafio de ajuste, monta o `simulatorState` que o aluno deixaria na tela e roda o validator;
 *   5. roda também casos NEGATIVOS (conduta errada tem de ser bloqueada) e confere posições/quantidade.
 *
 * Para adaptar a outro simulador: troque SIM_FILE, os marcadores de `grab(...)`, `compute`, `state` e a tabela `plan`.
 * Uso: node .claude/skills/revisar-desafios-simulador/scripts/exemplo-regressao-hepatopatias.cjs
 */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../../../..");
const esbuild = require(path.join(root, "node_modules", "esbuild"));

// ---- 1. desafios reais (TS -> JS) ----
const chSrc = fs.readFileSync(path.join(root, "src/data/simulatorChallenges.ts"), "utf8");
const out = esbuild.transformSync(chSrc, { loader: "ts", format: "cjs" }).code;
const m = { exports: {} };
new Function("module", "exports", "require", out)(m, m.exports, () => ({}));
const getCh = m.exports.getHeppatopatiaChallenges;

// ---- 2. arrays literais do motor, extraídos do componente ----
const SIM_FILE = "src/pages/simuladores/farmacoterapia-laboratorial/SimuladorHepatopatia.tsx";
const src = fs.readFileSync(path.join(root, SIM_FILE), "utf8");
function grab(start) { const i = src.indexOf(start); const j = src.indexOf("\n];", i); return src.slice(i + start.length - 1, j + 3).replace(/;$/, ""); }
const DRUGS = eval("(" + grab("const DRUGS: HepatoDrug[] = [") + ")");
const CASES = eval("(" + grab("const BUILT_IN_CASES: HepatoCase[] = [") + ")");

// ---- 3. réplica do motor (computeSimulation) ----
function compute(drug, dose, base) {
  const df = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const safe = drug.safeDose ? drug.safeDose(base) : null;
  const eff = safe !== null ? Math.max(0, (dose - safe) / Math.max(drug.doseMax - safe, 1)) : df;
  const it = safe !== null ? 0.1 + eff * 0.9 : 0.65 + df * 0.35;
  const ind = drug.indicationCheck ? drug.indicationCheck(base) : 1;
  const p = 7 >= drug.daysToEffect ? Math.min((7 - drug.daysToEffect + 1) / 5, 1) : 0;
  const e = (k) => drug.effects[k] || 0;
  const last = {
    alt: Math.max(5, Math.round(base.alt + e("alt") * it * p * ind)), ast: Math.max(5, Math.round(base.ast + e("ast") * it * p * ind)),
    fa: Math.max(20, Math.round(base.fa + e("fa") * it * p * ind)), ggt: Math.max(5, Math.round(base.ggt + e("ggt") * it * p * ind)),
    bilirrubinaT: Math.max(0.2, +(base.bilirrubinaT + e("bilirrubinaT") * it * p * ind).toFixed(1)),
    albumina: Math.max(1, +(base.albumina + e("albumina") * it * p * ind).toFixed(1)), inr: Math.max(0.8, +(base.inr + e("inr") * it * p * ind).toFixed(1)),
  };
  if (base.nh3 !== undefined) last.nh3 = Math.max(10, Math.round(base.nh3 + e("nh3") * it * p * ind));
  if (base.cpk !== undefined) last.cpk = Math.max(30, Math.round(base.cpk + e("cpk") * it * p * ind));
  const names = { hepatotox: "Hepatotoxicidade", gi: "GI", nefrotox: "Nefrotoxicidade", neurotox: "Neurotoxicidade" };
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({ name: names[k], risco: Math.round(Math.max(0, v * (0.5 + (safe !== null ? eff : df) * 0.8)) * 100) }));
  return { last, sideEffects };
}
function cp(l, enc, asc) { const b = l.bilirrubinaT < 2 ? 1 : l.bilirrubinaT <= 3 ? 2 : 3, a = l.albumina > 3.5 ? 1 : l.albumina >= 2.8 ? 2 : 3, i = l.inr < 1.7 ? 1 : l.inr <= 2.3 ? 2 : 3; const s = b + a + i + asc + enc; return { score: s, class: s <= 6 ? "A" : s <= 9 ? "B" : "C" }; }

// ---- 4. estado que o aluno deixaria na tela ----
function state(ci, drugName, dose, encOverride, ascOverride) {
  const c = CASES[ci];
  const d = DRUGS.find((x) => x.name === drugName);
  if (!d) throw new Error("fármaco inexistente: " + drugName);
  if (d.caseFlag && !(c.flags || []).includes(d.caseFlag)) throw new Error(`fármaco "${drugName}" não aparece no caso ${ci + 1}`);
  const { last, sideEffects } = compute(d, dose, c.baseLab);
  const enc = encOverride ?? c.clinical?.encefalopatia ?? 1, asc = ascOverride ?? c.clinical?.ascite ?? 1;
  return { drug: drugName, dose, lastLab: last, baseLab: c.baseLab, sideEffects, childPugh: cp({ ...c.baseLab, ...last }, enc, asc), encefalopatia: enc, ascite: asc };
}

// [caso(0-based), desafio(1-based), fármaco, dose, encefalopatia?, ascite?] = o que o ENUNCIADO manda deixar na tela
const NAC = "N-Acetilcisteína (NAC)", SUSP = "Suspender o fármaco suspeito", MANT = "Manter atorvastatina + fluconazol (esquema atual)";
const plan = [
  [0, 1, NAC, 100], [0, 2, "Vitamina K", 10], [0, 3, "Paracetamol", 4000], [0, 4, NAC, 100, 3, 1], [0, 6, "Lactulose", 30],
  [1, 1, SUSP, 1], [1, 2, NAC, 100], [1, 3, "Vitamina K", 10], [1, 6, "Fluconazol", 100],
  [2, 1, "Lactulose", 30], [2, 2, "Rifaximina", 550], [2, 3, "Albumina 20%", 100], [2, 4, "Paracetamol", 4000], [2, 6, "Albumina 20%", 200, 1, 3],
  [3, 1, SUSP, 1], [3, 2, MANT, 1], [3, 3, "Fluconazol", 100], [3, 4, MANT, 1], [3, 6, SUSP, 1],
  [4, 1, "Lactulose", 60], [4, 3, "Vitamina K", 10], [4, 5, "Lactulose", 45],
];
// condutas ERRADAS: o validador tem de bloquear (senão o aluno passa sem ter feito o que o enunciado pede)
const neg = [[0, 1, "Vitamina K", 10], [1, 1, "Isoniazida", 5], [3, 2, "Atorvastatina", 40], [2, 1, "Rifaximina", 550], [4, 3, NAC, 100]];

let fail = 0;
for (const [ci, n, drug, dose, enc, asc] of plan) {
  const r = getCh(ci).challenges[n - 1].validator(state(ci, drug, dose, enc, asc));
  if (!r.correct) fail++;
  console.log(`Caso ${ci + 1} desafio ${n} [${drug} ${dose}]:`, r.correct ? "OK" : "FALHOU", "-", r.feedback);
}
for (const [ci, n, drug, dose] of neg) {
  const r = getCh(ci).challenges[n - 1].validator(state(ci, drug, dose));
  console.log(`(negativo) Caso ${ci + 1} desafio ${n} [${drug} ${dose}]:`, r.correct ? "PASSOU INDEVIDAMENTE" : "bloqueado");
  if (r.correct) fail++;
}
console.log(fail ? `\n${fail} PROBLEMA(S)` : "\nTodos os validadores passam com a conduta esperada e bloqueiam a errada.");
process.exit(fail ? 1 : 0);
