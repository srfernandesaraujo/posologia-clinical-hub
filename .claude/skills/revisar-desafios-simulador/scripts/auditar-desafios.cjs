#!/usr/bin/env node
/**
 * Auditoria automática dos desafios (Modo Desafio) de um simulador.
 *
 * Uso (a partir da raiz do repositório):
 *   node .claude/skills/revisar-desafios-simulador/scripts/auditar-desafios.cjs <getXChallenges> [maxCasos] [arquivo.ts]
 *
 *   ex.: node .claude/skills/revisar-desafios-simulador/scripts/auditar-desafios.cjs getHeppatopatiaChallenges 8
 *        node .claude/skills/revisar-desafios-simulador/scripts/auditar-desafios.cjs getSNAChallenges
 *
 * - Funções que recebem `caseIndex` são chamadas com 0..maxCasos-1 (para quando o conjunto volta a ser o do caso 0).
 * - Funções sem parâmetro são tratadas como um conjunto único.
 * - Só lê o arquivo de desafios: NÃO valida o que o enunciado diz sobre o gráfico (isso exige calcular no motor do
 *   simulador; veja a etapa 3 do SKILL.md e o exemplo de regressão desta pasta).
 *
 * Saída: uma tabela por caso e uma lista de ALERTAS. Sai com código 1 se houver alerta de gravidade "alta".
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fnName = process.argv[2];
const maxCases = Number(process.argv[3]) > 0 ? Number(process.argv[3]) : 10;
const file = path.resolve(root, process.argv[4] || "src/data/simulatorChallenges.ts");
if (!fnName) { console.error("Informe o nome da função, ex.: getHeppatopatiaChallenges"); process.exit(2); }

let esbuild;
try { esbuild = require(path.join(root, "node_modules", "esbuild")); }
catch { console.error("esbuild não encontrado em node_modules (rode npm install)."); process.exit(2); }

const code = esbuild.transformSync(fs.readFileSync(file, "utf8"), { loader: "ts", format: "cjs" }).code;
const mod = { exports: {} };
new Function("module", "exports", "require", code)(mod, mod.exports, () => ({}));
const fn = mod.exports[fnName];
if (typeof fn !== "function") { console.error(`Função ${fnName} não exportada por ${file}.`); process.exit(2); }

const ABSOLUTOS = /\b(sempre|nunca|apenas|somente|definitivamente|em nenhum|em qualquer|todos os casos|toda |qualquer )\b/i;
const alerts = [];
const alert = (sev, where, msg) => alerts.push({ sev, where, msg });

// ---- coleta dos conjuntos ----
const sets = [];
if (fn.length === 0) {
  sets.push({ label: "conjunto único", set: fn() });
} else {
  let firstSig = null;
  for (let i = 0; i < maxCases; i++) {
    const set = fn(i);
    const sig = JSON.stringify(set.challenges.map((c) => c.question));
    if (i === 0) firstSig = sig; else if (sig === firstSig) break;
    sets.push({ label: `caso ${i + 1}${set.title ? ` (${set.title})` : ""}`, set });
  }
}

const pct = (a, b) => Math.round(((a - b) / b) * 100);
for (const { label, set } of sets) {
  console.log(`\n=== ${label}: ${set.challenges.length} desafios ===`);
  const idxs = [];
  set.challenges.forEach((c, i) => {
    const n = i + 1;
    const where = `${label}, desafio ${n}`;
    const hasOpts = Array.isArray(c.options) && c.options.length > 0;
    const tag = c.type === "adjust" ? (hasOpts ? "adjust+mcq" : "adjust") : "mcq";
    let line = `${String(n).padStart(2)}. ${tag.padEnd(10)}`;

    if (c.type === "adjust") {
      const hasValidator = typeof c.validator === "function";
      const hasParams = c.targetParams && Object.keys(c.targetParams).length > 0;
      if (!hasValidator && !hasParams) alert("alta", where, "adjust sem validator e sem targetParams: qualquer estado é aceito.");
      if (!hasOpts) alert("media", where, "adjust sem alternativas: o aluno mexe no simulador mas não interpreta nem decide (padrão híbrido = adjust + options).");
      if (!c.context) alert("baixa", where, "sem `context`: o enunciado cita cards/controles sem dizer onde ficam.");
      if ((c.question || "").length < 160) alert("media", where, `enunciado curto (${(c.question || "").length} caracteres): suspeita de pergunta de memorização.`);
    }
    if (!c.explanation) alert("alta", where, "sem explanation.");
    else if (c.explanation.length < 200) alert("baixa", where, "explicação curta (<200): o feedback deveria citar os números do simulador e o porquê clínico.");
    if (!c.reference) alert("baixa", where, "sem reference.");

    if (hasOpts) {
      const lens = c.options.map((o) => o.length);
      const ci = c.correctIndex;
      idxs.push(ci);
      line += ` correta=${"ABCDEFGH"[ci]} tamanhos=[${lens.join(",")}]`;
      if (ci == null || ci < 0 || ci >= c.options.length) alert("alta", where, `correctIndex inválido (${ci}).`);
      else {
        const others = lens.filter((_, k) => k !== ci);
        const mean = others.reduce((a, b) => a + b, 0) / others.length;
        const maxO = Math.max(...others), minO = Math.min(...others);
        if (lens[ci] > maxO && pct(lens[ci], mean) >= 12) alert("alta", where, `a correta é a MAIS LONGA (+${pct(lens[ci], mean)}% sobre a média das outras): entrega a resposta.`);
        if (lens[ci] < minO && pct(mean, lens[ci]) >= 12) alert("media", where, `a correta é a MAIS CURTA (-${pct(mean, lens[ci])}%): também é um indício.`);
        if (Math.max(...lens) - Math.min(...lens) > 0.35 * mean) alert("media", where, `opções com comprimentos muito desiguais (${Math.min(...lens)}–${Math.max(...lens)}).`);
        const abs = c.options.map((o) => ABSOLUTOS.test(o));
        if (!abs[ci] && abs.filter(Boolean).length >= 2) alert("media", where, "2+ distratores usam absolutos (sempre/nunca/apenas...) e a correta não: padrão de eliminação.");
      }
      if (new Set(c.options.map((o) => o.trim())).size !== c.options.length) alert("alta", where, "alternativas duplicadas.");
    }
    console.log(line);
  });
  const counts = {};
  idxs.forEach((x) => (counts[x] = (counts[x] || 0) + 1));
  const top = Math.max(0, ...Object.values(counts));
  console.log(`   posição da correta: ${idxs.map((x) => "ABCDEFGH"[x]).join(" ")}  |  distribuição: ${Object.entries(counts).map(([k, v]) => `${"ABCDEFGH"[k]}=${v}`).join(" ")}`);
  if (idxs.length >= 4 && top >= Math.ceil(idxs.length * 0.5)) alert("alta", label, `a correta cai na mesma posição em ${top} de ${idxs.length} desafios: os alunos aprendem o padrão.`);
  else if (idxs.length >= 4 && new Set(idxs).size <= 2) alert("media", label, "a correta usa só 2 posições diferentes.");
  const adj = set.challenges.filter((c) => c.type === "adjust").length;
  if (set.challenges.length && adj / set.challenges.length < 0.34) alert("media", label, `poucos desafios de ajuste (${adj}/${set.challenges.length}): pouco uso do simulador.`);
}

console.log("\n=== ALERTAS ===");
if (!alerts.length) console.log("nenhum");
for (const a of alerts.sort((x, y) => ({ alta: 0, media: 1, baixa: 2 }[x.sev] - { alta: 0, media: 1, baixa: 2 }[y.sev]))) console.log(`[${a.sev.toUpperCase()}] ${a.where}: ${a.msg}`);
process.exit(alerts.some((a) => a.sev === "alta") ? 1 : 0);
