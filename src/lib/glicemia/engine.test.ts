import { describe, it, expect } from "vitest";
import { computeSimulation, getDrug, NO_DRUG, DRUGS, cadResolved } from "./engine";
import { BUILT_IN_CASES } from "./cases";
import { getGlicemiaLabChallenges } from "@/data/simulatorChallenges";

type Run = { drug?: string; dose?: number; kept?: string[]; doses?: Record<string, number> };

/** Reproduz o estado que a página envia ao SimulatorChallengeMode. */
function state(c: number, r: Run = {}) {
  const cs = BUILT_IN_CASES[c];
  const reg = cs.regimen ?? [];
  const kept = r.kept ?? reg.map(x => x.drug);
  const doses = { ...Object.fromEntries(reg.map(x => [x.drug, x.dose])), ...(r.doses ?? {}) };
  const drug = getDrug(r.drug ?? NO_DRUG)!;
  const sim = computeSimulation(drug, r.dose ?? 0, cs.baseLab, { regimen: cs.regimen, kept, doses, ic: cs.ic });
  return {
    drug: drug.name, dose: r.dose ?? 0, labGauges: sim.labGauges, sideEffects: sim.sideEffects, trend: sim.trend, lastLab: sim.lastLab,
    baseLab: cs.baseLab, kept, regDoses: doses, regimen: reg, hba1cTarget: cs.hba1cTarget,
    renalMax: sim.renalMax, overRenal: sim.overRenal, keptOverRenal: sim.keptOverRenal, untreated: sim.untreated,
  };
}
const risk = (s: any, n: string) => s.sideEffects.find((e: any) => e.name === n)?.risco;

describe("motor de glicemia: números citados nos desafios", () => {
  it("Caso 1: titulação da metformina e comparação com glibenclamida", () => {
    const hb = (d: number) => state(0, { drug: "Metformina", dose: d });
    expect([500, 1000, 1500, 2000, 2550].map(d => hb(d).lastLab.hba1c)).toEqual([7.2, 7.1, 7.0, 6.8, 6.7]);
    expect([500, 1000, 1500, 2000, 2550].map(d => risk(hb(d), "GI"))).toEqual([18, 24, 31, 38, 45]);
    const m = hb(2000), g = state(0, { drug: "Glibenclamida", dose: 10 });
    expect([m.lastLab.jejum, m.lastLab.pp, risk(m, "Hipoglicemia"), risk(m, "Ganho de Peso")]).toEqual([149, 215, 2, 0]);
    expect([g.lastLab.jejum, g.lastLab.pp, g.lastLab.hba1c, risk(g, "Hipoglicemia"), risk(g, "Ganho de Peso")]).toEqual([141, 204, 7.0, 34, 25]);
    const gl = state(0, { drug: "Insulina Glargina", dose: 20 }), lis = state(0, { drug: "Insulina Lispro", dose: 10 });
    expect([gl.lastLab.jejum, gl.lastLab.pp, risk(gl, "Hipoglicemia"), risk(gl, "Ganho de Peso")]).toEqual([140, 243, 12, 22]);
    expect([lis.lastLab.jejum, lis.lastLab.pp, risk(lis, "Hipoglicemia"), risk(lis, "Ganho de Peso")]).toEqual([178, 202, 31, 27]);
    expect(Math.round(22 * 185 / 405 * 100) / 100).toBe(10.05);
  });

  it("Caso 2: pioglitazona × empagliflozina, liraglutida, glibenclamida e troca da metformina", () => {
    const pio = state(1, { drug: "Pioglitazona", dose: 30 }), emp = state(1, { drug: "Empagliflozina", dose: 25 });
    expect([pio.lastLab.hba1c, risk(pio, "Descompensação de IC"), risk(pio, "Ganho de Peso")]).toEqual([7.7, 45, 32]);
    expect([emp.lastLab.hba1c, risk(emp, "Descompensação de IC"), risk(emp, "Ganho de Peso")]).toEqual([7.7, 0, 0]);
    const lira = (d: number) => state(1, { drug: "Liraglutida", dose: d });
    expect([0.6, 1.2, 1.8].map(d => lira(d).lastLab.hba1c)).toEqual([7.7, 7.5, 7.3]);
    expect([0.6, 1.2, 1.8].map(d => risk(lira(d), "GI"))).toEqual([53, 65, 77]);
    expect(risk(state(1), "GI")).toBe(38);
    const gl = state(1, { drug: "Glibenclamida", dose: 10 });
    expect([gl.lastLab.hba1c, risk(gl, "Hipoglicemia"), risk(gl, "Ganho de Peso")]).toEqual([7.3, 36, 25]);
    const troca = state(1, { drug: "Empagliflozina", dose: 25, kept: [] });
    expect(troca.lastLab.hba1c).toBe(9.1);
    expect(state(1, { kept: [] }).lastLab.hba1c).toBe(9.9);
    expect(state(1, { drug: "Empagliflozina", dose: 25 }).lastLab.hba1c - state(1).lastLab.hba1c).toBeCloseTo(-0.8, 5);
    expect(state(1, { drug: "Pioglitazona", dose: 15 }).sideEffects.find((e: any) => e.name === "Descompensação de IC")!.risco).toBe(25);
  });

  it("Caso 3: DRC G3b — suspender glibenclamida, limite da metformina, glargina, sitagliptina, liraglutida", () => {
    const atual = state(2);
    expect([atual.lastLab.jejum, atual.lastLab.pp, atual.lastLab.hba1c, risk(atual, "Hipoglicemia")]).toEqual([170, 240, 8.0, 54]);
    const semGlib = state(2, { kept: ["Metformina"] });
    expect([semGlib.lastLab.jejum, semGlib.lastLab.pp, semGlib.lastLab.hba1c, risk(semGlib, "Hipoglicemia")]).toEqual([214, 296, 9.2, 1]);
    const met2000 = state(2, { kept: ["Metformina"], doses: { Metformina: 2000 } });
    expect([met2000.lastLab.hba1c, risk(met2000, "Acidose Láctica")]).toEqual([8.9, 33]);
    expect(met2000.keptOverRenal).toEqual(["Metformina"]);
    expect(risk(semGlib, "Acidose Láctica")).toBe(7);
    const somada = state(2, { drug: "Insulina Glargina", dose: 20 });
    expect([somada.lastLab.hba1c, risk(somada, "Hipoglicemia")]).toEqual([6.9, 67]);
    const gl = (d: number) => state(2, { drug: "Insulina Glargina", dose: d, kept: ["Metformina"] });
    expect([10, 20, 34, 40].map(d => gl(d).lastLab.hba1c)).toEqual([8.2, 8.1, 8.0, 8.0]);
    expect([10, 20, 34, 40].map(d => risk(gl(d), "Hipoglicemia"))).toEqual([13, 15, 19, 20]);
    expect([10, 20, 34, 40].map(d => risk(gl(d), "Ganho de Peso"))).toEqual([18, 22, 27, 30]);
    expect(gl(32).lastLab.hba1c).toBe(8.1);
    const sita = (d: number) => state(2, { drug: "Sitagliptina", dose: d, kept: ["Metformina"] });
    expect([sita(50).lastLab.hba1c, sita(100).lastLab.hba1c, risk(sita(50), "Hipoglicemia"), risk(sita(100), "Hipoglicemia")]).toEqual([8.7, 8.5, 3, 4]);
    expect([sita(50).overRenal, sita(100).overRenal]).toEqual([false, true]);
    expect(state(2, { drug: "Empagliflozina", dose: 25, kept: ["Metformina"] }).lastLab.hba1c).toBe(8.8);
    const lira = state(2, { drug: "Liraglutida", dose: 1.8, kept: ["Metformina"] });
    expect([lira.lastLab.hba1c, risk(lira, "GI"), risk(lira, "Hipoglicemia"), risk(lira, "Ganho de Peso")]).toEqual([8.0, 63, 4, 0]);
    expect(Math.round(((140 - 68) * 65 / (72 * 1.6)) * 0.85 * 10) / 10).toBe(34.5);
  });

  it("Caso 4: cetoacidose — só insulina rápida fecha o ânion gap", () => {
    const l = (d: number) => state(3, { drug: "Insulina Lispro", dose: d }).lastLab;
    expect([l(16).ph, l(16).hco3, l(16).anionGap, l(16).jejum]).toEqual([7.32, 19.1, 17, 294]);
    expect([l(30).ph, l(30).hco3, l(30).anionGap, l(30).jejum, l(30).k]).toEqual([7.4, 24, 12, 200, 5.3]);
    expect(cadResolved(l(16))).toBe(false);
    expect(cadResolved(l(30))).toBe(true);
    expect(cadResolved(state(3, { drug: "Insulina Glargina", dose: 80 }).lastLab)).toBe(false);
    const g = state(3, { drug: "Insulina Glargina", dose: 80 }).lastLab;
    expect([g.ph, g.hco3, g.anionGap, g.jejum, g.k]).toEqual([7.26, 15.6, 20, 370, 5.4]);
    const m = state(3, { drug: "Metformina", dose: 2550 }), e = state(3, { drug: "Empagliflozina", dose: 25 });
    expect([m.lastLab.jejum, m.lastLab.ph, m.lastLab.anionGap, risk(m, "Acidose Láctica")]).toEqual([410, 7.18, 24, 52]);
    expect([e.lastLab.jejum, e.lastLab.ph, e.lastLab.anionGap, risk(e, "Cetoacidose")]).toEqual([425, 7.18, 24, 62]);
    expect((0.5 * 70)).toBe(35);
  });

  it("Caso 5: idoso frágil — desintensificar", () => {
    const atual = state(4);
    expect([atual.lastLab.jejum, atual.lastLab.pp, atual.lastLab.hba1c, risk(atual, "Hipoglicemia")]).toEqual([110, 180, 7.0, 70]);
    const semGlib = state(4, { kept: ["Metformina"] });
    expect([semGlib.lastLab.jejum, semGlib.lastLab.pp, semGlib.lastLab.hba1c, risk(semGlib, "Hipoglicemia"), risk(semGlib, "Acidose Láctica")]).toEqual([160, 243, 8.3, 2, 27]);
    const met = (d: number) => state(4, { kept: ["Metformina"], doses: { Metformina: d } });
    expect([500, 750, 1000, 1500].map(d => met(d).lastLab.hba1c)).toEqual([8.6, 8.5, 8.5, 8.3]);
    expect(risk(met(1000), "Acidose Láctica")).toBe(7);
    expect(state(4, { kept: ["Metformina"], doses: { Metformina: 1000 } }).lastLab.jejum).toBe(163);
    const sita = (d: number) => state(4, { drug: "Sitagliptina", dose: d, kept: ["Metformina"], doses: { Metformina: 1000 } });
    expect([sita(50).lastLab.hba1c, sita(100).lastLab.hba1c, risk(sita(50), "Hipoglicemia"), risk(sita(100), "Hipoglicemia")]).toEqual([7.9, 7.8, 3, 4]);
    expect([sita(50).overRenal, sita(100).overRenal]).toEqual([false, true]);
    const gl = state(4, { drug: "Insulina Glargina", dose: 10, kept: ["Metformina"], doses: { Metformina: 1000 } });
    expect([gl.lastLab.hba1c, risk(gl, "Hipoglicemia"), risk(gl, "Ganho de Peso")]).toEqual([7.5, 13, 18]);
    expect(risk(sita(50), "Ganho de Peso")).toBe(4);
    expect(Math.round(((140 - 82) * 58 / (72 * 1.3)) * 10) / 10).toBe(35.9);
  });

  it("o fármaco escolhido substitui o item do esquema com o mesmo nome (sem contar duas vezes)", () => {
    const a = state(4, { drug: "Metformina", dose: 1000, kept: ["Metformina"] });
    const b = state(4, { kept: ["Metformina"], doses: { Metformina: 1000 } });
    expect(a.lastLab.hba1c).toBe(b.lastLab.hba1c);
  });

  it("todos os fármacos têm efeito pleno dentro dos 7 dias simulados (sem efeito invisível)", () => {
    for (const d of DRUGS.filter(x => !x.noDose)) expect(d.daysToEffect).toBeLessThanOrEqual(7);
    expect(state(0, { drug: "Pioglitazona", dose: 30 }).lastLab.hba1c).toBeLessThan(8.2);
  });

  it("casos sem regimen/ph (IA e marketplace) continuam funcionando como antes", () => {
    const base = { jejum: 180, pp: 250, hba1c: 8, insulina: 15, peptideoC: 2, creatinina: 1, tfg: 80, potassio: 4.5 };
    const r = computeSimulation(getDrug("Metformina")!, 1000, base);
    expect(r.lastLab.ph).toBeUndefined();
    expect(r.labGauges.map(g => g.name)).not.toContain("pH");
    expect(r.sideEffects).toHaveLength(5);
    expect(r.untreated.hba1c).toBe(8);
  });
});

describe("desafios do Modo Desafio: cada validador passa com a conduta certa e bloqueia a errada", () => {
  const sets = [0, 1, 2, 3, 4].map(i => getGlicemiaLabChallenges(i).challenges);
  const val = (c: number, n: number, s: any) => (sets[c][n] as any).validator(s).correct as boolean;

  it("Caso 1", () => {
    expect(val(0, 0, state(0, { drug: "Metformina", dose: 2000 }))).toBe(true);
    expect(val(0, 0, state(0, { drug: "Glibenclamida", dose: 10 }))).toBe(false);
    expect(val(0, 0, state(0, { drug: "Metformina", dose: 500 }))).toBe(false);
    expect(val(0, 1, state(0, { drug: "Metformina", dose: 1500 }))).toBe(true);
    expect(val(0, 1, state(0, { drug: "Metformina", dose: 2000 }))).toBe(false);
    expect(val(0, 1, state(0, { drug: "Metformina", dose: 1000 }))).toBe(false);
    expect(val(0, 3, state(0, { drug: "Insulina Glargina", dose: 20 }))).toBe(true);
    expect(val(0, 3, state(0, { drug: "Insulina Lispro", dose: 10 }))).toBe(false);
    expect(val(0, 3, state(0, { drug: "Insulina Glargina", dose: 10 }))).toBe(false);
  });

  it("Caso 2", () => {
    expect(val(1, 0, state(1, { drug: "Empagliflozina", dose: 25 }))).toBe(true);
    expect(val(1, 0, state(1, { drug: "Pioglitazona", dose: 30 }))).toBe(false);
    expect(val(1, 0, state(1, { drug: "Empagliflozina", dose: 25, kept: [] }))).toBe(false);
    expect(val(1, 2, state(1, { drug: "Liraglutida", dose: 1.2 }))).toBe(true);
    expect(val(1, 2, state(1, { drug: "Liraglutida", dose: 0.6 }))).toBe(false);
    expect(val(1, 2, state(1, { drug: "Liraglutida", dose: 1.8 }))).toBe(false);
    expect(val(1, 3, state(1, { drug: "Glibenclamida", dose: 10 }))).toBe(true);
    expect(val(1, 3, state(1, { drug: "Glibenclamida", dose: 2.5 }))).toBe(false);
    expect(val(1, 4, state(1, { drug: "Empagliflozina", dose: 25, kept: [] }))).toBe(true);
    expect(val(1, 4, state(1, { drug: "Empagliflozina", dose: 25 }))).toBe(false);
  });

  it("Caso 3", () => {
    expect(val(2, 0, state(2, { kept: ["Metformina"] }))).toBe(true);
    expect(val(2, 0, state(2))).toBe(false);
    expect(val(2, 0, state(2, { kept: [] }))).toBe(false);
    expect(val(2, 1, state(2, { kept: ["Metformina"], doses: { Metformina: 1000 } }))).toBe(true);
    expect(val(2, 1, state(2, { kept: ["Metformina"], doses: { Metformina: 2000 } }))).toBe(false);
    expect(val(2, 1, state(2, { doses: { Metformina: 1000 } }))).toBe(false);
    expect(val(2, 2, state(2, { drug: "Insulina Glargina", dose: 34, kept: ["Metformina"] }))).toBe(true);
    expect(val(2, 2, state(2, { drug: "Insulina Glargina", dose: 20, kept: ["Metformina"] }))).toBe(false);
    expect(val(2, 2, state(2, { drug: "Insulina Glargina", dose: 40, kept: ["Metformina"] }))).toBe(false);
    expect(val(2, 2, state(2, { drug: "Insulina Glargina", dose: 34 }))).toBe(false);
    expect(val(2, 3, state(2, { drug: "Sitagliptina", dose: 50, kept: ["Metformina"] }))).toBe(true);
    expect(val(2, 3, state(2, { drug: "Sitagliptina", dose: 100, kept: ["Metformina"] }))).toBe(false);
    expect(val(2, 5, state(2, { drug: "Liraglutida", dose: 1.8, kept: ["Metformina"] }))).toBe(true);
    expect(val(2, 5, state(2, { drug: "Liraglutida", dose: 0.6, kept: ["Metformina"] }))).toBe(false);
  });

  it("Caso 4", () => {
    expect(val(3, 1, state(3, { drug: "Insulina Lispro", dose: 30 }))).toBe(true);
    expect(val(3, 1, state(3, { drug: "Insulina Lispro", dose: 16 }))).toBe(false);
    expect(val(3, 1, state(3, { drug: "Insulina Glargina", dose: 80 }))).toBe(false);
    expect(val(3, 2, state(3, { drug: "Insulina Glargina", dose: 80 }))).toBe(true);
    expect(val(3, 2, state(3, { drug: "Insulina Glargina", dose: 20 }))).toBe(false);
    expect(val(3, 2, state(3, { drug: "Insulina Lispro", dose: 30 }))).toBe(false);
    expect(val(3, 3, state(3, { drug: "Empagliflozina", dose: 25 }))).toBe(true);
    expect(val(3, 3, state(3, { drug: "Empagliflozina", dose: 10 }))).toBe(false);
    expect(val(3, 3, state(3, { drug: "Metformina", dose: 2550 }))).toBe(false);
  });

  it("Caso 5", () => {
    expect(val(4, 0, state(4, { kept: ["Metformina"] }))).toBe(true);
    expect(val(4, 0, state(4))).toBe(false);
    expect(val(4, 0, state(4, { kept: [] }))).toBe(false);
    expect(val(4, 2, state(4, { kept: ["Metformina"], doses: { Metformina: 1000 } }))).toBe(true);
    expect(val(4, 2, state(4, { kept: ["Metformina"], doses: { Metformina: 750 } }))).toBe(true);
    expect(val(4, 2, state(4, { kept: ["Metformina"], doses: { Metformina: 1500 } }))).toBe(false);
    expect(val(4, 2, state(4, { kept: ["Metformina"], doses: { Metformina: 500 } }))).toBe(false);
    expect(val(4, 2, state(4))).toBe(false);
    const sita = (d: number) => state(4, { drug: "Sitagliptina", dose: d, kept: ["Metformina"], doses: { Metformina: 1000 } });
    expect(val(4, 3, sita(50))).toBe(true);
    expect(val(4, 3, sita(100))).toBe(false);
    expect(val(4, 3, state(4, { drug: "Sitagliptina", dose: 50 }))).toBe(false);
    expect(val(4, 4, sita(50))).toBe(true);
    expect(val(4, 4, state(4, { drug: "Insulina Glargina", dose: 10, kept: ["Metformina"], doses: { Metformina: 1000 } }))).toBe(false);
  });

  it("cada caso tem 6 desafios, ao menos 3 de ajuste, e as alternativas têm 4 opções", () => {
    for (const set of sets) {
      expect(set).toHaveLength(6);
      expect(set.filter(c => c.type === "adjust").length).toBeGreaterThanOrEqual(3);
      for (const c of set) {
        const o = (c as any).options as string[]; expect(o).toHaveLength(4);
        expect((c as any).correctIndex).toBeGreaterThanOrEqual(0); expect((c as any).correctIndex).toBeLessThan(4);
      }
    }
  });
});
