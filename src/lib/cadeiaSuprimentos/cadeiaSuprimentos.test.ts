import { describe, it, expect } from "vitest";
import { BUILT_IN_CASES } from "./casos";
import catalog from "@/data/nativeCaseCatalog";
import { getCadeiaSuprimentosChallenges } from "@/data/simulatorChallenges";
import { computeSelecao, selecaoAtendeCriterios } from "./selecao";
import { calcCMM, simularProgramacao, type ProgParams } from "./programacao";
import { custoParcelamento, melhorParcelamento, motivosDesclassificacao, precoReferencia, vencedor, OPCOES_ENTREGAS } from "./aquisicao";
import { avaliarConduta, exposicao } from "./armazenamento";
import { computeDistribuicao, sugerirRateio, type CriterioRateio } from "./distribuicao";
import { avaliarItem, loteEsperado, quantidadeNecessaria, type DecisaoItem } from "./dispensacao";
import { avaliarEtapa, desafiosAutomaticos } from "./avaliacao";
import type { Challenge } from "@/components/simulators/SimulatorChallengeMode";
import { validateCadeiaCase, simularProgramacao as simEdge, selecaoProblemas, distribuicaoDeficitProblemas, programacaoResolvivel } from "../../../supabase/functions/_shared/cadeia-suprimentos-quality";
import { distribuicaoAtendeCriterios } from "./distribuicao";

const [c1, c2, c3, c4, c5, c6] = BUILT_IN_CASES;
const BASE = ["hctz", "enalapril", "losartana", "anlodipino", "atenolol", "metformina", "glibenclamida", "insulina-nph", "sinvastatina"];

// ── Construtores de estado: espelham o que cada bancada envia ao Modo Desafio ──────────────────────────────────────
const estSelecao = (incluidos: string[]) => ({ etapa: "selecao", incluidos, resultado: computeSelecao(c1.selecao!, incluidos) });
const estProg = (cfg: Record<string, ProgParams>) => ({
  etapa: "programacao",
  itens: Object.fromEntries(c2.programacao!.itens.map((i) => [i.id, { ...cfg[i.id], resultado: simularProgramacao(i, cfg[i.id]) }])),
});
const PADRAO: ProgParams = { metodo: "media12", mesesSeguranca: 0, intervalo: 3 };
const estAq = (o: { incl?: string[]; est?: "media" | "mediana" | "menor"; classif?: string[]; entregas?: number }) => {
  const a = c3.aquisicao!;
  const incl = o.incl ?? a.cotacoes.map((c) => c.id);
  const est = o.est ?? "media";
  const classif = o.classif ?? a.propostas.map((p) => p.id);
  const entregas = o.entregas ?? 1;
  return { etapa: "aquisicao", cotacoesIncluidas: incl, estatistica: est, precoRef: precoReferencia(a.cotacoes, incl, est).valor, classificadas: classif, vencedorId: vencedor(a.propostas, classif)?.id ?? null, entregas, parcelamento: custoParcelamento(a.parcelamento, entregas) };
};
const estArm = (h: number, condutas: Record<string, string | undefined>) => {
  const ex = c4.armazenamento!;
  const e = exposicao(ex, h);
  return { etapa: "armazenamento", transferenciaH: h, exposicao: e, condutas, avaliacoes: Object.fromEntries(ex.itens.map((i) => [i.id, avaliarConduta(i, e, ex, condutas[i.id] as any)])) };
};
const estDist = (criterio: CriterioRateio | "", o: { reserva?: number; fixos?: Record<string, number> } = {}) => {
  const d = c5.distribuicao!;
  const aloc = criterio ? sugerirRateio(d, criterio, { reserva: o.reserva ?? 0, fixos: o.fixos }) : Object.fromEntries(d.ubs.map((u) => [u.id, 0]));
  return { etapa: "distribuicao", criterio, reserva: o.reserva ?? 0, aloc, fixos: Object.keys(o.fixos ?? {}), resultado: computeDistribuicao(d, aloc) };
};
const estDisp = (decisoes: Record<string, DecisaoItem>) => {
  const d = c6.dispensacao!;
  const avaliacoes = Object.fromEntries(d.itens.map((i) => [i.id, avaliarItem(d, i, decisoes[i.id] ?? {})]));
  return { etapa: "dispensacao", decisoes, avaliacoes, todosCorretos: d.itens.every((i) => avaliacoes[i.id].correto) };
};
const OK_DISP: Record<string, DecisaoItem> = { amoxicilina: { acao: "nova-receita" }, enalapril: { acao: "dispensar", loteId: "en-1", quantidade: 60 }, paracetamol: { acao: "contatar-prescritor" } };

const validar = (caso: number, n: number, s: Record<string, any>) => (getCadeiaSuprimentosChallenges(caso).challenges[n] as Extract<Challenge, { type: "adjust" }>).validator(s).correct;

describe("catálogo e estrutura", () => {
  it("nativeCaseCatalog tem os mesmos títulos, na mesma ordem, de BUILT_IN_CASES", () => {
    const cat = catalog["cadeia-suprimentos"];
    expect(cat.map((c) => c.title)).toEqual(BUILT_IN_CASES.map((c) => c.title));
    expect(cat.map((c) => c.difficulty)).toEqual(BUILT_IN_CASES.map((c) => c.difficulty));
    cat.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("cada caso nativo tem os dados da própria etapa e existe um conjunto de desafios por caso", () => {
    BUILT_IN_CASES.forEach((c, i) => {
      expect((c as any)[c.etapa], c.title).toBeDefined();
      expect(getCadeiaSuprimentosChallenges(i).challenges.length).toBe(6);
    });
    expect(BUILT_IN_CASES.map((c) => c.etapa)).toEqual(["selecao", "programacao", "aquisicao", "armazenamento", "distribuicao", "dispensacao"]);
  });

  it("todo desafio de ajuste tem as alternativas e o índice da correta", () => {
    for (let i = 0; i < 6; i++) {
      for (const ch of getCadeiaSuprimentosChallenges(i).challenges) {
        expect(ch.options?.length, ch.question.slice(0, 40)).toBe(4);
        expect(ch.correctIndex).toBeGreaterThanOrEqual(0);
        expect(ch.correctIndex).toBeLessThan(4);
      }
    }
  });
});

describe("Seleção", () => {
  const custo = (ids: string[]) => Math.round(computeSelecao(c1.selecao!, ids).custoAnualTotal);
  it("reproduz os números citados nos desafios", () => {
    expect(custo(BASE)).toBe(224760);
    expect(custo([...BASE, "espironolactona"])).toBe(231240);
    expect(custo([...BASE, "olmesartana"])).toBe(355800);
    expect(custo([...BASE, "rosuvastatina"])).toBe(263640);
    expect(custo([...BASE, "sitagliptina"])).toBe(360408);
    expect(custo([...BASE.filter((x) => x !== "atenolol"), "espironolactona"])).toBe(227640);
    const r = computeSelecao(c1.selecao!, [...BASE, "olmesartana", "rosuvastatina", "sitagliptina"]);
    expect(Math.round(r.linhas.find((l) => l.id === "olmesartana")!.impactoLiquidoAnual!)).toBe(131040);
    expect(Math.round(r.linhas.find((l) => l.id === "rosuvastatina")!.impactoLiquidoAnual!)).toBe(38880);
    expect(Math.round(r.linhas.find((l) => l.id === "sitagliptina")!.impactoLiquidoAnual!)).toBe(135648);
    expect(100 * 12 * (36 - 4.8)).toBeCloseTo(37440, 6);
  });
  it("só o elenco com a espironolactona atende a todos os critérios", () => {
    expect(selecaoAtendeCriterios(c1.selecao!, [...BASE, "espironolactona"]).ok).toBe(true);
    expect(selecaoAtendeCriterios(c1.selecao!, BASE).ok).toBe(false);
    for (const x of ["olmesartana", "rosuvastatina", "sitagliptina"]) expect(selecaoAtendeCriterios(c1.selecao!, [...BASE, "espironolactona", x]).ok).toBe(false);
  });
  it("validadores dos desafios (positivo e negativo)", () => {
    const ESP = [...BASE, "espironolactona"];
    expect(validar(0, 0, estSelecao(ESP))).toBe(true);
    expect(validar(0, 0, estSelecao(BASE))).toBe(false);
    expect(validar(0, 0, estSelecao([...ESP, "olmesartana"]))).toBe(false);
    expect(validar(0, 1, estSelecao([...BASE, "olmesartana"]))).toBe(true);
    expect(validar(0, 1, estSelecao(BASE))).toBe(false);
    expect(validar(0, 2, estSelecao([...BASE, "sitagliptina"]))).toBe(true);
    expect(validar(0, 2, estSelecao([...BASE, "olmesartana"]))).toBe(false);
    expect(validar(0, 4, estSelecao(BASE.filter((x) => x !== "atenolol").concat("espironolactona")))).toBe(true);
    expect(validar(0, 4, estSelecao(ESP))).toBe(false);
    expect(validar(0, 5, estSelecao(ESP))).toBe(true);
    expect(validar(0, 5, estSelecao(BASE.filter((x) => x !== "atenolol").concat("espironolactona")))).toBe(false);
    expect(validar(0, 5, estProg({ losartana: PADRAO, amoxicilina: PADRAO, insulina: PADRAO }))).toBe(false); // etapa errada
  });
});

describe("Programação", () => {
  const [los, amo, ins] = c2.programacao!.itens;
  const r = (item: typeof los, metodo: ProgParams["metodo"], seg: number, iv: number) => simularProgramacao(item, { metodo, mesesSeguranca: seg, intervalo: iv });
  it("CMM dos três métodos", () => {
    expect(Math.round(calcCMM(los, "media12"))).toBe(60033);
    expect(Math.round(calcCMM(amo, "media12"))).toBe(16542);
    expect(Math.round(calcCMM(amo, "media6"))).toBe(16500);
    expect(Math.round(calcCMM(amo, "corrigida12"))).toBe(22754);
  });
  it("losartana: segurança zero falta 13 dias; 0,5 mês zera", () => {
    expect(r(los, "media12", 0, 3).rupturaDias).toBe(13);
    expect(r(los, "media12", 0, 3).mesesComRuptura).toBe(3);
    expect(Math.round(r(los, "media12", 0, 3).estoqueMedioUnid)).toBe(89535);
    expect(r(los, "media12", 0.5, 3).rupturaDias).toBe(0);
    expect(Math.round(r(los, "media12", 0.5, 3).estoqueMedioUnid)).toBe(109888);
    expect(r(los, "media6", 0, 3).rupturaDias).toBe(9);
    expect(Math.ceil(calcCMM(los, "media12") * 4.5 - los.estoqueInicial)).toBe(204150);
  });
  it("amoxicilina: média bruta falha mesmo com 2 meses; corrigida com 1 mês zera com o menor estoque", () => {
    expect(r(amo, "media12", 1, 3).rupturaDias).toBe(34);
    expect(r(amo, "media6", 1, 3).rupturaDias).toBe(34);
    expect(r(amo, "media12", 2, 3).rupturaDias).toBe(17);
    expect(r(amo, "corrigida12", 0.5, 3).rupturaDias).toBe(7);
    const boa = r(amo, "corrigida12", 1, 3);
    expect(boa.rupturaDias).toBe(0);
    expect(boa.nPedidos).toBe(4);
    expect(Math.round(boa.estoqueMedioUnid)).toBe(56248);
    // nenhuma outra combinação (segurança ≤ 2, ≥ 3 meses entre pedidos) zera a ruptura com estoque menor
    const menores = ["media12", "media6", "corrigida12"].flatMap((m) => [0, 0.5, 1, 1.5, 2].flatMap((s) => [3, 4, 6, 12].map((iv) => r(amo, m as any, s, iv))))
      .filter((x) => x.rupturaDias === 0 && x.perdasUnid === 0 && !x.excedeCapacidade && x.estoqueMedioUnid < boa.estoqueMedioUnid - 1);
    expect(menores).toHaveLength(0);
  });
  it("insulina: compra anual vence, falta e estoura a câmara; a cada 3 meses resolve", () => {
    const anual = r(ins, "media12", 1, 12);
    expect(Math.round(anual.perdasUnid)).toBe(8988);
    expect(Math.round(anual.perdasValor)).toBe(197736);
    expect(anual.rupturaDias).toBe(60);
    expect(anual.excedeCapacidade).toBe(true);
    const semestral = r(ins, "media12", 1, 6);
    expect(semestral.perdasUnid).toBe(0);
    expect(semestral.excedeCapacidade).toBe(true);
    const tri = r(ins, "media12", 1, 3);
    expect(tri.rupturaDias).toBe(0);
    expect(tri.perdasUnid).toBe(0);
    expect(tri.excedeCapacidade).toBe(false);
  });
  it("mesma política nos três itens: só a amoxicilina falha", () => {
    const p: ProgParams = { metodo: "media12", mesesSeguranca: 1, intervalo: 3 };
    expect(r(los, "media12", 1, 3).rupturaDias).toBe(0);
    expect(r(ins, "media12", 1, 3).rupturaDias).toBe(0);
    expect(simularProgramacao(amo, p).rupturaDias).toBe(34);
  });
  it("validadores dos desafios", () => {
    const ok = (o: Partial<Record<string, ProgParams>>) => estProg({ losartana: PADRAO, amoxicilina: PADRAO, insulina: PADRAO, ...(o as any) });
    expect(validar(1, 0, ok({ losartana: { metodo: "media12", mesesSeguranca: 0.5, intervalo: 3 } }))).toBe(true);
    expect(validar(1, 0, ok({ losartana: { metodo: "media12", mesesSeguranca: 0, intervalo: 3 } }))).toBe(false);
    expect(validar(1, 1, ok({ amoxicilina: { metodo: "corrigida12", mesesSeguranca: 1, intervalo: 3 } }))).toBe(true);
    expect(validar(1, 1, ok({ amoxicilina: { metodo: "media12", mesesSeguranca: 1, intervalo: 3 } }))).toBe(false);
    expect(validar(1, 2, ok({ amoxicilina: { metodo: "corrigida12", mesesSeguranca: 1, intervalo: 3 } }))).toBe(true);
    expect(validar(1, 2, ok({ amoxicilina: { metodo: "corrigida12", mesesSeguranca: 0, intervalo: 6 } }))).toBe(false); // sem ruptura, mas com mais estoque
    expect(validar(1, 2, ok({ amoxicilina: { metodo: "corrigida12", mesesSeguranca: 0.5, intervalo: 3 } }))).toBe(false); // ruptura
    expect(validar(1, 3, ok({ insulina: { metodo: "media12", mesesSeguranca: 1, intervalo: 3 } }))).toBe(true);
    expect(validar(1, 3, ok({ insulina: { metodo: "media12", mesesSeguranca: 1, intervalo: 12 } }))).toBe(false);
    const tres: ProgParams = { metodo: "media12", mesesSeguranca: 1, intervalo: 3 };
    expect(validar(1, 5, ok({ losartana: tres, amoxicilina: tres, insulina: tres }))).toBe(true);
    expect(validar(1, 5, ok({ losartana: tres, amoxicilina: { ...tres, metodo: "corrigida12" }, insulina: tres }))).toBe(false);
  });
});

describe("Aquisição", () => {
  const a = c3.aquisicao!;
  it("preço de referência por conjunto e estatística", () => {
    const ids = a.cotacoes.map((c) => c.id);
    const v = (inc: string[], t: "media" | "mediana" | "menor") => +precoReferencia(a.cotacoes, inc, t).valor.toFixed(2);
    expect(v(ids, "media")).toBe(24.35);
    expect(v(ids, "mediana")).toBe(22.5);
    expect(v(ids, "menor")).toBe(12.6);
    expect(v(["c1", "c2", "c3", "c4", "c5"], "mediana")).toBe(21.1);
    expect(v(["c1", "c2", "c3", "c4", "c5"], "media")).toBe(21.94);
    expect(v(["c1", "c2", "c3", "c4", "c5", "c7", "c6"], "mediana")).toBe(23.9);
  });
  it("só Gama e Delta cumprem o edital; a Gama vence", () => {
    const aptas = a.propostas.filter((p) => motivosDesclassificacao(p, a.edital).length === 0).map((p) => p.id);
    expect(aptas).toEqual(["p4", "p5"]);
    expect(vencedor(a.propostas, aptas)?.fornecedor).toBe("Gama Medicamentos");
    expect(vencedor(a.propostas, a.propostas.map((p) => p.id))?.fornecedor).toBe("Distribuidora Alfa Saúde");
    expect(Math.round((21.1 - 20.2) * 33600)).toBe(30240);
    expect(Math.round((20.9 - 20.2) * 33600)).toBe(23520);
  });
  it("parcelamento: 3 entregas é o mínimo teórico, mas só 4 cabe na câmara", () => {
    const extra = (n: number) => { const c = custoParcelamento(a.parcelamento, n); return Math.round(c.total - c.compra); };
    expect(OPCOES_ENTREGAS.map(extra)).toEqual([47717, 30955, 27768, 27974, 31781, 49987]);
    expect(custoParcelamento(a.parcelamento, 3).excedeCapacidade).toBe(true);
    expect(Math.round(custoParcelamento(a.parcelamento, 3).picoUnid)).toBe(12600);
    expect(custoParcelamento(a.parcelamento, 4).excedeCapacidade).toBe(false);
    expect(Math.round(custoParcelamento(a.parcelamento, 4).picoUnid)).toBe(9800);
    expect(melhorParcelamento(a.parcelamento).n).toBe(4);
  });
  it("validadores dos desafios", () => {
    const CINCO = ["c1", "c2", "c3", "c4", "c5"];
    expect(validar(2, 0, estAq({ incl: CINCO, est: "mediana" }))).toBe(true);
    expect(validar(2, 0, estAq({ incl: CINCO, est: "media" }))).toBe(true);
    expect(validar(2, 0, estAq({ incl: CINCO, est: "menor" }))).toBe(false);
    expect(validar(2, 0, estAq({ est: "mediana" }))).toBe(false);
    expect(validar(2, 1, estAq({ classif: ["p4", "p5"] }))).toBe(true);
    expect(validar(2, 1, estAq({}))).toBe(false);
    expect(validar(2, 2, estAq({ entregas: 4 }))).toBe(true);
    expect(validar(2, 2, estAq({ entregas: 3 }))).toBe(false);
    expect(validar(2, 5, estAq({ incl: CINCO, est: "mediana", classif: ["p4", "p5"], entregas: 4 }))).toBe(true);
    expect(validar(2, 5, estAq({ incl: CINCO, est: "mediana", classif: ["p4", "p5"], entregas: 3 }))).toBe(false);
    expect(validar(2, 5, estAq({ incl: CINCO, est: "mediana", entregas: 4 }))).toBe(false);
  });
});

describe("Armazenamento", () => {
  const ex = c4.armazenamento!;
  it("exposição por hora de transferência", () => {
    const e = (h: number) => exposicao(ex, h);
    expect([e(7).picoC, e(7).horasAcima8]).toEqual([12, 4]);
    expect([e(12).picoC, e(12).horasAcima8, e(12).horasAcima25]).toEqual([17, 9, 0]);
    expect([e(20).picoC, e(20).horasAcima8]).toEqual([25, 17]);
    expect([e(21).picoC, e(21).horasAcima8, e(21).horasAcima25]).toEqual([26, 18, 1]);
    expect(e(7).h8).toBe(3);
    expect(e(7).h25).toBe(20);
  });
  it("conduta esperada: insulina depende do limite de 25 °C; vacina e ocitocina sempre quarentena", () => {
    const esp = (h: number) => Object.fromEntries(ex.itens.map((i) => [i.id, avaliarConduta(i, exposicao(ex, h), ex, undefined).esperada]));
    expect(esp(12)).toEqual({ insulina: "liberar", vacina: "quarentena", ocitocina: "quarentena" });
    expect(esp(20).insulina).toBe("liberar");
    expect(esp(21).insulina).toBe("quarentena");
  });
  it("validadores dos desafios", () => {
    expect(validar(3, 0, estArm(21, { insulina: "quarentena" }))).toBe(true);
    expect(validar(3, 0, estArm(21, { insulina: "liberar" }))).toBe(false);
    expect(validar(3, 0, estArm(20, { insulina: "quarentena" }))).toBe(false);
    expect(validar(3, 1, estArm(12, { insulina: "liberar", vacina: "quarentena", ocitocina: "quarentena" }))).toBe(true);
    expect(validar(3, 1, estArm(12, { insulina: "quarentena", vacina: "quarentena", ocitocina: "quarentena" }))).toBe(false);
    expect(validar(3, 1, estArm(12, { insulina: "liberar", vacina: "quarentena", ocitocina: "descartar" }))).toBe(false);
    expect(validar(3, 2, estArm(7, { vacina: "quarentena" }))).toBe(true);
    expect(validar(3, 2, estArm(7, { vacina: "liberar" }))).toBe(false);
  });
});

describe("Distribuição", () => {
  const d = c5.distribuicao!;
  const num = (r: ReturnType<typeof computeDistribuicao>) => ({ min: +r.minDias.toFixed(1), max: +r.maxDias.toFixed(1), razao: +r.razaoMaxMin.toFixed(2), risco: r.ubsEmRisco, cap: r.ubsAcimaCapacidade });
  it("igualitário: Central e Vila Nova abaixo de 30 dias e Rural Norte acima da capacidade", () => {
    const r = estDist("igualitario").resultado;
    expect(num(r)).toEqual({ min: 24, max: 71, razao: 2.96, risco: ["UBS Central", "UBS Vila Nova"], cap: ["UBS Rural Norte"] });
    expect(r.linhas.find((l) => l.id === "rural")!.saldoFinal).toBe(7100);
  });
  it("proporcional ao consumo: ninguém em risco, mas de 30,0 a 54,0 dias", () => {
    expect(num(estDist("proporcional-consumo").resultado)).toEqual({ min: 30, max: 54, razao: 1.8, risco: [], cap: [] });
  });
  it("proporcional ao déficit: razão 1,14", () => {
    expect(num(estDist("proporcional-deficit").resultado)).toEqual({ min: 36.4, max: 41.4, razao: 1.14, risco: [], cap: [] });
  });
  it("Rural fixada em 5.500, reserva de 4.000 e plano final", () => {
    const rural = estDist("proporcional-deficit", { fixos: { rural: 5500 } }).resultado;
    expect(rural.linhas.find((l) => l.id === "rural")!.coberturaDias).toBe(60);
    expect(+rural.minDias.toFixed(1)).toBe(34.3);
    const reserva = estDist("proporcional-deficit", { reserva: 4000 }).resultado;
    expect(+reserva.minDias.toFixed(1)).toBe(33);
    expect(Math.round(reserva.sobraCAF)).toBe(4400);
    expect(+estDist("proporcional-deficit", { reserva: 8000 }).resultado.linhas.find((l) => l.id === "alto")!.coberturaDias.toFixed(1)).toBe(29.6);
    const plano = estDist("proporcional-deficit", { reserva: 4000, fixos: { rural: 5500 } }).resultado;
    expect(num(plano)).toEqual({ min: 30.9, max: 60, razao: 1.94, risco: [], cap: [] });
    expect(num(estDist("proporcional-consumo", { reserva: 4000, fixos: { rural: 5500 } }).resultado).risco).toEqual(["UBS Central", "UBS Vila Nova", "UBS Bairro Alto"]);
    expect(estDist("proporcional-deficit", { reserva: 4000, fixos: { rural: 6000 } }).resultado.ubsAcimaCapacidade).toEqual(["UBS Rural Norte"]);
    expect(5000 * 1.5 - 4500).toBe(3000);
  });
  it("validadores dos desafios", () => {
    expect(validar(4, 0, estDist("igualitario"))).toBe(true);
    expect(validar(4, 0, estDist("proporcional-consumo"))).toBe(false);
    expect(validar(4, 1, estDist("proporcional-consumo"))).toBe(true);
    expect(validar(4, 1, estDist("proporcional-deficit"))).toBe(false);
    expect(validar(4, 2, estDist("proporcional-deficit", { fixos: { rural: 5500 } }))).toBe(true);
    expect(validar(4, 2, estDist("proporcional-deficit"))).toBe(false);
    expect(validar(4, 4, estDist("proporcional-deficit", { reserva: 4000 }))).toBe(true);
    expect(validar(4, 4, estDist("proporcional-deficit", { reserva: 8000 }))).toBe(false);
    expect(validar(4, 4, estDist("proporcional-deficit", { reserva: 4000, fixos: { rural: 5500 } }))).toBe(false); // fixada
    expect(validar(4, 5, estDist("proporcional-deficit", { reserva: 4000, fixos: { rural: 5500 } }))).toBe(true);
    expect(validar(4, 5, estDist("proporcional-deficit", { reserva: 4000, fixos: { rural: 6000 } }))).toBe(false);
    expect(validar(4, 5, estDist("proporcional-consumo", { reserva: 4000, fixos: { rural: 5500 } }))).toBe(false);
  });
});

describe("Dispensação", () => {
  const d = c6.dispensacao!;
  const [amo, ena, par] = d.itens;
  it("quantidades, lote FEFO que cobre o tratamento e ação esperada", () => {
    expect(quantidadeNecessaria(amo)).toBe(21);
    expect(quantidadeNecessaria(ena)).toBe(60);
    expect(quantidadeNecessaria(par)).toBe(12);
    expect(loteEsperado(d, ena)?.lote).toBe("ENL-1045");
    expect(estDisp(OK_DISP).todosCorretos).toBe(true);
    expect(estDisp({ ...OK_DISP, amoxicilina: { acao: "dispensar", loteId: "am-1", quantidade: 21 } }).todosCorretos).toBe(false);
    expect(estDisp({ ...OK_DISP, enalapril: { acao: "dispensar", loteId: "en-0", quantidade: 60 } }).todosCorretos).toBe(false);
    expect(estDisp({ ...OK_DISP, enalapril: { acao: "dispensar", loteId: "en-1", quantidade: 30 } }).todosCorretos).toBe(false);
    expect(estDisp({ ...OK_DISP, paracetamol: { acao: "substituir" } }).todosCorretos).toBe(false);
  });
  it("validadores dos desafios", () => {
    expect(validar(5, 0, estDisp(OK_DISP))).toBe(true);
    expect(validar(5, 0, estDisp({ ...OK_DISP, amoxicilina: { acao: "dispensar", loteId: "am-1", quantidade: 21 } }))).toBe(false);
    expect(validar(5, 1, estDisp(OK_DISP))).toBe(true);
    expect(validar(5, 1, estDisp({ ...OK_DISP, enalapril: { acao: "dispensar", loteId: "en-0", quantidade: 60 } }))).toBe(false);
    expect(validar(5, 1, estDisp({ ...OK_DISP, enalapril: { acao: "dispensar", loteId: "en-2", quantidade: 60 } }))).toBe(false);
    expect(validar(5, 2, estDisp(OK_DISP))).toBe(true);
    expect(validar(5, 2, estDisp({ ...OK_DISP, paracetamol: { acao: "substituir" } }))).toBe(false);
    expect(validar(5, 5, estDisp(OK_DISP))).toBe(true);
    expect(validar(5, 5, estDisp({ ...OK_DISP, paracetamol: { acao: "substituir" } }))).toBe(false);
  });
});

describe("desafio automático (casos gerados por IA)", () => {
  const states: Record<string, Record<string, any>> = {
    selecao: estSelecao([...BASE, "espironolactona"]),
    programacao: estProg({ losartana: { metodo: "media12", mesesSeguranca: 0.5, intervalo: 3 }, amoxicilina: { metodo: "corrigida12", mesesSeguranca: 1, intervalo: 3 }, insulina: { metodo: "media12", mesesSeguranca: 1, intervalo: 3 } }),
    aquisicao: estAq({ classif: ["p4", "p5"], entregas: 4 }),
    armazenamento: estArm(12, { insulina: "liberar", vacina: "quarentena", ocitocina: "quarentena" }),
    distribuicao: estDist("proporcional-deficit"),
    dispensacao: estDisp(OK_DISP),
  };
  it.each(BUILT_IN_CASES.map((c) => [c.etapa, c] as const))("%s: passa com a resposta correta e falha com o estado inicial", (etapa, caso) => {
    expect(avaliarEtapa(caso, states[etapa]).every((v) => v.ok), JSON.stringify(avaliarEtapa(caso, states[etapa]).filter((v) => !v.ok))).toBe(true);
    const ch = desafiosAutomaticos(caso).challenges[0] as Extract<Challenge, { type: "adjust" }>;
    expect(ch.validator(states[etapa]).correct).toBe(true);
    const inicial: Record<string, Record<string, any>> = {
      selecao: estSelecao(BASE),
      programacao: estProg({ losartana: PADRAO, amoxicilina: PADRAO, insulina: PADRAO }),
      aquisicao: estAq({}),
      armazenamento: estArm(7, {}),
      distribuicao: estDist(""),
      dispensacao: estDisp({}),
    };
    expect(ch.validator(inicial[etapa]).correct).toBe(false);
  });
});

describe("validação dos casos por IA (edge function) espelha o motor", () => {
  it("os seis casos nativos passam na validação", () => {
    for (const c of BUILT_IN_CASES) {
      const v = validateCadeiaCase(c, c.etapa);
      expect(v.errors, c.title).toEqual([]);
    }
  });
  it("a simulação da edge function é idêntica à do motor em todas as combinações", () => {
    for (const item of c2.programacao!.itens) {
      for (const metodo of ["media12", "media6", "corrigida12"] as const)
        for (const mesesSeguranca of [0, 0.5, 1, 1.5, 2])
          for (const intervalo of [1, 2, 3, 4, 6, 12]) {
            const a = simularProgramacao(item, { metodo, mesesSeguranca, intervalo });
            const b = simEdge(item, { metodo, mesesSeguranca, intervalo });
            expect([b.rupturaDias, Math.round(b.perdas), b.pedidos, Math.round(b.pico), b.excedeCapacidade]).toEqual([a.rupturaDias, Math.round(a.perdasUnid), a.nPedidos, Math.round(a.picoEstoque), a.excedeCapacidade]);
          }
      expect(programacaoResolvivel(item)).toBe(true);
    }
  });
  it("critérios de seleção e de distribuição coincidem com os do motor", () => {
    const s = c1.selecao!;
    for (const inc of [BASE, [...BASE, "espironolactona"], [...BASE, "olmesartana"], [...BASE, "espironolactona", "rosuvastatina"]]) {
      expect(selecaoProblemas(s, inc).length === 0).toBe(selecaoAtendeCriterios(s, inc).ok);
    }
    const d = c5.distribuicao!;
    expect(distribuicaoDeficitProblemas(d).length === 0).toBe(distribuicaoAtendeCriterios(d, sugerirRateio(d, "proporcional-deficit")).ok);
  });
  it("rejeita casos inválidos ou impossíveis de resolver", () => {
    const clone = () => JSON.parse(JSON.stringify(c2));
    const semFalta = clone();
    semFalta.programacao.itens.forEach((i: any) => (i.diasFalta = i.diasFalta.map(() => 0)));
    expect(validateCadeiaCase(semFalta, "programacao").ok).toBe(false);
    const impossivel = clone();
    impossivel.programacao.itens[0].capacidade = 10; // nenhuma configuração cabe
    expect(validateCadeiaCase(impossivel, "programacao").ok).toBe(false);
    const semEscassez = JSON.parse(JSON.stringify(c5));
    semEscassez.distribuicao.disponivelCAF = 90000;
    expect(validateCadeiaCase(semEscassez, "distribuicao").ok).toBe(false);
    const receitaValida = JSON.parse(JSON.stringify(c6));
    receitaValida.dispensacao.receitaEmitidaEm = "2026-08-10";
    receitaValida.dispensacao.itens[2].lotes = [{ id: "pa-1", lote: "PAR-1", validade: "2027-01-31", saldo: 500 }];
    expect(validateCadeiaCase(receitaValida, "dispensacao").ok).toBe(false); // tudo dispensável: falta o contraste
    expect(validateCadeiaCase({ ...c1, etapa: "programacao" }, "selecao").ok).toBe(false);
    expect(validateCadeiaCase(null).ok).toBe(false);
  });
});
