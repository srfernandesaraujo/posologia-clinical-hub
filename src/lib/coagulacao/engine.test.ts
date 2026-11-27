import { describe, it, expect } from "vitest";
import { computeSimulation, DRUGS, protamineNeedMg, bleedingRisk, formatLab } from "./engine";
import { BUILT_IN_CASES } from "./cases";
import { getCoagulacaoLabChallenges } from "@/data/simulatorChallenges";

/** Reproduz o estado que a página envia ao SimulatorChallengeMode. */
function state(ci: number, drugName: string, dose: number) {
  const c = BUILT_IN_CASES[ci];
  const drug = DRUGS.find(d => d.name === drugName)!;
  const sim = computeSimulation(drug, dose, c.baseLab, { weight: c.patient.weight, infusion: c.infusion });
  return { drug: drug.name, dose, labGauges: sim.labGauges, sideEffects: sim.sideEffects, trend: sim.trend, lastLab: sim.lastLab, baseLab: c.baseLab, weight: c.patient.weight };
}
const risk = (s: any, n: string) => s.sideEffects.find((e: any) => e.name === n)?.risco;
const day = (s: any, d: number, k: string) => s.trend[d][k];
const ch = (ci: number, i: number) => getCoagulacaoLabChallenges(ci).challenges[i] as any;
const pass = (ci: number, i: number, drug: string, dose: number) => ch(ci, i).validator(state(ci, drug, dose)).correct;

const VK = "Vitamina K (Fitomenadiona)", SV = "Suspender varfarina (sem dose)", SH = "Suspender HNF (sem dose)", PR = "Pausa da rivaroxabana";

describe("motor de coagulação: números citados nos desafios", () => {
  it("Caso 1: varfarina, DOAC e dose de apixabana", () => {
    const w = (d: number) => state(0, "Varfarina", d);
    expect([2, 5, 10].map(d => w(d).lastLab.inr)).toEqual([1.6, 2.5, 4.0]);
    expect([2, 5, 10].map(d => day(w(d), 3, "inr"))).toEqual([1.1, 1.3, 1.6]);
    expect([5, 10].map(d => day(w(d), 5, "inr"))).toEqual([1.9, 2.8]);
    expect([day(w(10), 4, "inr"), day(w(10), 6, "inr")]).toEqual([2.2, 3.4]);
    // faixa 2,0–3,0 com 3,5 a 6,5 mg
    const inFaixa = [3, 3.5, 4, 5, 6, 6.5, 7].map(d => w(d).lastLab.inr >= 2 && w(d).lastLab.inr <= 3);
    expect(inFaixa).toEqual([false, true, true, true, true, true, false]);
    const riva = state(0, "Rivaroxabana", 20), api5 = state(0, "Apixabana", 5), api25 = state(0, "Apixabana", 2.5);
    expect([riva.lastLab.inr, riva.lastLab.antiXa]).toEqual([1.3, 0.5]);
    expect([state(0, "Rivaroxabana", 10).lastLab.inr, state(0, "Rivaroxabana", 10).lastLab.antiXa]).toEqual([1.1, 0.25]);
    expect([state(0, "Rivaroxabana", 30).lastLab.inr, state(0, "Rivaroxabana", 30).lastLab.antiXa]).toEqual([1.4, 0.75]);
    expect([api5.lastLab.inr, api5.lastLab.antiXa, api25.lastLab.antiXa]).toEqual([1.1, 0.4, 0.2]);
    // CHA2DS2-VASc = 3 e ClCr de Cockcroft-Gault
    expect(1 + 1 + 1).toBe(3);
    expect(Math.round(((140 - 72) * 78) / (72 * 1.0) * 10) / 10).toBe(73.7);
  });

  it("Caso 2: vitamina K, suspensão e manutenção da varfarina", () => {
    const k = (d: number) => state(1, VK, d);
    expect([1, 2.5, 3.5, 5, 10].map(d => k(d).lastLab.inr)).toEqual([5.6, 3.3, 2.5, 1.8, 1.1]);
    expect([k(10).lastLab.ttpa, k(2.5).lastLab.ttpa]).toEqual([30, 41]);
    expect([1, 1.5, 2, 2.5, 3, 3.5, 4].map(d => k(d).lastLab.inr >= 2.5 && k(d).lastLab.inr <= 3.5)).toEqual([false, false, false, true, true, true, false]);
    expect([day(k(2.5), 1, "inr"), day(k(2.5), 2, "inr")]).toEqual([5.8, 3.3]);
    const sv = state(1, SV, 0);
    expect([2, 3, 4, 5, 7].map(d => day(sv, d, "inr"))).toEqual([6.9, 5.7, 4.4, 3.2, 3.2]);
    const w5 = state(1, "Varfarina", 5);
    expect([w5.lastLab.inr, w5.lastLab.ttpa]).toEqual([9.7, 69]);
    expect(bleedingRisk(w5.lastLab.inr, w5.lastLab.ttpa, w5.lastLab.plaquetas, 11.8).level).toBe("ALTO");
    expect(bleedingRisk(k(10).lastLab.inr, k(10).lastLab.ttpa, k(10).lastLab.plaquetas, 11.8).level).toBe("BAIXO");
    expect(50 * 55).toBe(2750);
    expect(35 * 55).toBe(1925);
  });

  it("Caso 3: enoxaparina por mg/kg, rivaroxabana, D-dímero e varfarina com INR tardio", () => {
    const e = (d: number) => state(2, "Enoxaparina", d);
    expect([40, 100, 120, 140, 160].map(d => e(d).lastLab.antiXa)).toEqual([0.24, 0.59, 0.71, 0.82, 0.94]);
    expect([40, 100, 120, 140, 160].map(d => risk(e(d), "Sangramento"))).toEqual([10, 18, 21, 23, 26]);
    const r20 = state(2, "Rivaroxabana", 20), r30 = state(2, "Rivaroxabana", 30);
    expect([r20.lastLab.antiXa, r30.lastLab.antiXa, risk(r20, "Sangramento"), risk(r30, "Sangramento")]).toEqual([0.5, 0.75, 18, 26]);
    expect(state(2, "Rivaroxabana", 10).lastLab.antiXa).toBe(0.25);
    expect(risk(state(2, "Rivaroxabana", 10), "Sangramento")).toBe(10);
    const a10 = state(2, "Apixabana", 10);
    expect([e(140).lastLab.dDimero, r30.lastLab.dDimero, a10.lastLab.dDimero]).toEqual([4.22, 4.1, 4.2]);
    expect(a10.lastLab.antiXa).toBe(0.8);
    expect(e(140).trend.slice(1).every((t: any) => t.antiXa === 0.82)).toBe(true); // heparina age em ~1 dia
    const w = state(2, "Varfarina", 5);
    expect([3, 4, 5, 6, 7].map(d => day(w, d, "inr"))).toEqual([1.3, 1.6, 1.9, 2.2, 2.5]);
    expect(day(state(2, "Varfarina", 10), 4, "inr")).toBe(2.2);
    // plaquetas não caem por dose de heparina (HIT é imune)
    expect(state(2, "Heparina NF (HNF)", 30000).lastLab.plaquetas).toBe(250);
  });

  it("Caso 4: protamina (dose necessária, falta e excesso), suspensão da HNF e escore 4Ts", () => {
    expect(protamineNeedMg(BUILT_IN_CASES[3])).toBe(30);
    const p = (d: number) => state(3, "Protamina", d);
    expect([10, 20, 30, 50, 100].map(d => p(d).lastLab.ttpa)).toEqual([73, 52, 30, 35, 85]);
    expect([10, 20, 30, 50, 100].map(d => p(d).lastLab.antiXa)).toEqual([0.53, 0.27, 0, 0, 0]);
    const sh = state(3, SH, 0);
    expect([sh.lastLab.ttpa, sh.lastLab.antiXa]).toEqual([40, 0.12]);
    expect(day(sh, 1, "ttpa")).toBe(40);
    expect(bleedingRisk(p(30).lastLab.inr, p(30).lastLab.ttpa, p(30).lastLab.plaquetas, 8.5).level).toBe("MODERADO");
    expect(bleedingRisk(p(100).lastLab.inr, p(100).lastLab.ttpa, p(100).lastLab.plaquetas, 8.5).level).toBe("ALTO");
    expect(p(30).baseLab.hb).toBe(8.5);
    expect(Math.round(((210 - 130) / 210) * 100)).toBe(38);
    expect(1 + 0 + 0 + 1).toBe(2);
    expect(1500 * 2 / 100).toBe(30);
  });

  it("Caso 5: pausa da rivaroxabana (meia-vida 12 h), sobreposição com enoxaparina", () => {
    const pz = (h: number) => state(4, PR, h);
    expect([0, 24, 36, 48, 72, 96].map(h => pz(h).lastLab.antiXa)).toEqual([0.5, 0.13, 0.06, 0.03, 0.01, 0]);
    expect(pz(48).trend[0].antiXa).toBe(0.5);
    expect([40, 100].map(d => state(4, "Enoxaparina", d).lastLab.antiXa)).toEqual([0.73, 1.07]);
    expect(risk(state(4, "Enoxaparina", 100), "Sangramento")).toBe(18);
    expect(Math.round((0.4 * 40) / 70 * 100) / 100).toBe(0.23);
    expect(1 + 1).toBe(2);
  });

  it("formatação: Anti-Xa e D-dímero com 2 casas", () => {
    expect(formatLab("Anti-Xa", 0.03)).toBe("0.03");
    expect(formatLab("D-dímero", 4.2)).toBe("4.20");
    expect(formatLab("INR", 2.5)).toBe("2.5");
    expect(formatLab("TTPa", 41)).toBe("41");
  });
});

describe("validators: a conduta pedida passa e a errada é bloqueada, em todos os casos", () => {
  it("Caso 1", () => {
    expect(pass(0, 1, "Varfarina", 5)).toBe(true);
    expect(pass(0, 1, "Varfarina", 2)).toBe(false);
    expect(pass(0, 1, "Varfarina", 10)).toBe(false);
    expect(pass(0, 1, "Rivaroxabana", 20)).toBe(false);
    expect(pass(0, 2, "Rivaroxabana", 20)).toBe(true);
    expect(pass(0, 2, "Rivaroxabana", 30)).toBe(false);
    expect(pass(0, 2, "Apixabana", 5)).toBe(false);
    expect(pass(0, 3, "Apixabana", 5)).toBe(true);
    expect(pass(0, 3, "Apixabana", 2.5)).toBe(false);
    expect(pass(0, 3, "Rivaroxabana", 20)).toBe(false);
    expect(pass(0, 5, "Varfarina", 10)).toBe(true);
    expect(pass(0, 5, "Varfarina", 5)).toBe(false);
  });
  it("Caso 2", () => {
    expect(pass(1, 0, VK, 2.5)).toBe(true);
    expect(pass(1, 0, VK, 3)).toBe(true);
    expect(pass(1, 0, VK, 1)).toBe(false);
    expect(pass(1, 0, VK, 10)).toBe(false);
    expect(pass(1, 0, SV, 0)).toBe(false);
    expect(pass(1, 1, SV, 0)).toBe(true);
    expect(pass(1, 1, VK, 2.5)).toBe(true);
    expect(pass(1, 1, VK, 10)).toBe(false);
    expect(pass(1, 1, "Varfarina", 5)).toBe(false);
    expect(pass(1, 3, "Varfarina", 5)).toBe(true);
    expect(pass(1, 3, SV, 0)).toBe(false);
    expect(pass(1, 4, VK, 10)).toBe(true);
    expect(pass(1, 4, VK, 2.5)).toBe(false);
  });
  it("Caso 3", () => {
    expect(pass(2, 0, "Enoxaparina", 140)).toBe(true);
    expect(pass(2, 0, "Enoxaparina", 120)).toBe(true);
    expect(pass(2, 0, "Enoxaparina", 40)).toBe(false);
    expect(pass(2, 0, "Enoxaparina", 100)).toBe(false);
    expect(pass(2, 0, "Rivaroxabana", 30)).toBe(false);
    expect(pass(2, 1, "Rivaroxabana", 30)).toBe(true);
    expect(pass(2, 1, "Rivaroxabana", 20)).toBe(false);
    expect(pass(2, 2, "Enoxaparina", 140)).toBe(true);
    expect(pass(2, 2, "Enoxaparina", 40)).toBe(false);
    expect(pass(2, 4, "Varfarina", 5)).toBe(true);
    expect(pass(2, 4, "Varfarina", 10)).toBe(false);
    expect(pass(2, 4, "Enoxaparina", 140)).toBe(false);
  });
  it("Caso 4", () => {
    expect(pass(3, 1, "Protamina", 30)).toBe(true);
    expect(pass(3, 1, "Protamina", 40)).toBe(true);
    expect(pass(3, 1, "Protamina", 10)).toBe(false);
    expect(pass(3, 1, "Protamina", 100)).toBe(false);
    expect(pass(3, 1, SH, 0)).toBe(false);
    expect(pass(3, 2, "Protamina", 30)).toBe(true);
    expect(pass(3, 2, SH, 0)).toBe(false);
    expect(pass(3, 2, "Protamina", 20)).toBe(false);
    expect(pass(3, 5, "Protamina", 30)).toBe(true);
    expect(pass(3, 5, "Protamina", 100)).toBe(false);
    expect(pass(3, 5, "Heparina NF (HNF)", 5000)).toBe(false);
  });
  it("Caso 5", () => {
    expect(pass(4, 0, PR, 48)).toBe(true);
    expect(pass(4, 0, PR, 60)).toBe(true);
    expect(pass(4, 0, PR, 24)).toBe(false);
    expect(pass(4, 0, PR, 36)).toBe(false);
    expect(pass(4, 0, PR, 96)).toBe(false);
    expect(pass(4, 0, "Enoxaparina", 40)).toBe(false);
    expect(pass(4, 1, PR, 72)).toBe(true);
    expect(pass(4, 1, PR, 96)).toBe(true);
    expect(pass(4, 1, PR, 48)).toBe(false);
    expect(pass(4, 3, "Enoxaparina", 100)).toBe(true);
    expect(pass(4, 3, "Enoxaparina", 40)).toBe(false);
    expect(pass(4, 3, PR, 72)).toBe(false);
  });
  it("cada caso tem 6 desafios, ≥3 de ajuste, e as condutas extras só nos casos que as liberam", () => {
    for (let i = 0; i < 5; i++) {
      const set = getCoagulacaoLabChallenges(i).challenges as any[];
      expect(set.length).toBe(6);
      expect(set.filter(c => c.type === "adjust").length).toBeGreaterThanOrEqual(3);
    }
    const flags = BUILT_IN_CASES.map(c => c.flags ?? []);
    expect(flags).toEqual([[], ["suspenderVarfarina"], [], ["suspenderHnf"], ["pausaRivaroxabana"]]);
    expect(DRUGS.filter(d => d.caseFlag).map(d => d.caseFlag)).toEqual(["suspenderVarfarina", "suspenderHnf", "pausaRivaroxabana"]);
    // todas as condutas esperadas existem na lista de fármacos
    for (const c of BUILT_IN_CASES) for (const n of c.expectedDrugs) expect(DRUGS.some(d => d.name === n)).toBe(true);
  });
});
