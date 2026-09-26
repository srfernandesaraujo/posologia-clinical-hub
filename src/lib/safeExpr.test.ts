import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { evalExpr, checkExpr } from "./safeExpr";

describe("evalExpr", () => {
  const s = { a: 10, b: 4, cmm: 22754, dias: 30 };
  it("aritmética e precedência", () => {
    expect(evalExpr("1 + 2 * 3", s)).toBe(7);
    expect(evalExpr("(1 + 2) * 3", s)).toBe(9);
    expect(evalExpr("a / b", s)).toBe(2.5);
    expect(evalExpr("a % 3", s)).toBe(1);
    expect(evalExpr("2 ^ 3 ^ 2", s)).toBe(512);
    expect(evalExpr("-2 ^ 2", s)).toBe(-4);
    expect(evalExpr("2 ^ -1", s)).toBe(0.5);
    expect(evalExpr("cmm * (3 + 2) + 0.5 * cmm", s)).toBeCloseTo(22754 * 5.5, 6);
  });
  it("comparações, lógica e ternário", () => {
    expect(evalExpr("a > b", s)).toBe(1);
    expect(evalExpr("a <= b", s)).toBe(0);
    expect(evalExpr("a == 10 && b != 5", s)).toBe(1);
    expect(evalExpr("a < 1 || b > 3", s)).toBe(1);
    expect(evalExpr("!(a > b)", s)).toBe(0);
    expect(evalExpr("a > b ? a : b", s)).toBe(10);
    expect(evalExpr("a < b ? 1 : a < 20 ? 2 : 3", s)).toBe(2);
  });
  it("funções", () => {
    expect(evalExpr("max(a, b, 3)", s)).toBe(10);
    expect(evalExpr("min(a, b)", s)).toBe(4);
    expect(evalExpr("round(3.14159, 2)", s)).toBe(3.14);
    expect(evalExpr("ceil(2.1) + floor(2.9)", s)).toBe(5);
    expect(evalExpr("clamp(15, 0, 10)", s)).toBe(10);
    expect(evalExpr("sqrt(pow(3, 2) + pow(4, 2))", s)).toBe(5);
    expect(evalExpr("abs(-3) + log10(1000)", s)).toBe(6);
    expect(evalExpr("round(pi, 3)", s)).toBe(3.142);
  });
  it("rejeita o que não é aritmética segura", () => {
    for (const ruim of ["constructor", "constructor(1)", "__proto__", "a.b", "a; b", "alert(1)", "a = 1", "`x`", "'x'", "a $ b", "1 +", "(1 + 2", "foo", "toString()", "a[0]", "1..2"]) {
      expect(() => evalExpr(ruim, s), ruim).toThrow();
    }
    expect(() => evalExpr("", s)).toThrow();
    expect(() => evalExpr("1".repeat(500), s)).toThrow();
    expect(() => evalExpr("(".repeat(100) + "1" + ")".repeat(100), s)).toThrow();
  });
  it("checkExpr aponta resultado não finito", () => {
    expect(checkExpr("a / b", s)).toBeNull();
    expect(checkExpr("a / 0", s)).toMatch(/não finito/);
    expect(checkExpr("zzz + 1", s)).toMatch(/desconhecida/);
  });
});

describe("cópia usada pela edge function", () => {
  it("supabase/functions/_shared/safe-expr.ts é idêntico a src/lib/safeExpr.ts", () => {
    const a = fs.readFileSync(path.resolve(__dirname, "safeExpr.ts"), "utf8").replace(/\r\n/g, "\n");
    const b = fs.readFileSync(path.resolve(__dirname, "../../supabase/functions/_shared/safe-expr.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(b).toBe(a);
  });
});
