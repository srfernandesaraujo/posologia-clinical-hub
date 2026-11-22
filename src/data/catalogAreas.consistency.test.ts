import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SIMULATORS_WITH_CHALLENGES, SIMULATOR_AREAS } from "./catalogAreas";
import { NATIVE_SIMULATORS } from "./simulatorCatalog";

const root = path.resolve(__dirname, "../..");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

describe("catalogAreas", () => {
  it("toda categoria de simulador nativo pertence a uma área", () => {
    const mapped = new Set(SIMULATOR_AREAS.flatMap((a) => a.categories));
    const orphans = [...new Set(NATIVE_SIMULATORS.map((s) => s.category))].filter((c) => !mapped.has(c));
    expect(orphans).toEqual([]);
  });

  it("SIMULATORS_WITH_CHALLENGES bate com as páginas que usam SimulatorChallengeMode", () => {
    const app = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
    const files = walk(path.join(root, "src/pages/simuladores")).filter(
      (f) => f.endsWith(".tsx") && fs.readFileSync(f, "utf8").includes("SimulatorChallengeMode"),
    );
    const slugs = new Set<string>();
    for (const file of files) {
      const base = path.basename(file, ".tsx");
      // O componente pode ter sido importado com outro nome (ex.: SimuladorAcidoBaseLab)
      const importMatch = app.match(new RegExp(`import (\\w+) from "\\./pages/simuladores/[^"]*/${base}"`))
        || app.match(new RegExp(`import (\\w+) from "\\./pages/simuladores/${base}"`));
      const comp = importMatch?.[1] || base;
      const route = app.match(new RegExp(`path="/simuladores/([^"]+)" element=\\{<${comp} />`));
      if (route) slugs.add(route[1]);
    }
    expect([...SIMULATORS_WITH_CHALLENGES].sort()).toEqual([...slugs].sort());
  });
});
