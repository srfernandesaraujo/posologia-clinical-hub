import { describe, expect, it } from "vitest";
import { CALCULATOR_SIMULATOR_LINKS } from "./calculatorSimulatorLinks";
import { NATIVE_CALCULATORS } from "./calculatorCatalog";
import { NATIVE_SIMULATORS } from "./simulatorCatalog";

describe("CALCULATOR_SIMULATOR_LINKS", () => {
  it("só aponta para calculadoras e simuladores que existem", () => {
    const calcs = new Set(NATIVE_CALCULATORS.map((c) => c.path.replace("/calculadoras/", "")));
    const sims = new Set(NATIVE_SIMULATORS.map((s) => s.slug));
    for (const [calc, list] of Object.entries(CALCULATOR_SIMULATOR_LINKS)) {
      expect(calcs.has(calc), `calculadora ${calc}`).toBe(true);
      for (const s of list) expect(sims.has(s), `simulador ${s} (de ${calc})`).toBe(true);
    }
  });
});
