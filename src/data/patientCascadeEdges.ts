import type { PatientVitalKey } from "@/lib/patientEngine";

/**
 * Metadados de exibição do Paciente Digital Contínuo: nomes amigáveis de
 * cada simulador-alvo e, por simulador, quais vitais ele recebe (herda) de
 * outros módulos. Usado pelo DigitalPatientPanel e pelo painel consolidado.
 */

export interface PhysiologySlug {
  slug: string;
  name: string;
}

export const PHYSIOLOGY_MODULES: Record<string, PhysiologySlug> = {
  sna: { slug: "sna", name: "Sistema Nervoso Autônomo" },
  "depuracao-renal": { slug: "depuracao-renal", name: "Depuração Renal" },
  "equilibrio-acido-base": { slug: "equilibrio-acido-base", name: "Equilíbrio Ácido-Base" },
  "regulacao-glicemica": { slug: "regulacao-glicemica", name: "Regulação Glicêmica" },
  "eletrofisiologia-cardiaca": { slug: "eletrofisiologia-cardiaca", name: "Eletrofisiologia Cardíaca" },
};

export interface UpstreamEdge {
  vitalKey: PatientVitalKey;
  label: string;
}

/** Por simulador, quais vitais canônicos ele lê (herda) de outros módulos. */
export const UPSTREAM_EDGES: Record<string, UpstreamEdge[]> = {
  sna: [],
  "depuracao-renal": [{ vitalKey: "sympatheticTone", label: "Tônus simpático (SNA)" }],
  "equilibrio-acido-base": [
    { vitalKey: "tfg", label: "TFG (Depuração Renal)" },
    { vitalKey: "glycemia", label: "Glicemia (Regulação Glicêmica)" },
  ],
  "regulacao-glicemica": [{ vitalKey: "sympatheticTone", label: "Tônus simpático (SNA)" }],
  "eletrofisiologia-cardiaca": [{ vitalKey: "serumPotassium", label: "K⁺ sérico (Depuração Renal)" }],
};

export function friendlyModuleName(slug: string): string {
  return PHYSIOLOGY_MODULES[slug]?.name ?? slug;
}
