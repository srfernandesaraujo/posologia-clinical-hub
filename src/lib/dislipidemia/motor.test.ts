import { describe, it, expect } from "vitest";
import { computeRegimen, nonHdlTargetFor, DRUGS, type RegimenItem, type LipidLab } from "./motor";

const R = (...a: [string, number][]): RegimenItem[] => a.map(([name, dose]) => ({ name, dose }));
const sim = (reg: RegimenItem[], lab: LipidLab, bg?: RegimenItem[], extra: Record<string, any> = {}, ls = false) =>
  computeRegimen(reg, { baseLab: lab, background: bg, ...extra }, ls);

const C1: LipidLab = { ct: 262, ldl: 180, hdl: 38, tg: 220, apoB: 160, cpk: 120 };
const C2: LipidLab = { ct: 241, ldl: 160, hdl: 52, tg: 145, apoB: 135, cpk: 680 };
const C3: LipidLab = { ct: 320, ldl: 110, hdl: 28, tg: 850, apoB: 140, cpk: 90 };
const C4: LipidLab = { ct: 159, ldl: 82, hdl: 45, tg: 160, apoB: 95, cpk: 140 };
const C5: LipidLab = { ct: 247, ldl: 170, hdl: 55, tg: 110, apoB: 150, cpk: 100 };
const LS3 = { lifestyle: { label: "x", effects: { tg: -35, hdl: 8 } } };

describe("motor de dislipidemia: efeitos por fármaco e dose", () => {
  it("regra dos 6%: dobrar a atorvastatina rende ~6 pontos percentuais; a ezetimiba rende mais que isso", () => {
    expect(sim(R(["Atorvastatina", 40]), C1).lastLab.ldl).toBe(92);
    expect(sim(R(["Atorvastatina", 80]), C1).lastLab.ldl).toBe(81);
    expect(sim(R(["Atorvastatina", 40], ["Ezetimiba", 10]), C1).lastLab.ldl).toBe(75);
    expect(sim(R(["Atorvastatina", 80], ["Ezetimiba", 10]), C1).lastLab.ldl).toBe(66);
    expect(sim(R(["Rosuvastatina", 40], ["Ezetimiba", 10]), C1).lastLab.ldl).toBe(69);
  });
  it("não-HDL = CT − HDL e acompanha as variações; TG alto no caso 1 deixa o não-HDL no limite", () => {
    const s = sim(R(["Atorvastatina", 80], ["Ezetimiba", 10]), C1);
    expect(s.lastLab.nonHdl).toBe(s.lastLab.ct - s.lastLab.hdl);
    expect(s.lastLab.nonHdl).toBe(100);
    expect(s.lastLab.tg).toBe(167);
  });
  it("fenofibrato isolado: número bonito (TG, HDL) sem mexer no LDL", () => {
    const s = sim(R(["Fenofibrato", 160]), C1);
    expect([s.lastLab.ldl, s.lastLab.hdl, s.lastLab.tg, s.lastLab.nonHdl, s.cpk]).toEqual([171, 44, 121, 195, 218]);
  });
  it("sem fármaco e sem esquema em uso, o laboratório do caso permanece", () => {
    const s = sim([], C1);
    expect(s.unchanged).toBe(true);
    expect(s.lastLab.ldl).toBe(180);
    expect(s.trend.every(t => t.ldl === 180)).toBe(true);
  });
  it("efeito pleno em até 4 semanas para estatina e cresce até a semana 8 só para o ômega-3", () => {
    const s = sim(R(["Atorvastatina", 40]), C1);
    expect(s.trend[0].ldl).toBe(180);
    expect(s.trend[4].ldl).toBe(s.trend[8].ldl);
    const o = sim(R(["Ômega-3", 4]), C3);
    expect(o.trend[4].tg).toBeGreaterThan(o.trend[8].tg);
  });
  it("ômega-3 é proporcional à dose; fármacos de dose fixa ignoram o deslizador", () => {
    expect(sim(R(["Ômega-3", 1]), C3).lastLab.tg).toBeGreaterThan(sim(R(["Ômega-3", 4]), C3).lastLab.tg);
    const evo = DRUGS.find(d => d.name === "Evolocumabe")!;
    expect(evo.doseMin).toBe(evo.doseMax);
  });
});

describe("motor de dislipidemia: esquema em uso (background)", () => {
  it("manter o esquema em uso devolve exatamente o laboratório do caso", () => {
    expect(sim(R(["Sinvastatina", 40]), C2, R(["Sinvastatina", 40]), { cpkOff: 95 }).lastLab.ldl).toBe(160);
    expect(sim(R(["Sinvastatina", 40]), C2, R(["Sinvastatina", 40]), { cpkOff: 95 }).cpk).toBe(680);
    expect(sim(R(["Atorvastatina", 80]), C4, R(["Atorvastatina", 80])).lastLab).toMatchObject({ ldl: 82, tg: 160, ct: 159 });
    expect(sim(R(["Rosuvastatina", 40], ["Ezetimiba", 10]), C5, R(["Rosuvastatina", 40], ["Ezetimiba", 10])).lastLab).toMatchObject({ ldl: 170, tg: 110, ct: 247 });
  });
  it("Caso 2: suspender a sinvastatina derruba o CPK e devolve o LDL de antes da estatina", () => {
    const s = sim([], C2, R(["Sinvastatina", 40]), { cpkOff: 95 });
    expect(s.cpk).toBe(95);
    expect(s.lastLab.ldl).toBe(254);
  });
  it("Caso 2: rosuvastatina em dose menor + ezetimiba reduz a mialgia e fica perto da meta", () => {
    const bg = R(["Sinvastatina", 40]);
    const a = sim(R(["Rosuvastatina", 20], ["Ezetimiba", 10]), C2, bg, { cpkOff: 95 });
    const b = sim(R(["Rosuvastatina", 40], ["Ezetimiba", 10]), C2, bg, { cpkOff: 95 });
    const atual = sim(bg, C2, bg, { cpkOff: 95 });
    expect(a.lastLab.ldl).toBe(108);
    expect(b.lastLab.ldl).toBe(98);
    expect(a.sideEffects[0].risco).toBeLessThan(atual.sideEffects[0].risco);
    expect(a.cpk).toBeLessThan(200);
    expect(sim(R(["Ezetimiba", 10], ["Evolocumabe", 140]), C2, bg, { cpkOff: 95 }).lastLab.ldl).toBe(83);
    expect(sim(R(["Evolocumabe", 140]), C2, bg, { cpkOff: 95 }).lastLab.ldl).toBe(102);
  });
  it("Caso 4: trocar de estatina não resolve; ezetimiba não chega a 50; iPCSK9 chega; tirar a estatina perde a meta", () => {
    const bg = R(["Atorvastatina", 80]);
    expect(sim(R(["Rosuvastatina", 40]), C4, bg).lastLab.ldl).toBe(86);
    expect(sim(R(["Atorvastatina", 80], ["Ezetimiba", 10]), C4, bg).lastLab.ldl).toBe(67);
    expect(sim(R(["Atorvastatina", 80], ["Evolocumabe", 140]), C4, bg).lastLab.ldl).toBe(33);
    expect(sim(R(["Atorvastatina", 80], ["Ezetimiba", 10], ["Evolocumabe", 140]), C4, bg).lastLab.ldl).toBe(27);
    expect(sim(R(["Evolocumabe", 140]), C4, bg).lastLab.ldl).toBe(73);
    const fib = sim(R(["Atorvastatina", 80], ["Fenofibrato", 160]), C4, bg);
    expect([fib.lastLab.ldl, fib.lastLab.tg, fib.lastLab.hdl, fib.cpk]).toEqual([78, 88, 52, 238]);
  });
  it("Caso 5: terapia dupla em uso; só o iPCSK9 + as duas chega a < 70; sem a ezetimiba não chega", () => {
    const bg = R(["Rosuvastatina", 40], ["Ezetimiba", 10]);
    expect(sim(R(["Rosuvastatina", 40]), C5, bg).lastLab.ldl).toBe(207);
    expect(sim(R(["Atorvastatina", 80], ["Ezetimiba", 10]), C5, bg).lastLab.ldl).toBe(163);
    expect(sim([...bg, { name: "Evolocumabe", dose: 140 }], C5, bg).lastLab.ldl).toBe(68);
    expect(sim(R(["Rosuvastatina", 40], ["Evolocumabe", 140]), C5, bg).lastLab.ldl).toBe(83);
    expect(sim(R(["Rosuvastatina", 20], ["Ezetimiba", 10], ["Evolocumabe", 140]), C5, bg).lastLab.ldl).toBe(75);
  });
});

describe("motor de dislipidemia: caso de hipertrigliceridemia e medidas não farmacológicas", () => {
  it("TG: estatina não chega a 500, fibrato sim; as medidas sozinhas não chegam", () => {
    expect(sim(R(["Atorvastatina", 80]), C3).lastLab.tg).toBe(680);
    expect(sim(R(["Fenofibrato", 160]), C3).lastLab.tg).toBe(468);
    expect(sim([], C3, undefined, LS3, true).lastLab.tg).toBe(553);
    expect(sim(R(["Fenofibrato", 160]), C3, undefined, LS3, true).lastLab.tg).toBe(304);
  });
  it("ômega-3 soma ao fenofibrato conforme a dose, com mais efeito GI", () => {
    const um = sim(R(["Fenofibrato", 160], ["Ômega-3", 1]), C3, undefined, LS3, true);
    const quatro = sim(R(["Fenofibrato", 160], ["Ômega-3", 4]), C3, undefined, LS3, true);
    expect([um.lastLab.tg, quatro.lastLab.tg]).toEqual([281, 213]);
    expect(quatro.sideEffects[2].risco).toBeGreaterThan(um.sideEffects[2].risco);
  });
  it("estatina somada depois: LDL e não-HDL entram nas metas, com CPK acima de 200", () => {
    const s = sim(R(["Fenofibrato", 160], ["Ômega-3", 4], ["Atorvastatina", 40]), C3, undefined, LS3, true);
    expect([s.lastLab.ldl, s.lastLab.nonHdl, s.lastLab.tg]).toEqual([54, 101, 175]);
    expect(s.cpk).toBeGreaterThan(200);
  });
});

describe("motor de dislipidemia: metas", () => {
  it("meta de não-HDL por risco", () => {
    expect(nonHdlTargetFor("muito alto")).toBe(80);
    expect(nonHdlTargetFor("alto")).toBe(100);
    expect(nonHdlTargetFor("intermediário")).toBe(130);
  });
});
