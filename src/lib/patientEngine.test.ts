import { describe, it, expect } from "vitest";
import {
  computeRenal,
  deriveRenalBaselineFromSNA,
  deriveElectroBaselineFromRenal,
  deriveAcidBaseBaselineFromGlycemic,
  deriveAcidBaseRenalCapacity,
  deriveGlycemicBaselineFromSNA,
} from "./patientEngine";

describe("computeRenal", () => {
  it("retorna glicosúria zero sem glicemia conhecida, mesmo com permeabilidade baixa (regressão do bug antigo)", () => {
    const result = computeRenal(70, 60, 80, 40);
    expect(result.glucose).toBe(0);
  });

  it("retorna glicosúria positiva quando a glicemia herdada excede o limiar renal", () => {
    const result = computeRenal(70, 60, 80, 100, 250);
    expect(result.glucose).toBeGreaterThan(0);
  });

  it("não gera glicosúria quando a glicemia herdada está abaixo do limiar renal", () => {
    const result = computeRenal(70, 60, 80, 100, 120);
    expect(result.glucose).toBe(0);
  });
});

describe("deriveRenalBaselineFromSNA", () => {
  it("reduz a pressão aferente/eferente quando o tônus simpático está elevado", () => {
    const base = { afferent: 70, efferent: 60 };
    const result = deriveRenalBaselineFromSNA({ sympatheticTone: 90 }, base);
    expect(result.afferent).toBeLessThan(base.afferent);
    expect(result.efferent).toBeLessThan(base.efferent);
  });

  it("mantém o baseline do caso quando nenhum SNA foi tocado ainda", () => {
    const base = { afferent: 70, efferent: 60 };
    expect(deriveRenalBaselineFromSNA({}, base)).toEqual(base);
  });
});

describe("deriveGlycemicBaselineFromSNA", () => {
  it("reduz a função pancreática efetiva com tônus simpático alto", () => {
    const result = deriveGlycemicBaselineFromSNA({ sympatheticTone: 95 }, { pancreaticFunction: 95 });
    expect(result.pancreaticFunction).toBeLessThan(95);
  });
});

describe("deriveAcidBaseRenalCapacity", () => {
  it("retorna 1 (capacidade total) quando nenhum dado renal existe", () => {
    expect(deriveAcidBaseRenalCapacity({})).toBe(1);
  });

  it("reduz a capacidade de compensação proporcionalmente à TFG", () => {
    expect(deriveAcidBaseRenalCapacity({ tfg: 40 })).toBeCloseTo(0.4);
  });
});

describe("deriveElectroBaselineFromRenal", () => {
  it("reproduz aproximadamente o preset de hipercalemia (K conductance ~150%) com K+ sérico ~7.2", () => {
    const result = deriveElectroBaselineFromRenal({ serumPotassium: 7.2 }, { k: 100 });
    expect(result.k).toBeGreaterThanOrEqual(140);
    expect(result.k).toBeLessThanOrEqual(160);
  });

  it("mantém o baseline do caso sem K+ sérico conhecido", () => {
    expect(deriveElectroBaselineFromRenal({}, { k: 100 })).toEqual({ k: 100 });
  });
});

describe("deriveAcidBaseBaselineFromGlycemic", () => {
  const base = { pco2: 40, hco3: 24 };

  it("só dispara o proxy de cetoacidose com glicemia > 300 e função pancreática < 20", () => {
    const result = deriveAcidBaseBaselineFromGlycemic({ glycemia: 350, pancreaticFunction: 5 }, base);
    expect(result.hco3).toBeLessThan(base.hco3);
    expect(result.pco2).toBeLessThan(base.pco2);
  });

  it("não dispara com glicemia alta mas função pancreática preservada", () => {
    const result = deriveAcidBaseBaselineFromGlycemic({ glycemia: 350, pancreaticFunction: 80 }, base);
    expect(result).toEqual(base);
  });

  it("não dispara com função pancreática baixa mas glicemia normal", () => {
    const result = deriveAcidBaseBaselineFromGlycemic({ glycemia: 150, pancreaticFunction: 5 }, base);
    expect(result).toEqual(base);
  });
});
