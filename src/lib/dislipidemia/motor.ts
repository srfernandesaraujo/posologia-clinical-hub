/**
 * Motor do simulador "Dislipidemia e Risco Cardiovascular" (Farmacoterapia Laboratorial).
 * Funções puras, sem React, para a página, os testes e a regressão dos desafios usarem a mesma conta.
 *
 * Como o motor pensa:
 *  - O esquema do aluno tem até 3 fármacos (cada um com dose). Os efeitos de fármacos diferentes se multiplicam
 *    (ezetimiba reduz ~18% do LDL que sobrou depois da estatina, não 18 pontos somados).
 *  - O caso pode estar "em uso" de um esquema (`background`): o laboratório do caso (`baseLab`) já é o valor COM esse esquema.
 *    O motor divide pelo efeito do esquema atual e multiplica pelo do esquema novo; assim, manter o esquema atual
 *    devolve exatamente o laboratório do caso, e trocar/somar/suspender se projeta a partir dele (resposta individual preservada).
 *  - Estatinas: o efeito sobre o LDL vem de uma tabela por dose (`ldlByDose`, interpolada em log2), o que reproduz a "regra dos 6%"
 *    (dobrar a dose rende só ~6 pontos percentuais). Os demais efeitos da estatina escalam com a mesma proporção.
 *  - CT = CT do caso + variações de LDL + HDL + TG/5 (consistente com Friedewald); não-HDL = CT − HDL; Apo-B acompanha o não-HDL.
 */

export type LipidVar = "ldl" | "hdl" | "tg";

export interface LipidLab { ct: number; ldl: number; hdl: number; tg: number; apoB: number; cpk: number }

export interface LipidDrug {
  name: string;
  class: string;
  doseMin: number;
  doseMax: number;
  doseUnit: string;
  doseStep: number;
  /** % de variação na dose máxima (para estatinas, LDL = valor na dose máxima da tabela). */
  effects: { ldl: number; hdl: number; tg: number };
  sideEffects: { mialgia: number; hepatotox: number; gi: number; rabdomiolise: number };
  /** semanas até o efeito pleno (estado estável). */
  weeksToEffect: number;
  /** % de variação do LDL por dose (mg/dia), interpolado em log2 entre os pontos. */
  ldlByDose?: Record<number, number>;
  /** efeito proporcional à dose (ômega-3). */
  proportional?: boolean;
}

export const DRUGS: LipidDrug[] = [
  { name: "Atorvastatina", class: "Estatina alta potência", doseMin: 10, doseMax: 80, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -55, hdl: 5, tg: -20 }, ldlByDose: { 10: -37, 20: -43, 40: -49, 80: -55 }, sideEffects: { mialgia: 0.12, hepatotox: 0.05, gi: 0.08, rabdomiolise: 0.01 }, weeksToEffect: 4 },
  { name: "Rosuvastatina", class: "Estatina alta potência", doseMin: 5, doseMax: 40, doseUnit: "mg/dia", doseStep: 5, effects: { ldl: -53, hdl: 8, tg: -18 }, ldlByDose: { 5: -38, 10: -43, 20: -48, 40: -53 }, sideEffects: { mialgia: 0.10, hepatotox: 0.04, gi: 0.06, rabdomiolise: 0.008 }, weeksToEffect: 4 },
  { name: "Sinvastatina", class: "Estatina moderada", doseMin: 10, doseMax: 40, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -37, hdl: 4, tg: -12 }, ldlByDose: { 10: -27, 20: -32, 40: -37 }, sideEffects: { mialgia: 0.15, hepatotox: 0.06, gi: 0.1, rabdomiolise: 0.02 }, weeksToEffect: 4 },
  { name: "Ezetimiba", class: "Inib. absorção colesterol", doseMin: 10, doseMax: 10, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -18, hdl: 1, tg: -5 }, sideEffects: { mialgia: 0.03, hepatotox: 0.02, gi: 0.08, rabdomiolise: 0 }, weeksToEffect: 2 },
  { name: "Fenofibrato", class: "Fibrato", doseMin: 160, doseMax: 160, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -5, hdl: 15, tg: -45 }, sideEffects: { mialgia: 0.08, hepatotox: 0.05, gi: 0.1, rabdomiolise: 0.03 }, weeksToEffect: 4 },
  { name: "Evolocumabe", class: "iPCSK9", doseMin: 140, doseMax: 140, doseUnit: "mg SC a cada 2 semanas", doseStep: 140, effects: { ldl: -60, hdl: 3, tg: -8 }, sideEffects: { mialgia: 0.02, hepatotox: 0.01, gi: 0.03, rabdomiolise: 0 }, weeksToEffect: 2 },
  { name: "Ômega-3", class: "Ácido graxo", doseMin: 1, doseMax: 4, doseUnit: "g/dia", doseStep: 1, effects: { ldl: 2, hdl: 2, tg: -30 }, proportional: true, sideEffects: { mialgia: 0, hepatotox: 0, gi: 0.1, rabdomiolise: 0 }, weeksToEffect: 8 },
];

export interface RegimenItem { name: string; dose: number }

export interface LipidLifestyle { label: string; effects: Partial<Record<LipidVar, number>> }

export interface LipidCaseCtx {
  baseLab: LipidLab;
  /** esquema em uso quando o baseLab foi colhido (opcional). */
  background?: RegimenItem[];
  /** CPK depois de suspender/trocar o esquema em uso (opcional). */
  cpkOff?: number;
  lifestyle?: LipidLifestyle;
}

export function drugByName(name: string): LipidDrug | undefined { return DRUGS.find(d => d.name === name); }

function ldlPctAt(drug: LipidDrug, dose: number): number {
  const t = drug.ldlByDose!;
  const keys = Object.keys(t).map(Number).sort((a, b) => a - b);
  if (dose <= keys[0]) return t[keys[0]];
  if (dose >= keys[keys.length - 1]) return t[keys[keys.length - 1]];
  let lo = keys[0], hi = keys[1];
  for (let i = 0; i < keys.length - 1; i++) { if (dose >= keys[i] && dose <= keys[i + 1]) { lo = keys[i]; hi = keys[i + 1]; break; } }
  const f = (Math.log2(dose) - Math.log2(lo)) / (Math.log2(hi) - Math.log2(lo));
  return t[lo] + (t[hi] - t[lo]) * f;
}

/** Fração (0 a 1) do efeito máximo do fármaco na dose escolhida. */
export function effectScale(drug: LipidDrug, dose: number): number {
  if (drug.ldlByDose) return Math.abs(ldlPctAt(drug, dose)) / Math.abs(drug.effects.ldl);
  if (drug.proportional) return dose / drug.doseMax;
  if (drug.doseMin === drug.doseMax) return 1;
  return 0.65 + ((dose - drug.doseMin) / (drug.doseMax - drug.doseMin)) * 0.35;
}

/** Variação percentual de LDL/HDL/TG de um item do esquema. */
export function itemEffect(item: RegimenItem, v: LipidVar): number {
  const d = drugByName(item.name);
  if (!d) return 0;
  return d.effects[v] * effectScale(d, item.dose);
}

function factor(items: RegimenItem[], v: LipidVar): number {
  return items.reduce((f, it) => f * (1 + itemEffect(it, v) / 100), 1);
}

const same = (a: RegimenItem, b: RegimenItem) => a.name === b.name && a.dose === b.dose;

export interface LipidSimulation {
  trend: { week: number; ldl: number; hdl: number; tg: number; ct: number; nonHdl: number }[];
  lastLab: { ct: number; ldl: number; hdl: number; tg: number; nonHdl: number };
  apoB: number;
  cpk: number;
  sideEffects: { name: string; risco: number }[];
  /** o esquema é idêntico ao em uso (ou não há nada a mudar) */
  unchanged: boolean;
}

export function computeRegimen(regimen: RegimenItem[], ctx: LipidCaseCtx, lifestyleOn = false): LipidSimulation {
  const { baseLab } = ctx;
  const bg = ctx.background ?? [];
  const ls = ctx.lifestyle && lifestyleOn ? ctx.lifestyle.effects : {};
  const f = (v: LipidVar) => (factor(regimen, v) / factor(bg, v)) * (1 + (ls[v] ?? 0) / 100);

  const finalLdl = Math.max(20, baseLab.ldl * f("ldl"));
  const finalHdl = Math.max(20, baseLab.hdl * f("hdl"));
  const finalTg = Math.max(30, baseLab.tg * f("tg"));
  const finalCt = Math.max(80, baseLab.ct + (finalLdl - baseLab.ldl) + (finalHdl - baseLab.hdl) + (finalTg - baseLab.tg) / 5);

  // Semanas até o efeito pleno (estado estável): o fármaco mais lento entre os que mudaram; a retirada de um item em uso leva ~4 semanas.
  const changed = regimen.filter(r => !bg.some(b => same(b, r)));
  const removed = bg.filter(b => !regimen.some(r => r.name === b.name));
  let wte = 0;
  for (const c of changed) wte = Math.max(wte, drugByName(c.name)?.weeksToEffect ?? 0);
  if (removed.length) wte = Math.max(wte, 4);
  if (ctx.lifestyle && lifestyleOn) wte = Math.max(wte, 4);
  const unchanged = changed.length === 0 && removed.length === 0 && !(ctx.lifestyle && lifestyleOn);

  const trend: LipidSimulation["trend"] = [];
  for (let w = 0; w <= 8; w++) {
    const p = unchanged ? 1 : Math.min(w / Math.max(wte, 1), 1);
    const ldl = Math.round(baseLab.ldl + (finalLdl - baseLab.ldl) * p);
    const hdl = Math.round(baseLab.hdl + (finalHdl - baseLab.hdl) * p);
    const tg = Math.round(baseLab.tg + (finalTg - baseLab.tg) * p);
    const ct = Math.round(baseLab.ct + (finalCt - baseLab.ct) * p);
    trend.push({ week: w, ldl, hdl, tg, ct, nonHdl: ct - hdl });
  }
  const last = trend[trend.length - 1];

  const baseNonHdl = baseLab.ct - baseLab.hdl;
  const apoB = Math.round(baseLab.apoB * (last.nonHdl / Math.max(baseNonHdl, 1)));

  const keysSe: { k: keyof LipidDrug["sideEffects"]; label: string }[] = [
    { k: "mialgia", label: "Mialgia" }, { k: "hepatotox", label: "Hepatotoxicidade" }, { k: "gi", label: "GI" }, { k: "rabdomiolise", label: "Rabdomiólise" },
  ];
  const riskOf = (it: RegimenItem, k: keyof LipidDrug["sideEffects"]) => {
    const d = drugByName(it.name);
    if (!d) return 0;
    const frac = d.doseMax === d.doseMin ? 1 : (it.dose - d.doseMin) / (d.doseMax - d.doseMin);
    return Math.max(0, d.sideEffects[k] * (0.5 + frac * 0.8));
  };
  const sideEffects = keysSe.map(({ k, label }) => ({ name: label, risco: Math.round((1 - regimen.reduce((acc, it) => acc * (1 - riskOf(it, k)), 1)) * 100) }));

  // CPK: o esquema em uso (culpado) mantém o CPK do caso; tirá-lo leva ao CPK "off" (ou ao do caso se não houver esquema em uso).
  const keepsBg = bg.every(b => regimen.some(r => r.name === b.name && r.dose >= b.dose));
  const cpkStart = bg.length && !keepsBg ? (ctx.cpkOff ?? 90) : baseLab.cpk;
  const cpkAdd = changed.reduce((s, it) => s + riskOf(it, "rabdomiolise") * 100 * 25, 0);
  const cpk = Math.round(cpkStart + cpkAdd);

  return { trend, lastLab: { ct: last.ct, ldl: last.ldl, hdl: last.hdl, tg: last.tg, nonHdl: last.nonHdl }, apoB, cpk, sideEffects, unchanged };
}

/** Meta de não-HDL por categoria de risco (SBC 2019): muito alto < 80, alto < 100, demais < 130. */
export function nonHdlTargetFor(risk: string): number {
  return risk === "muito alto" ? 80 : risk === "alto" ? 100 : 130;
}

export function regimenLabel(regimen: RegimenItem[]): string {
  return regimen.length ? regimen.map(r => `${r.name} ${r.dose}`).join(" + ") : "Sem hipolipemiante";
}
