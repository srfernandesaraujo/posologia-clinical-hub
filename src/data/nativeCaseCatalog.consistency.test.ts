import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import catalog from "./nativeCaseCatalog";

// Guards against the exact bug that shipped silently for months: a simulator's
// BUILT_IN_CASES (the real case content, resolved by array index at runtime via
// useVirtualRoomCase) drifting out of sync with nativeCaseCatalog.ts (the list
// that populates the "Caso Clínico" picker in Salas Virtuais). When they drift,
// a professor can pick a case by a title that no longer matches what actually
// gets assigned at that index — or a whole simulator's cases can go missing
// from the picker entirely. See the doc-sync agent notes for more context.
//
// This reads the real .tsx source with the TypeScript compiler API (not a
// runtime import — importing ~100 full page components here would be slow and
// drag in every simulator's heavy deps) and only inspects the exact call site
// that determines real runtime behavior: useVirtualRoomCase(slug, casesArray).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIM_DIR = path.resolve(__dirname, "../pages/simuladores");

// Simulators intentionally excluded from Salas Virtuais (see
// ROOM_EXCLUDED_SIMULATOR_SLUGS in simulatorCatalog.ts) — their native cases
// are unreachable through the room picker, so catalog drift there is moot.
const EXCLUDED_SLUGS = new Set(["paciente-ia-voz"]);

interface ExtractedCases {
  file: string;
  slug: string;
  titles: string[];
}

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function extractFromSimulatorFile(file: string): ExtractedCases | null {
  const text = fs.readFileSync(file, "utf-8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  // Map every top-level-or-nested `const X = ...` so identifiers passed into
  // useVirtualRoomCase (SLUG, BUILT_IN_CASES, or whatever a file happens to
  // name them) can be resolved back to their literal value.
  const varInit = new Map<string, ts.Expression>();
  function collectVars(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (!varInit.has(node.name.text)) varInit.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collectVars);
  }
  collectVars(sf);

  let callNode: ts.CallExpression | null = null;
  function findCall(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useVirtualRoomCase") {
      callNode = node;
    }
    ts.forEachChild(node, findCall);
  }
  findCall(sf);
  if (!callNode) return null; // simulator doesn't use the native-case-by-index mechanism at all

  const [arg0, arg1] = (callNode as ts.CallExpression).arguments;

  function resolveSlug(node?: ts.Expression): string | null {
    if (!node) return null;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) {
      const init = varInit.get(node.text);
      if (init && ts.isStringLiteralLike(init)) return init.text;
    }
    return null;
  }
  function resolveArray(node?: ts.Expression): ts.ArrayLiteralExpression | null {
    if (!node) return null;
    if (ts.isArrayLiteralExpression(node)) return node;
    if (ts.isIdentifier(node)) {
      const init = varInit.get(node.text);
      if (init && ts.isArrayLiteralExpression(init)) return init;
    }
    return null;
  }

  const slug = resolveSlug(arg0);
  const arr = resolveArray(arg1);
  // No resolvable slug/array (e.g. a hardcoded case list passed inline in a
  // shape we don't recognize, or no second argument at all — some simulators
  // only support DB-backed AI cases, not native ones) — nothing to check here.
  if (!slug || !arr) return null;

  const titles: (string | null)[] = [];
  for (const el of arr.elements) {
    if (!ts.isObjectLiteralExpression(el)) return null; // unexpected shape, don't guess
    const titleProp = el.properties.find(
      (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "title",
    );
    if (!titleProp || !ts.isStringLiteralLike(titleProp.initializer)) return null;
    titles.push(titleProp.initializer.text);
  }

  return { file, slug, titles: titles as string[] };
}

const simulatorFiles = walkTsxFiles(SIM_DIR);
const extracted = simulatorFiles
  .map(extractFromSimulatorFile)
  .filter((r): r is ExtractedCases => r !== null)
  .filter((r) => !EXCLUDED_SLUGS.has(r.slug));

describe("nativeCaseCatalog.ts stays in sync with each simulator's real cases", () => {
  it("found a healthy number of simulators to check (extraction didn't silently break)", () => {
    // Regression guard for the guard itself: if a future refactor changes how
    // simulators declare useVirtualRoomCase/cases and this drops to near-zero,
    // the checks below would trivially pass having verified nothing.
    expect(extracted.length).toBeGreaterThan(60);
  });

  it.each(extracted.map((r) => [r.slug, r] as const))("%s", (_slug, r) => {
    const catEntries = (catalog as Record<string, { index: number; title: string; difficulty: string }[]>)[r.slug];

    expect(
      catEntries,
      `nativeCaseCatalog.ts has no entry for "${r.slug}" (${path.relative(SIM_DIR, r.file)}), but it has ${r.titles.length} real case(s). Add it — see doc-sync.md.`,
    ).toBeDefined();

    expect(
      catEntries.map((e) => e.title),
      `Case titles/order for "${r.slug}" don't match the real BUILT_IN_CASES in ${path.relative(SIM_DIR, r.file)}. Because native cases resolve by array index at runtime, a mismatch here means picking a case by its shown title assigns a DIFFERENT case's content.`,
    ).toEqual(r.titles);

    catEntries.forEach((e, i) => {
      expect(e.index, `"${r.slug}" catalog entry ${i} has index=${e.index}, expected ${i} (index must match array position).`).toBe(i);
    });
  });
});
