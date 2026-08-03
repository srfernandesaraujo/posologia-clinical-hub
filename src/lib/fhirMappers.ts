/**
 * Modelo de dados "amigável" do Simulador de Prontuário Eletrônico (FHIR) e
 * as funções determinísticas que o convertem para JSON no formato FHIR R4
 * (Patient/Condition/MedicationRequest/Observation/ServiceRequest) para o
 * painel "Ver como FHIR". Não é uma implementação validada contra o schema
 * oficial do HL7 — é uma ilustração pedagógica de como esses dados
 * trafegariam via API FHIR, feita por mapeamento de código (não gerada por
 * IA), para evitar risco de a IA produzir um recurso FHIR malformado.
 */

export type ProblemStatus = "active" | "resolved" | "inactive";

export interface Problem {
  id: string;
  display: string;
  icd10Code: string;
  onsetDescription: string;
  status: ProblemStatus;
  rationale?: string;
}

export interface MedicationInUse {
  id: string;
  drug: string;
  atcCode: string;
  dose: string;
  route: string;
  frequency: string;
  status: "active" | "stopped" | "on-hold";
  reasonProblemId?: string;
}

export interface LabObservation {
  id: string;
  name: string;
  loincCode: string;
  value: number;
  unit: string;
  referenceRange: string;
  interpretation: "normal" | "high" | "low" | "critical";
}

export interface ExamOrderOption {
  id: string;
  name: string;
  loincCode: string;
  category: string;
  rationale?: string;
}

export type PrescribingAction = "manter" | "iniciar" | "aumentar" | "reduzir" | "suspender" | "trocar";

export interface PrescribingOption {
  id: string;
  label: string;
  drug: string;
  atcCode?: string;
  dose: string;
  frequency: string;
  action: PrescribingAction;
  replacesDrug?: string;
  rationale: string;
}

export interface Encounter {
  id: string;
  index: number;
  label: string;
  dateDescription: string;
  narrative: string;
  vitals: Record<string, string>;
  resultsRevealed: LabObservation[];
  availableOrders: ExamOrderOption[];
  idealOrderIds: string[];
  availablePrescribingOptions: PrescribingOption[];
  idealPrescribingOptionId: string;
  educationalNote?: string;
}

export interface Demographics {
  name: string;
  birthDateDescription: string;
  gender: "male" | "female";
}

export interface ProntuarioFHIRCase {
  id?: string;
  title: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
  isAI?: boolean;
  patient: Demographics & { diagnosis: string };
  problems: Problem[];
  medications: MedicationInUse[];
  baselineObservations: LabObservation[];
  encounters: Encounter[];
}

// ---------------------------------------------------------------------------
// Aplicação de conduta sobre a lista de medicações correntes (aba Medicações
// reflete as escolhas do próprio aluno, não o gabarito)
// ---------------------------------------------------------------------------

export function applyPrescribingAction(
  current: MedicationInUse[],
  option: PrescribingOption
): MedicationInUse[] {
  const byDrug = (drug: string) => (m: MedicationInUse) => m.drug.toLowerCase() === drug.toLowerCase();

  switch (option.action) {
    case "manter":
      return [...current];
    case "iniciar":
      return [
        ...current,
        {
          id: `med-${option.id}`,
          drug: option.drug,
          atcCode: option.atcCode || "",
          dose: option.dose,
          route: "VO",
          frequency: option.frequency,
          status: "active",
        },
      ];
    case "aumentar":
    case "reduzir":
      return current.map(m =>
        byDrug(option.drug)(m) ? { ...m, dose: option.dose, frequency: option.frequency } : m
      );
    case "suspender":
      return current.map(m => (byDrug(option.drug)(m) ? { ...m, status: "stopped" as const } : m));
    case "trocar": {
      const stopped = current.map(m =>
        option.replacesDrug && byDrug(option.replacesDrug)(m) ? { ...m, status: "stopped" as const } : m
      );
      return [
        ...stopped,
        {
          id: `med-${option.id}`,
          drug: option.drug,
          atcCode: option.atcCode || "",
          dose: option.dose,
          route: "VO",
          frequency: option.frequency,
          status: "active",
        },
      ];
    }
    default:
      return [...current];
  }
}

// ---------------------------------------------------------------------------
// Mapeamento para FHIR R4 (ilustrativo) + anotação linha a linha
// ---------------------------------------------------------------------------

export interface FhirCaptionRule {
  match: string;
  caption: string;
  onlyFirst?: boolean;
}

export interface FhirBundleView {
  resourceType: "Bundle";
  annotatedJson: string;
  raw: unknown;
}

function annotateJson(obj: unknown, rules: FhirCaptionRule[]): string {
  const used = new Set<number>();
  return JSON.stringify(obj, null, 2)
    .split("\n")
    .map(line => {
      const idx = rules.findIndex((r, i) => line.includes(r.match) && !(r.onlyFirst && used.has(i)));
      if (idx === -1) return line;
      used.add(idx);
      return `${line} // ${rules[idx].caption}`;
    })
    .join("\n");
}

function wrapBundle(resources: unknown[]): { resourceType: "Bundle"; type: "collection"; total: number; entry: { resource: unknown }[] } {
  return {
    resourceType: "Bundle",
    type: "collection",
    total: resources.length,
    entry: resources.map(r => ({ resource: r })),
  };
}

function buildView(resources: unknown[], rules: FhirCaptionRule[]): FhirBundleView {
  const raw = wrapBundle(resources);
  return { resourceType: "Bundle", raw, annotatedJson: annotateJson(raw, rules) };
}

export function mapPatientToFHIR(patient: Demographics, caseId: string): FhirBundleView {
  const resource = {
    resourceType: "Patient",
    id: `patient-${caseId}`,
    identifier: [{ system: "urn:posologia:prontuario-ficticio", value: `MRN-${caseId}` }],
    name: [{ text: patient.name }],
    gender: patient.gender,
    birthDate: patient.birthDateDescription,
  };
  const rules: FhirCaptionRule[] = [
    { match: '"resourceType": "Patient"', caption: "Recurso raiz que identifica o paciente na API FHIR" },
    { match: '"identifier"', caption: "Identificador único do paciente (equivalente a um nº de prontuário/MRN)" },
    { match: '"gender"', caption: "Vocabulário fixo do FHIR: male | female | other | unknown" },
  ];
  return buildView([resource], rules);
}

export function mapProblemsToFHIR(problems: Problem[], patientRef: string): FhirBundleView {
  const resources = problems.map(p => ({
    resourceType: "Condition",
    id: p.id,
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: p.status }],
    },
    code: {
      coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: p.icd10Code, display: p.display }],
    },
    subject: { reference: `Patient/${patientRef}` },
    onsetString: p.onsetDescription,
  }));
  const rules: FhirCaptionRule[] = [
    { match: '"resourceType": "Condition"', caption: "Um problema/diagnóstico do paciente = um recurso Condition" },
    { match: '"clinicalStatus"', caption: "Status clínico padronizado (ativo/resolvido/inativo)", onlyFirst: true },
    { match: '"http://hl7.org/fhir/sid/icd-10"', caption: "CID-10 — vocabulário universal de diagnósticos", onlyFirst: true },
    { match: '"subject"', caption: "Referência ao Patient dono desta condição — é assim que os recursos se conectam" },
  ];
  return buildView(resources, rules);
}

export function mapMedicationsToFHIR(meds: MedicationInUse[], patientRef: string): FhirBundleView {
  const resources = meds.map(m => ({
    resourceType: "MedicationRequest",
    id: m.id,
    status: m.status === "active" ? "active" : m.status === "stopped" ? "stopped" : "on-hold",
    intent: "order",
    medicationCodeableConcept: {
      coding: [{ system: "http://www.whocc.no/atc", code: m.atcCode, display: m.drug }],
    },
    subject: { reference: `Patient/${patientRef}` },
    dosageInstruction: [{ text: `${m.dose} — ${m.route} — ${m.frequency}` }],
  }));
  const rules: FhirCaptionRule[] = [
    { match: '"resourceType": "MedicationRequest"', caption: "Cada prescrição é um recurso próprio, não uma linha num texto" },
    { match: '"status"', caption: "Medicação suspensa vira status=\"stopped\", nunca é apagada do histórico", onlyFirst: true },
    { match: '"http://www.whocc.no/atc"', caption: "ATC — vocabulário universal de classificação de fármacos", onlyFirst: true },
    { match: '"dosageInstruction"', caption: "Posologia estruturada (dose, via, frequência)" },
  ];
  return buildView(resources, rules);
}

export function mapObservationsToFHIR(observations: LabObservation[], patientRef: string): FhirBundleView {
  const resources = observations.map(o => ({
    resourceType: "Observation",
    id: o.id,
    status: "final",
    code: { coding: [{ system: "http://loinc.org", code: o.loincCode, display: o.name }] },
    subject: { reference: `Patient/${patientRef}` },
    valueQuantity: { value: o.value, unit: o.unit, system: "http://unitsofmeasure.org" },
    interpretation: [{ text: o.interpretation }],
    referenceRange: [{ text: o.referenceRange }],
  }));
  const rules: FhirCaptionRule[] = [
    { match: '"resourceType": "Observation"', caption: "Resultado de exame = um recurso Observation por medida" },
    { match: '"http://loinc.org"', caption: "LOINC — vocabulário universal de exames laboratoriais", onlyFirst: true },
    { match: '"valueQuantity"', caption: "Valor numérico com unidade codificada (UCUM)" },
    { match: '"referenceRange"', caption: "Faixa de referência que acompanha o resultado" },
  ];
  return buildView(resources, rules);
}

export function mapOrdersToFHIR(
  orders: ExamOrderOption[],
  patientRef: string,
  status: "active" | "completed"
): FhirBundleView {
  const resources = orders.map(o => ({
    resourceType: "ServiceRequest",
    id: o.id,
    status,
    intent: "order",
    code: { coding: [{ system: "http://loinc.org", code: o.loincCode, display: o.name }] },
    subject: { reference: `Patient/${patientRef}` },
  }));
  const rules: FhirCaptionRule[] = [
    { match: '"resourceType": "ServiceRequest"', caption: "Pedido de exame = um recurso ServiceRequest, separado do resultado (Observation)" },
    { match: '"status"', caption: "\"active\" = ainda aguardando resultado, \"completed\" = já resultado", onlyFirst: true },
  ];
  return buildView(resources, rules);
}
