import { describe, it, expect } from "vitest";
import {
  TODAS_AS_SKILLS, CATEGORIAS_SIMULADOR, LIMITE_ETAPAS, FERRAMENTA_ROTEADOR, escolherSkillsPorPalavras, normalizarEscolha,
  montarPromptDoGerador, exigenciasNaoCumpridas, montarPedidoDeRevisao, skillPorId,
} from "../../supabase/functions/_shared/simulator-skills/index";
import { sanitizeAndLintSteps, validarModelo } from "../../supabase/functions/_shared/simulator-quality";

const PAINEIS_VALIDOS = ["info", "checklist", "radio", "text", "chart", "numeric_keypad", "indicator", "calculation", "explorer", "modelo"];

const modeloBom = () => ({
  title: "Cobertura",
  type: "modelo",
  modeloConfig: {
    inputs: [
      { name: "estoque", label: "Estoque", unit: "un", min: 0, max: 60000, step: 1000, default: 20000 },
      { name: "cmm", label: "Consumo mensal", unit: "un", min: 5000, max: 30000, step: 500, default: 15000 },
    ],
    outputs: [
      { label: "Cobertura", expr: "estoque / cmm", unit: "meses", decimals: 1, ruim: "estoque / cmm < 1" },
      { label: "Ponto de reposição", expr: "cmm * 2 + cmm * 0.5", unit: "un", decimals: 0 },
    ],
    series: { xLabel: "Mês", xFrom: 0, xTo: 6, xStep: 1, lines: [{ name: "Estoque projetado", expr: "max(estoque - cmm * t, 0)" }], refLines: [{ y: 0, label: "Ruptura" }] },
    formulaHint: "Cobertura = estoque ÷ CMM",
  },
});

describe("registro de skills", () => {
  it("ids únicos, categoria válida, etapas dentro do limite e playbook preenchido", () => {
    const ids = TODAS_AS_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TODAS_AS_SKILLS.length).toBeGreaterThanOrEqual(12);
    for (const s of TODAS_AS_SKILLS) {
      expect(CATEGORIAS_SIMULADOR, s.id).toContain(s.categoriaSugerida);
      expect(s.etapas[0], s.id).toBeGreaterThanOrEqual(LIMITE_ETAPAS.min);
      expect(s.etapas[1], s.id).toBeLessThanOrEqual(LIMITE_ETAPAS.max);
      expect(s.playbook.length, s.id).toBeGreaterThan(600);
      expect(s.playbook.startsWith("SKILL:"), s.id).toBe(true);
      expect(s.quandoUsar.length, s.id).toBeGreaterThan(40);
      expect(s.palavrasChave.length, s.id).toBeGreaterThan(4);
      for (const e of s.exige ?? []) e.tipos.forEach((t) => expect(PAINEIS_VALIDOS, s.id).toContain(t));
    }
  });
  it("a ferramenta do roteador aceita exatamente os ids registrados", () => {
    expect((FERRAMENTA_ROTEADOR.function.parameters.properties.skills.items as any).enum).toEqual(TODAS_AS_SKILLS.map((s) => s.id));
    expect((FERRAMENTA_ROTEADOR.function.parameters.properties.categoria as any).enum).toEqual(CATEGORIAS_SIMULADOR);
  });
});

describe("escolha de skills (fallback por palavras-chave e normalização)", () => {
  const ids = (pedido: string) => escolherSkillsPorPalavras(pedido).map((s) => s.id);
  it("o pedido original do Ciclo da Assistência Farmacêutica cai na skill de gestão", () => {
    const pedido = "O simulador deve ser da assistência Farmacêutica e deve simular Seleção, Programação, Aquisição, Armazenamento, Distribuição e Dispensação. Quero um simulador bem realista voltado para o estudante de graduação ou profissional recém formado";
    const r = ids(pedido);
    expect(r[0]).toBe("assistencia-farmaceutica-ciclo");
    expect(r).toContain("dispensacao-balcao");
  });
  it("outros tipos de pedido", () => {
    expect(ids("simulador de bomba de infusão com noradrenalina e alarme")[0]).toBe("equipamento-bomba-monitor");
    expect(ids("ajuste de vancomicina por nível sérico e AUC")[0]).toBe("tdm-farmacocinetica");
    expect(ids("caso de pneumonia com antibiograma e descalonamento")[0]).toBe("stewardship-antimicrobianos");
    expect(ids("revisão de prescrição de idosa polimedicada com PRM")[0]).toBe("prm-revisao-prescricao");
    expect(ids("cálculo de diluição e reconstituição de antibiótico")[0]).toBe("calculo-farmaceutico");
    expect(ids("notificação de reação adversa com escore de Naranjo")[0]).toBe("farmacovigilancia-rams");
  });
  it("sem palavra-chave conhecida, normalizarEscolha ainda devolve uma skill válida", () => {
    const e = normalizarEscolha(null, "xyzzy");
    expect(e.skills.length).toBe(1);
    expect(e.origem).toBe("padrao");
    expect(e.numEtapas).toBeGreaterThanOrEqual(LIMITE_ETAPAS.min);
  });
  it("normaliza a resposta do roteador: ids inválidos caem fora, no máximo 3 skills, etapas e categoria clamped", () => {
    const e = normalizarEscolha({ skills: ["tdm-farmacocinetica", "inexistente", "prm-revisao-prescricao", "tdm-farmacocinetica", "laboratorio", "gestao"], num_etapas: 99, categoria: "Astrologia", decisoes_centrais: ["a", "", "b"] }, "x");
    expect(e.skills.map((s) => s.id)).toEqual(["tdm-farmacocinetica", "prm-revisao-prescricao"]);
    expect(e.numEtapas).toBe(LIMITE_ETAPAS.max);
    expect(e.categoria).toBe("Farmacocinética Clínica");
    expect(e.decisoes).toEqual(["a", "b"]);
    expect(e.origem).toBe("ia");
  });
});

describe("montagem do prompt do gerador", () => {
  it("inclui só os playbooks escolhidos, o catálogo de painéis (com modelo) e o padrão pedagógico", () => {
    const e = normalizarEscolha({ skills: ["assistencia-farmaceutica-ciclo"], num_etapas: 6, categoria: "Assistência Farmacêutica", decisoes_centrais: ["Definir o estoque de segurança"] }, "x");
    const p = montarPromptDoGerador(e);
    expect(p).toContain("SKILL: ASSISTÊNCIA FARMACÊUTICA");
    expect(p).not.toContain("SKILL: TDM");
    expect(p).toContain('"modelo"');
    expect(p).toContain("PADRÃO PEDAGÓGICO OBRIGATÓRIO");
    expect(p).toContain("Definir o estoque de segurança");
    expect(p).toContain("Assistência Farmacêutica");
    expect(p).toContain(`entre ${LIMITE_ETAPAS.min} e ${LIMITE_ETAPAS.max} steps`);
  });
  it("na edição, o contexto do simulador existente entra no prompt", () => {
    const e = normalizarEscolha({ skills: ["prm-revisao-prescricao"] }, "x");
    expect(montarPromptDoGerador(e, "CONTEXTO DE EDIÇÃO XYZ")).toContain("CONTEXTO DE EDIÇÃO XYZ");
  });
  it("exigências das skills: aponta o painel que falta", () => {
    const e = normalizarEscolha({ skills: ["equipamento-bomba-monitor"] }, "x");
    expect(exigenciasNaoCumpridas(e, [{ panels: [{ type: "info" }, { type: "radio" }] }]).length).toBe(1);
    expect(exigenciasNaoCumpridas(e, [{ panels: [{ type: "numeric_keypad" }] }]).length).toBe(0);
    expect(montarPedidoDeRevisao(["a", "b"])).toContain("2. b");
    expect(skillPorId("nao-existe")).toBeUndefined();
  });
});

describe("painel modelo (validação e lint)", () => {
  it("aceita um modelo bem formado", () => {
    const v = validarModelo(modeloBom());
    expect(v.fatais).toEqual([]);
    expect(v.avisos).toEqual([]);
  });
  it("rejeita fórmulas inseguras, variáveis desconhecidas e divisões que zeram", () => {
    const m: any = modeloBom();
    m.modeloConfig.outputs[0].expr = "constructor";
    expect(validarModelo(m).fatais.join(" ")).toMatch(/desconhecida|função/);
    const z: any = modeloBom();
    z.modeloConfig.inputs[1].min = 0; // cmm = 0 → estoque / cmm não finito
    expect(validarModelo(z).fatais.join(" ")).toMatch(/não finito/);
    const e: any = modeloBom();
    e.modeloConfig.outputs[0].expr = "if(estoque > 1, 1, 0)";
    expect(validarModelo(e).fatais.length).toBeGreaterThan(0);
    const ev: any = modeloBom();
    ev.modeloConfig.outputs[0].expr = "eval('1')";
    expect(validarModelo(ev).fatais.length).toBeGreaterThan(0);
  });
  it("rejeita controles inválidos e avisa quando um controle não muda nada", () => {
    const a: any = modeloBom();
    a.modeloConfig.inputs[0].default = 999999;
    expect(validarModelo(a).fatais.join(" ")).toMatch(/default/);
    const b: any = modeloBom();
    b.modeloConfig.inputs[0].name = "Estoque Atual";
    expect(validarModelo(b).fatais.join(" ")).toMatch(/snake_case/);
    const c: any = modeloBom();
    c.modeloConfig.inputs.push({ name: "enfeite", label: "Enfeite", min: 0, max: 10, default: 5 });
    expect(validarModelo(c).avisos.join(" ")).toMatch(/Enfeite/);
    expect(validarModelo({ title: "x", type: "modelo" }).fatais.length).toBe(1);
  });
  it("sanitizeAndLintSteps mantém o modelo válido, remove o inválido e conta o modelo como exploração", () => {
    const decisao = { title: "Qual leitura?", type: "radio", options: ["Opção A com tamanho parecido", "Opção B com tamanho parecido", "Opção C com tamanho parecido", "Opção D com tamanho parecido"], correctAnswers: ["Opção C com tamanho parecido"] };
    const ok = sanitizeAndLintSteps([{ title: "E1", feedback: "f", panels: [modeloBom(), decisao] }]);
    expect(ok.steps[0].panels.some((p: any) => p.type === "modelo")).toBe(true);
    expect(ok.warnings.filter((w) => /explorer|modelo/.test(w))).toEqual([]);
    const ruim: any = modeloBom();
    ruim.modeloConfig.outputs[0].expr = "abc + 1";
    const r = sanitizeAndLintSteps([{ title: "E1", feedback: "f", panels: [ruim, decisao] }]);
    expect(r.steps[0].panels.some((p: any) => p.type === "modelo")).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/modelo inválido foi removido/);
    expect(r.warnings.join(" ")).toMatch(/Nenhuma etapa usa o painel explorer ou modelo/);
    const semDecisao = sanitizeAndLintSteps([{ title: "E1", feedback: "f", panels: [modeloBom()] }]);
    expect(semDecisao.warnings.join(" ")).toMatch(/nenhum painel de decisão/);
  });
});
