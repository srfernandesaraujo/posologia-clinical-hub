// Motor do simulador "Glicemia, Diabetes e Insulinoterapia" (Farmacoterapia Laboratorial).
// Puro e testável (engine.test.ts fixa cada número citado nos desafios).
//
// Evoluções da revisão dos desafios (todas opcionais, sem quebrar casos antigos/por IA):
//  - Pseudo-fármaco "Nenhum fármaco adicional" (sem dose): mostra o paciente só com o esquema mantido.
//  - `regimen` no caso: esquema JÁ em uso. O baseLab é o laboratório COM esse esquema; cada item pode ser
//    mantido ou suspenso (o simulador desfaz o efeito do item suspenso) e o fármaco escolhido soma por cima.
//  - Limites renais por TFG (metformina, sitagliptina), eficácia glicêmica menor da empagliflozina com TFG baixa,
//    risco de hipoglicemia maior com sulfonilureia/insulina na DRC e risco de acidose láctica pela metformina.
//  - HbA1c passa a ser PROJEÇÃO DE EQUILÍBRIO (~3 meses); jejum e pós-prandial respondem em dias.
//  - Casos de cetoacidose (baseLab.ph definido): pH, HCO₃⁻ e ânion gap; só insulina resolve; basal sozinha não.
//  - Caso com IC (`ic`): barra "Descompensação de IC" (pioglitazona).

export interface GlicDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { jejum: number; pp: number; hba1c: number; insulina: number; peptideoC: number; k: number };
  sideEffects: { hipo: number; gi: number; peso: number; cetoacidose: number; lacticoacidose: number };
  /** Dias até o efeito pleno projetado (o painel mostra o estado já estabilizado no dia 7). */
  daysToEffect: number;
  noDose?: boolean;
  /** Fração da cetoacidose que o fármaco resolve na dose máxima (só casos com pH no baseLab). */
  cad?: number;
  /** Efeito sobre a glicemia na cetoacidose (substitui jejum/pp da tabela normal). */
  cadEffects?: { jejum: number; pp: number };
  /** Risco de retenção hídrica/descompensação de IC (só casos com `ic`). */
  edema?: number;
}

export const NO_DRUG = "Nenhum fármaco adicional";

export const DRUGS: GlicDrug[] = [
  { name: NO_DRUG, class: "Só o esquema mantido", doseMin: 0, doseMax: 0, doseUnit: "", doseStep: 1, effects: { jejum: 0, pp: 0, hba1c: 0, insulina: 0, peptideoC: 0, k: 0 }, sideEffects: { hipo: 0, gi: 0, peso: 0, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 0, noDose: true },
  { name: "Metformina", class: "Biguanida", doseMin: 500, doseMax: 2550, doseUnit: "mg/dia", doseStep: 250, effects: { jejum: -40, pp: -50, hba1c: -1.5, insulina: 0, peptideoC: 0, k: 0 }, sideEffects: { hipo: 0.02, gi: 0.35, peso: -0.1, cetoacidose: 0, lacticoacidose: 0.05 }, daysToEffect: 7 },
  { name: "Glibenclamida", class: "Sulfonilureia", doseMin: 2.5, doseMax: 20, doseUnit: "mg/dia", doseStep: 2.5, effects: { jejum: -55, pp: -70, hba1c: -1.5, insulina: 15, peptideoC: 0.5, k: 0 }, sideEffects: { hipo: 0.4, gi: 0.1, peso: 0.3, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 3 },
  { name: "Empagliflozina", class: "iSGLT2", doseMin: 10, doseMax: 25, doseUnit: "mg/dia", doseStep: 15, effects: { jejum: -25, pp: -35, hba1c: -0.8, insulina: -5, peptideoC: 0, k: 0 }, sideEffects: { hipo: 0.01, gi: 0.05, peso: -0.2, cetoacidose: 0.08, lacticoacidose: 0 }, daysToEffect: 5 },
  { name: "Sitagliptina", class: "iDPP-4", doseMin: 25, doseMax: 100, doseUnit: "mg/dia", doseStep: 25, effects: { jejum: -15, pp: -40, hba1c: -0.7, insulina: 8, peptideoC: 0.3, k: 0 }, sideEffects: { hipo: 0.02, gi: 0.08, peso: 0.05, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 5 },
  { name: "Liraglutida", class: "GLP-1 RA", doseMin: 0.6, doseMax: 1.8, doseUnit: "mg/dia SC", doseStep: 0.6, effects: { jejum: -30, pp: -55, hba1c: -1.2, insulina: 10, peptideoC: 0.4, k: 0 }, sideEffects: { hipo: 0.02, gi: 0.3, peso: -0.3, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 7 },
  { name: "Insulina NPH", class: "Insulina Basal", doseMin: 10, doseMax: 60, doseUnit: "UI/dia", doseStep: 2, effects: { jejum: -60, pp: -30, hba1c: -1.5, insulina: 30, peptideoC: 0, k: -0.4 }, sideEffects: { hipo: 0.35, gi: 0, peso: 0.4, cetoacidose: -0.5, lacticoacidose: 0 }, daysToEffect: 2, cad: 0.35, cadEffects: { jejum: -80, pp: -80 } },
  { name: "Insulina Glargina", class: "Insulina Basal", doseMin: 10, doseMax: 80, doseUnit: "UI/dia", doseStep: 2, effects: { jejum: -65, pp: -25, hba1c: -1.5, insulina: 25, peptideoC: 0, k: -0.4 }, sideEffects: { hipo: 0.2, gi: 0, peso: 0.35, cetoacidose: -0.5, lacticoacidose: 0 }, daysToEffect: 3, cad: 0.35, cadEffects: { jejum: -80, pp: -80 } },
  { name: "Insulina Lispro", class: "Insulina Rápida", doseMin: 4, doseMax: 30, doseUnit: "UI/refeição", doseStep: 2, effects: { jejum: -10, pp: -80, hba1c: -1.0, insulina: 40, peptideoC: 0, k: -0.5 }, sideEffects: { hipo: 0.45, gi: 0, peso: 0.4, cetoacidose: -0.3, lacticoacidose: 0 }, daysToEffect: 0.5, cad: 1, cadEffects: { jejum: -250, pp: -250 } },
  { name: "Pioglitazona", class: "Tiazolidinediona", doseMin: 15, doseMax: 45, doseUnit: "mg/dia", doseStep: 15, effects: { jejum: -35, pp: -40, hba1c: -1.0, insulina: -8, peptideoC: 0, k: 0 }, sideEffects: { hipo: 0.02, gi: 0.05, peso: 0.35, cetoacidose: 0, lacticoacidose: 0 }, daysToEffect: 7, edema: 0.5 },
];

export const isInsulin = (d: GlicDrug) => d.class.startsWith("Insulina");

export interface RegimenItem { drug: string; dose: number }

export interface GlicBaseLab {
  jejum: number; pp: number; hba1c: number; insulina: number; peptideoC: number;
  creatinina: number; tfg: number; potassio: number;
  /** Só nos casos de cetoacidose. */
  ph?: number; hco3?: number; anionGap?: number;
}

export interface GlicOptions {
  regimen?: RegimenItem[];
  /** Nomes dos itens do esquema que continuam em uso (padrão: todos). */
  kept?: string[];
  /** Dose atual de cada item mantido do esquema (padrão: a dose original do caso). */
  doses?: Record<string, number>;
  ic?: boolean;
}

export const getDrug = (name: string) => DRUGS.find(d => d.name === name);
const doseFracOf = (d: GlicDrug, dose: number) => d.noDose ? 0 : Math.min(1, Math.max(0, (dose - d.doseMin) / Math.max(d.doseMax - d.doseMin, 1)));
const intensityOf = (d: GlicDrug, dose: number) => 0.65 + doseFracOf(d, dose) * 0.35;

/** Eficácia glicêmica da empagliflozina cai com a TFG (efeito cardiorrenal não depende disso). */
export function glycFactor(d: GlicDrug, tfg: number): number {
  if (d.name !== "Empagliflozina") return 1;
  return tfg >= 60 ? 1 : tfg >= 45 ? 0.75 : tfg >= 30 ? 0.5 : 0.25;
}

/** Dose máxima segura para a TFG: null = sem limite; 0 = contraindicado. */
export function renalLimit(d: GlicDrug, tfg: number): number | null {
  if (d.name === "Metformina") return tfg < 30 ? 0 : tfg < 45 ? 1000 : null;
  if (d.name === "Sitagliptina") return tfg < 30 ? 25 : tfg < 50 ? 50 : null;
  return null;
}
export const overRenalLimit = (d: GlicDrug, dose: number, tfg: number) => {
  if (d.noDose) return false;
  const lim = renalLimit(d, tfg);
  return lim !== null && (lim === 0 || dose > lim);
};

function hipoRenalFactor(d: GlicDrug, tfg: number): number {
  if (d.name === "Glibenclamida") return 1 + Math.max(0, 60 - tfg) / 40;
  if (isInsulin(d)) return 1 + Math.max(0, 45 - tfg) / 60;
  return 1;
}

type RiskKey = "hipo" | "gi" | "peso" | "cetoacidose" | "lacticoacidose" | "ic";

function riskOf(d: GlicDrug, dose: number, tfg: number, cad: boolean, ic: boolean): Record<RiskKey, number> {
  const m = 0.5 + doseFracOf(d, dose) * 0.8;
  const base = (v: number) => Math.max(0, v * m) * 100;
  let lactico = base(d.sideEffects.lacticoacidose);
  if (d.name === "Metformina") {
    const lim = renalLimit(d, tfg);
    if (lim === 0) lactico *= 10;
    else if (lim !== null) lactico *= dose > lim ? 6 : 2;
    if (cad) lactico *= 8;
  }
  let ceto = base(d.sideEffects.cetoacidose);
  if (cad && d.sideEffects.cetoacidose > 0) ceto *= 6;
  return {
    hipo: base(d.sideEffects.hipo) * hipoRenalFactor(d, tfg),
    gi: base(d.sideEffects.gi),
    peso: base(d.sideEffects.peso),
    cetoacidose: ceto,
    lacticoacidose: lactico,
    ic: ic ? (d.edema ?? 0) * m * 100 : 0,
  };
}

export const RISK_LABEL: Record<RiskKey, string> = {
  hipo: "Hipoglicemia", gi: "GI", peso: "Ganho de Peso", cetoacidose: "Cetoacidose", lacticoacidose: "Acidose Láctica", ic: "Descompensação de IC",
};

type Effect = { jejum: number; pp: number; hba1c: number; insulina: number; peptideoC: number; k: number };
function effectOf(d: GlicDrug, dose: number, tfg: number, cad: boolean): Effect {
  const intensity = intensityOf(d, dose);
  const f = glycFactor(d, tfg);
  const df = doseFracOf(d, dose);
  const cadScale = 0.3 + 0.7 * df;
  return {
    jejum: (cad && d.cadEffects ? d.cadEffects.jejum * cadScale : d.effects.jejum * intensity * f),
    pp: (cad && d.cadEffects ? d.cadEffects.pp * cadScale : d.effects.pp * intensity * f),
    hba1c: d.effects.hba1c * intensity * f,
    insulina: d.effects.insulina * intensity,
    peptideoC: d.effects.peptideoC * intensity,
    k: d.effects.k * intensity,
  };
}

export function computeSimulation(drug: GlicDrug, dose: number, baseLab: GlicBaseLab, opts: GlicOptions = {}) {
  const tfg = baseLab.tfg;
  const cad = baseLab.ph !== undefined;
  const ic = !!opts.ic;
  const regimen = (opts.regimen ?? []).map(r => ({ item: r, drug: getDrug(r.drug) })).filter((r): r is { item: RegimenItem; drug: GlicDrug } => !!r.drug);
  const keptSet = new Set(opts.kept ?? regimen.map(r => r.item.drug));
  const doseOf = (r: { item: RegimenItem }) => opts.doses?.[r.item.drug] ?? r.item.dose;
  // Se o fármaco escolhido já faz parte do esquema, ele SUBSTITUI esse item (evita contar duas vezes).
  const isKept = (r: { item: RegimenItem }) => keptSet.has(r.item.drug) && r.item.drug !== drug.name;
  const replaced = regimen.find(r => keptSet.has(r.item.drug) && r.item.drug === drug.name)?.item.drug ?? null;

  // Paciente SEM nenhum fármaco do esquema (desfaz o efeito de cada item), depois soma os mantidos.
  const start = { jejum: baseLab.jejum, pp: baseLab.pp, hba1c: baseLab.hba1c, insulina: baseLab.insulina, peptideoC: baseLab.peptideoC, k: baseLab.potassio };
  for (const r of regimen) {
    const e = effectOf(r.drug, r.item.dose, tfg, false);
    start.jejum -= e.jejum; start.pp -= e.pp; start.hba1c -= e.hba1c; start.insulina -= e.insulina; start.peptideoC -= e.peptideoC;
    if (isKept(r)) { const c = effectOf(r.drug, doseOf(r), tfg, false); start.jejum += c.jejum; start.pp += c.pp; start.hba1c += c.hba1c; start.insulina += c.insulina; start.peptideoC += c.peptideoC; }
  }

  const sel = effectOf(drug, dose, tfg, cad);
  const resFull = cad && drug.cad ? Math.min(1, drug.cad * (0.3 + 0.7 * doseFracOf(drug, dose))) : 0;

  const trend: any[] = [];
  for (let d = 0; d <= 7; d++) {
    const p = drug.noDose ? 0 : Math.min(1, d / Math.max(drug.daysToEffect, 0.5));
    const row: any = {
      day: d,
      jejum: Math.max(40, Math.round(start.jejum + sel.jejum * p)),
      pp: Math.max(60, Math.round(start.pp + sel.pp * p)),
      hba1c: Math.max(4, +(start.hba1c + sel.hba1c * p).toFixed(1)),
      insulina: Math.max(0, +(start.insulina + sel.insulina * p).toFixed(1)),
      peptideoC: Math.max(0, +(start.peptideoC + sel.peptideoC * p).toFixed(1)),
      k: Math.max(2.5, +(start.k + sel.k * p).toFixed(1)),
    };
    if (cad) {
      const res = Math.min(1, resFull * p);
      row.ph = +((baseLab.ph as number) + (7.40 - (baseLab.ph as number)) * res).toFixed(2);
      row.hco3 = +((baseLab.hco3 ?? 12) + (24 - (baseLab.hco3 ?? 12)) * res).toFixed(1);
      row.anionGap = Math.round((baseLab.anionGap ?? 24) + (12 - (baseLab.anionGap ?? 24)) * res);
    }
    trend.push(row);
  }
  const last = trend[trend.length - 1];

  // Riscos: soma do esquema mantido + fármaco escolhido.
  const total: Record<RiskKey, number> = { hipo: 0, gi: 0, peso: 0, cetoacidose: 0, lacticoacidose: 0, ic: 0 };
  const addRisk = (r: Record<RiskKey, number>) => (Object.keys(total) as RiskKey[]).forEach(k => { total[k] += r[k]; });
  for (const r of regimen) if (isKept(r)) addRisk(riskOf(r.drug, doseOf(r), tfg, false, ic));
  addRisk(riskOf(drug, dose, tfg, cad, ic));
  if (last.jejum < 80) total.hipo += Math.min(40, (80 - last.jejum) * 1.5);
  const keys: RiskKey[] = ic ? ["hipo", "gi", "peso", "cetoacidose", "lacticoacidose", "ic"] : ["hipo", "gi", "peso", "cetoacidose", "lacticoacidose"];
  const sideEffects = keys.map(k => ({ name: RISK_LABEL[k], risco: Math.min(100, Math.round(total[k])) }));

  const labGauges: { name: string; value: number; unit: string; refLow: number; refHigh: number; status: string }[] = [
    { name: "Jejum", value: last.jejum, unit: "mg/dL", refLow: 70, refHigh: 99, status: last.jejum < 70 ? "baixo" : last.jejum > 99 ? "alto" : "normal" },
    { name: "Pós-prandial", value: last.pp, unit: "mg/dL", refLow: 70, refHigh: 140, status: last.pp > 140 ? "alto" : "normal" },
    { name: "HbA1c (projeção)", value: last.hba1c, unit: "%", refLow: 4.0, refHigh: 7.0, status: last.hba1c > 7.0 ? "alto" : "normal" },
    { name: "Insulina", value: last.insulina, unit: "µUI/mL", refLow: 2.6, refHigh: 24.9, status: last.insulina < 2.6 ? "baixo" : last.insulina > 24.9 ? "alto" : "normal" },
    { name: "Peptídeo-C", value: last.peptideoC, unit: "ng/mL", refLow: 0.5, refHigh: 2.0, status: last.peptideoC < 0.5 ? "baixo" : last.peptideoC > 2.0 ? "alto" : "normal" },
    { name: "K⁺", value: last.k, unit: "mEq/L", refLow: 3.5, refHigh: 5.0, status: last.k < 3.5 ? "baixo" : last.k > 5.0 ? "alto" : "normal" },
    { name: "TFG", value: baseLab.tfg, unit: "mL/min", refLow: 60, refHigh: 120, status: baseLab.tfg < 60 ? "baixo" : "normal" },
  ];
  if (cad) {
    labGauges.push(
      { name: "pH", value: last.ph, unit: "", refLow: 7.35, refHigh: 7.45, status: last.ph < 7.35 ? "baixo" : last.ph > 7.45 ? "alto" : "normal" },
      { name: "HCO₃⁻", value: last.hco3, unit: "mEq/L", refLow: 22, refHigh: 28, status: last.hco3 < 22 ? "baixo" : last.hco3 > 28 ? "alto" : "normal" },
      { name: "Ânion gap", value: last.anionGap, unit: "mEq/L", refLow: 8, refHigh: 12, status: last.anionGap > 12 ? "alto" : "normal" },
    );
  }

  const keptOverRenal = regimen.filter(r => isKept(r) && overRenalLimit(r.drug, doseOf(r), tfg)).map(r => r.item.drug);
  return {
    trend, sideEffects, labGauges, lastLab: last,
    renalMax: renalLimit(drug, tfg),
    overRenal: overRenalLimit(drug, dose, tfg),
    keptOverRenal,
    replaced,
    /** HbA1c do paciente SEM nenhum fármaco do esquema (referência para os desafios). */
    untreated: { jejum: Math.round(start.jejum), pp: Math.round(start.pp), hba1c: +start.hba1c.toFixed(1) },
  };
}

/** Resolução da cetoacidose (critérios ADA): pH ≥ 7,30, HCO₃⁻ ≥ 18 e ânion gap ≤ 12. */
export const cadResolved = (l: { ph?: number; hco3?: number; anionGap?: number }) =>
  l.ph !== undefined && l.ph >= 7.30 && (l.hco3 ?? 0) >= 18 && (l.anionGap ?? 99) <= 12;
