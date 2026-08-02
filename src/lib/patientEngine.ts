/**
 * Motor do "Paciente Digital Contínuo" (Fase 3, item 02 do roadmap).
 *
 * Vocabulário fisiológico canônico compartilhado entre os 5 simuladores de
 * fisiologia (SNA, Depuração Renal, Equilíbrio Ácido-Base, Regulação
 * Glicêmica, Eletrofisiologia Cardíaca). Sem imports de React — testável
 * isoladamente com vitest.
 *
 * Não confundir com o `PatientVitals` de `src/components/lab-virtual/PatientRecordPanel.tsx`,
 * que é um vocabulário não relacionado da bancada de laboratório virtual.
 */

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export interface PatientVitals {
  // SNA
  sympatheticTone?: number;
  parasympatheticTone?: number;
  fc?: number;
  pas?: number;
  pad?: number;
  pupilDiameter?: number;
  giMotility?: number;
  // Depuração Renal
  renalAfferent?: number;
  renalEfferent?: number;
  renalHydration?: number;
  renalPermeability?: number;
  tfg?: number;
  urineVolume?: number;
  naSodiumUrinary?: number;
  glucoseUrinary?: number;
  serumPotassium?: number;
  // Equilíbrio Ácido-Base
  rrModifier?: number;
  renalModifier?: number;
  ph?: number;
  pCO2?: number;
  hco3?: number;
  be?: number;
  acidBaseClassification?: string;
  // Regulação Glicêmica
  carbIntake?: number;
  insulinSensitivity?: number;
  pancreaticFunction?: number;
  glycemia?: number;
  insulinemia?: number;
  insulinSecretion?: number;
  muscleUptake?: number;
  hepaticOutput?: number;
  // Eletrofisiologia Cardíaca
  naConductance?: number;
  kConductance?: number;
  caConductance?: number;
  cellType?: "ventricular" | "nodal";
}

export type PatientVitalKey = keyof PatientVitals;

export interface PatientProvenanceEntry {
  sourceSlug: string;
  sourceCaseTitle?: string;
  updatedAt: number;
}

export interface PatientState {
  vitals: PatientVitals;
  provenance: Partial<Record<PatientVitalKey, PatientProvenanceEntry>>;
  touchedModules: string[];
  createdAt: number;
}

export function createEmptyPatient(): PatientState {
  return { vitals: {}, provenance: {}, touchedModules: [], createdAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Arestas de cascata (derive*) — cada uma calcula um baseline herdado a
// partir do vocabulário canônico. Unidirecionais, sem iteração/solver.
// ---------------------------------------------------------------------------

/** Aresta 1: SNA -> Renal (tônus simpático alto reduz perfusão renal aferente/eferente). */
export function deriveRenalBaselineFromSNA(
  vitals: PatientVitals,
  caseDefaults: { afferent: number; efferent: number }
): { afferent: number; efferent: number } {
  if (vitals.sympatheticTone === undefined) return caseDefaults;
  const delta = Math.round((vitals.sympatheticTone - 40) * 0.4);
  return {
    afferent: clamp(caseDefaults.afferent - delta, 10, 100),
    efferent: clamp(caseDefaults.efferent - delta, 10, 100),
  };
}

/** Aresta 2: SNA -> Glicemia (catecolaminas suprimem a função pancreática efetiva). */
export function deriveGlycemicBaselineFromSNA(
  vitals: PatientVitals,
  caseDefaults: { pancreaticFunction: number }
): { pancreaticFunction: number } {
  if (vitals.sympatheticTone === undefined) return caseDefaults;
  const delta = Math.round((vitals.sympatheticTone - 40) * 0.2);
  return { pancreaticFunction: clamp(caseDefaults.pancreaticFunction - delta, 0, 100) };
}

/** Aresta 3: Renal -> Ácido-Base (TFG baixa reduz a capacidade de compensação renal). */
export function deriveAcidBaseRenalCapacity(vitals: PatientVitals): number {
  if (vitals.tfg === undefined) return 1;
  return clamp(vitals.tfg / 100, 0, 1);
}

/** Aresta 4: Renal -> Eletrofisiologia (K+ sérico desloca a condutância de K+). */
export function deriveElectroBaselineFromRenal(
  vitals: PatientVitals,
  caseDefaults: { k: number }
): { k: number } {
  if (vitals.serumPotassium === undefined) return caseDefaults;
  const delta = Math.round((vitals.serumPotassium - 4.0) * 15);
  return { k: clamp(caseDefaults.k + delta, 0, 200) };
}

/** Aresta 6: Glicemia -> Ácido-Base (hiperglicemia grave + baixa função pancreática = proxy de cetoacidose). */
export function deriveAcidBaseBaselineFromGlycemic(
  vitals: PatientVitals,
  caseDefaults: { pco2: number; hco3: number }
): { pco2: number; hco3: number } {
  if (
    vitals.glycemia === undefined ||
    vitals.pancreaticFunction === undefined ||
    vitals.glycemia <= 300 ||
    vitals.pancreaticFunction >= 20
  ) {
    return caseDefaults;
  }
  const severity = clamp((vitals.glycemia - 300) / 200, 0, 1);
  return {
    pco2: +(40 - severity * 20).toFixed(1),
    hco3: +(24 - severity * 17).toFixed(1),
  };
}

// ---------------------------------------------------------------------------
// computeRenal — movida de SimuladorDepuracaoRenal.tsx. Ganha `serumGlycemia`
// opcional para corrigir a glicosúria (antes dependia só de `permeability`,
// ignorando a glicemia real do paciente).
// ---------------------------------------------------------------------------

const GLYCOSURIA_THRESHOLD = 180; // mg/dL, limiar renal de reabsorção de glicose

export interface RenalOutputs {
  tfg: number;
  urineVolume: number;
  filtered: number;
  reabsorbed: number;
  naSodium: number;
  glucose: number;
  potassium: number;
}

export function computeRenal(
  afferent: number,
  efferent: number,
  hydration: number,
  permeability: number,
  serumGlycemia?: number
): RenalOutputs {
  const af = afferent / 100;
  const ef = efferent / 100;
  const hy = hydration / 100;
  const perm = permeability / 100;
  const pressureGrad = af * 60 - ef * 15 - 10;
  const tfg = Math.min(200, Math.max(0, Math.round(pressureGrad * 2.5 * hy * perm)));
  const filtered = (tfg * 1440) / 1000;
  const reabsorbed = filtered * 0.99 * perm;
  const urineVolume = Math.min(10, Math.max(0.3, +(filtered - reabsorbed).toFixed(1)));
  const naSodium = Math.round(140 * (1 - perm * 0.97));
  const glucose =
    serumGlycemia !== undefined && serumGlycemia > GLYCOSURIA_THRESHOLD
      ? Math.round((serumGlycemia - GLYCOSURIA_THRESHOLD) * (0.5 + (1 - perm) * 0.5))
      : 0;
  const potassium = +(4.0 + (1 - clamp(tfg / 100, 0, 1.5)) * 3.5).toFixed(1);
  return {
    tfg,
    urineVolume,
    filtered: +filtered.toFixed(1),
    reabsorbed: +reabsorbed.toFixed(1),
    naSodium,
    glucose,
    potassium,
  };
}

// ---------------------------------------------------------------------------
// publish* — traduzem outputs brutos de cada simulador para o vocabulário
// canônico, para serem enviados a `updateFromModule`.
// ---------------------------------------------------------------------------

export function publishSNAVitals(
  sympathetic: number,
  parasympathetic: number,
  outputs: { fc: number; pas: number; pad: number; pupilDiameter: number; giMotility: number }
): Partial<PatientVitals> {
  return {
    sympatheticTone: sympathetic,
    parasympatheticTone: parasympathetic,
    fc: outputs.fc,
    pas: outputs.pas,
    pad: outputs.pad,
    pupilDiameter: outputs.pupilDiameter,
    giMotility: outputs.giMotility,
  };
}

export function publishRenalVitals(
  afferent: number,
  efferent: number,
  hydration: number,
  permeability: number,
  renal: RenalOutputs
): Partial<PatientVitals> {
  return {
    renalAfferent: afferent,
    renalEfferent: efferent,
    renalHydration: hydration,
    renalPermeability: permeability,
    tfg: renal.tfg,
    urineVolume: renal.urineVolume,
    naSodiumUrinary: renal.naSodium,
    glucoseUrinary: renal.glucose,
    serumPotassium: renal.potassium,
  };
}

export function publishAcidBaseVitals(
  rrModifier: number,
  renalModifier: number,
  ab: { ph: number; pCO2: number; hco3: number; be: number; classification: string }
): Partial<PatientVitals> {
  return {
    rrModifier,
    renalModifier,
    ph: ab.ph,
    pCO2: ab.pCO2,
    hco3: ab.hco3,
    be: ab.be,
    acidBaseClassification: ab.classification,
  };
}

export function publishGlycemicVitals(
  carbIntake: number,
  insulinSensitivity: number,
  pancreaticFunction: number,
  outputs: {
    glycemia: number;
    insulinemia: number;
    insulinSecretion: number;
    muscleUptake: number;
    hepaticOutput: number;
  }
): Partial<PatientVitals> {
  return {
    carbIntake,
    insulinSensitivity,
    pancreaticFunction,
    glycemia: outputs.glycemia,
    insulinemia: outputs.insulinemia,
    insulinSecretion: outputs.insulinSecretion,
    muscleUptake: outputs.muscleUptake,
    hepaticOutput: outputs.hepaticOutput,
  };
}

export function publishElectroVitals(
  na: number,
  k: number,
  ca: number,
  cellType: "ventricular" | "nodal"
): Partial<PatientVitals> {
  return { naConductance: na, kConductance: k, caConductance: ca, cellType };
}
