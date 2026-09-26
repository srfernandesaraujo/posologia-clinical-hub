/**
 * Validação dos casos do simulador "Gestão da Cadeia de Suprimentos Farmacêuticos" gerados por IA (generate-case).
 *
 * A IA fornece só os DADOS de entrada de uma etapa; o motor do simulador (src/lib/cadeiaSuprimentos/*) calcula tudo.
 * Por isso a validação tem duas partes: (1) estrutura e faixas plausíveis dos números; (2) o caso precisa ser RESOLVÍVEL:
 * existir ao menos uma configuração que atenda aos critérios do motor (senão o aluno fica preso num desafio impossível).
 *
 * Este arquivo espelha, de propósito, as funções mínimas do motor (a edge function não importa de src/). O teste
 * src/lib/cadeiaSuprimentos/cadeiaSuprimentos.test.ts compara as duas implementações para evitar divergência.
 */

export const ETAPAS_CADEIA = ["selecao", "programacao", "aquisicao", "armazenamento", "distribuicao", "dispensacao"] as const;
export type EtapaCadeia = (typeof ETAPAS_CADEIA)[number];

const isNum = (x: any) => typeof x === "number" && Number.isFinite(x);
const isStr = (x: any) => typeof x === "string" && x.trim().length > 0;
const isIso = (x: any) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
const uniq = (a: string[]) => new Set(a).size === a.length;

// ── espelho: Seleção ────────────────────────────────────────────────────────────────────────────────────────────────
export function selecaoProblemas(caso: any, incluidos: string[]): string[] {
  const set = new Set(incluidos);
  const itens = caso.itens.filter((i: any) => set.has(i.id));
  const cm = (i: any) => i.precoUnit * i.unidMes;
  let total = 0;
  for (const i of itens) {
    const migrando = caso.itens.filter((o: any) => set.has(o.id) && o.migraDe === i.id).reduce((s: number, o: any) => s + o.usuarios, 0);
    total += Math.max(0, i.usuarios - migrando) * cm(i) * 12;
  }
  const problemas: string[] = [];
  if (total > caso.orcamentoAnual) problemas.push("orçamento");
  if (caso.necessidades.some((n: any) => !itens.some((i: any) => i.necessidade === n.id))) problemas.push("necessidade");
  const classes = itens.map((i: any) => i.classe);
  if (!uniq(classes)) problemas.push("duplicidade");
  if (itens.some((i: any) => !i.rename)) problemas.push("rename");
  return problemas;
}

// ── espelho: Programação ────────────────────────────────────────────────────────────────────────────────────────────
const media = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
export function calcCMM(item: any, metodo: string): number {
  if (metodo === "media6") return media(item.consumoHist.slice(-6));
  if (metodo === "corrigida12") return media(item.consumoHist.map((c: number, i: number) => (c * 30) / (30 - Math.min(item.diasFalta[i] ?? 0, 27))));
  return media(item.consumoHist);
}
export function simularProgramacao(item: any, p: { metodo: string; mesesSeguranca: number; intervalo: number }) {
  const cmm = calcCMM(item, p.metodo);
  const nivelMax = cmm * (p.intervalo + item.trMeses) + cmm * p.mesesSeguranca;
  let lotes: { qty: number; exp: number }[] = item.estoqueInicial > 0 ? [{ qty: item.estoqueInicial, exp: item.validadeEstoqueInicial }] : [];
  const chegadas: { mes: number; qty: number }[] = [];
  let perdas = 0, pedidos = 0, rupturaDias = 0, pico = 0;
  const total = (l: { qty: number }[]) => l.reduce((s, x) => s + x.qty, 0);
  for (let t = 0; t < 12; t++) {
    for (const c of chegadas.filter((x) => x.mes === t)) lotes.push({ qty: c.qty, exp: t + item.validadeMeses });
    lotes = lotes.filter((l) => { if (l.exp <= t) { perdas += l.qty; return false; } return true; });
    if (t % p.intervalo === 0) {
      const posicao = total(lotes) + chegadas.filter((x) => x.mes > t).reduce((s, x) => s + x.qty, 0);
      const pedido = Math.max(0, Math.ceil(nivelMax - posicao));
      if (pedido > 0) { chegadas.push({ mes: t + item.trMeses, qty: pedido }); pedidos++; }
    }
    pico = Math.max(pico, total(lotes));
    lotes.sort((a, b) => a.exp - b.exp);
    let restante = item.demanda[t];
    for (const l of lotes) { const usa = Math.min(l.qty, restante); l.qty -= usa; restante -= usa; }
    lotes = lotes.filter((l) => l.qty > 0);
    if (restante > 0) rupturaDias += Math.round((30 * restante) / item.demanda[t]);
  }
  return { rupturaDias, perdas, pedidos, pico, excedeCapacidade: item.capacidade !== undefined && pico > item.capacidade };
}
export function programacaoResolvivel(item: any): boolean {
  for (const metodo of ["media12", "media6", "corrigida12"])
    for (const mesesSeguranca of [0, 0.5, 1, 1.5, 2])
      for (const intervalo of [3, 4, 6, 12]) {
        const r = simularProgramacao(item, { metodo, mesesSeguranca, intervalo });
        if (r.rupturaDias === 0 && r.perdas === 0 && !r.excedeCapacidade && r.pedidos <= 4) return true;
      }
  return false;
}

// ── espelho: Distribuição ───────────────────────────────────────────────────────────────────────────────────────────
export function distribuicaoDeficitProblemas(c: any): string[] {
  const def = (u: any) => Math.max(0, u.cmm * c.coberturaAlvoMeses - u.saldo);
  const soma = c.ubs.reduce((s: number, u: any) => s + def(u), 0) || 1;
  const aloc: Record<string, number> = {};
  for (const u of c.ubs) aloc[u.id] = Math.floor((c.disponivelCAF * def(u)) / soma / c.passo) * c.passo;
  const dias = c.ubs.map((u: any) => ((u.saldo + aloc[u.id]) / u.cmm) * 30);
  const p: string[] = [];
  if (dias.some((d: number) => d < c.limiteRiscoDias)) p.push("risco");
  if (c.ubs.some((u: any) => u.saldo + aloc[u.id] > u.capacidade)) p.push("capacidade");
  if (Math.max(...dias) / Math.min(...dias) > 1.25) p.push("desigual");
  return p;
}

// ── validação por etapa ─────────────────────────────────────────────────────────────────────────────────────────────
function validarSelecao(s: any, e: string[]) {
  if (!s || !isNum(s.orcamentoAnual) || s.orcamentoAnual <= 0) return e.push("selecao.orcamentoAnual inválido");
  if (!Array.isArray(s.necessidades) || s.necessidades.length < 3) return e.push("selecao.necessidades precisa de 3+ itens");
  if (!Array.isArray(s.itens) || s.itens.length < 7 || s.itens.length > 14) return e.push("selecao.itens precisa de 7 a 14 itens");
  const nec = s.necessidades.map((n: any) => n?.id);
  if (!uniq(nec) || s.necessidades.some((n: any) => !isStr(n?.id) || !isStr(n?.label) || !isNum(n?.pacientes) || n.pacientes <= 0)) e.push("selecao.necessidades com id/label/pacientes inválidos");
  const ids = s.itens.map((i: any) => i?.id);
  if (!uniq(ids)) e.push("selecao.itens com id repetido");
  for (const i of s.itens) {
    if (!isStr(i?.id) || !isStr(i?.nome) || !isStr(i?.classe) || !isStr(i?.evidencia)) { e.push("selecao.itens com campo de texto ausente"); break; }
    if (!nec.includes(i.necessidade)) e.push(`item ${i.id}: necessidade '${i.necessidade}' não existe em necessidades`);
    if (typeof i.rename !== "boolean" || typeof i.emUso !== "boolean") e.push(`item ${i.id}: rename/emUso precisam ser booleanos`);
    if (![i.precoUnit, i.unidMes, i.usuarios].every(isNum) || i.precoUnit <= 0 || i.unidMes <= 0 || i.usuarios <= 0) e.push(`item ${i.id}: precoUnit/unidMes/usuarios precisam ser números positivos`);
    if (i.migraDe !== undefined && !ids.includes(i.migraDe)) e.push(`item ${i.id}: migraDe '${i.migraDe}' não existe`);
  }
  if (e.length) return;
  if (!s.itens.some((i: any) => i.emUso) || !s.itens.some((i: any) => !i.emUso)) return e.push("selecao precisa de itens do elenco atual (emUso) e de solicitações (não emUso)");
  // resolvível: existe um subconjunto que cabe no orçamento, cobre tudo, sem duplicidade nem fora da RENAME
  let achou = false;
  const n = s.itens.length;
  for (let mask = 1; mask < 1 << n && !achou; mask++) {
    const inc = s.itens.filter((_: any, k: number) => mask & (1 << k)).map((i: any) => i.id);
    if (selecaoProblemas(s, inc).length === 0) achou = true;
  }
  if (!achou) e.push("selecao: nenhum elenco atende a orçamento, cobertura, duplicidade e RENAME ao mesmo tempo");
  // desafiante: o elenco atual sozinho NÃO deve ser a resposta (senão não há decisão a tomar)
  if (selecaoProblemas(s, s.itens.filter((i: any) => i.emUso).map((i: any) => i.id)).length === 0) e.push("selecao: o elenco atual já atende a todos os critérios; inclua uma lacuna (necessidade sem item)");
}

function validarProgramacao(p: any, e: string[]) {
  if (!p || !Array.isArray(p.itens) || p.itens.length < 2 || p.itens.length > 4) return e.push("programacao.itens precisa de 2 a 4 itens");
  if (!uniq(p.itens.map((i: any) => i?.id))) e.push("programacao.itens com id repetido");
  for (const i of p.itens) {
    const w = `item ${i?.id}`;
    if (!isStr(i?.id) || !isStr(i?.nome) || !isStr(i?.apresentacao) || !isStr(i?.unidade)) { e.push("programacao.itens com texto ausente"); continue; }
    for (const k of ["consumoHist", "diasFalta", "demanda"]) if (!Array.isArray(i[k]) || i[k].length !== 12 || !i[k].every(isNum)) e.push(`${w}: ${k} precisa de 12 números`);
    if (e.length) continue;
    if (i.diasFalta.some((d: number) => d < 0 || d > 20)) e.push(`${w}: diasFalta entre 0 e 20`);
    if (i.consumoHist.some((c: number) => c <= 0) || i.demanda.some((c: number) => c <= 0)) e.push(`${w}: consumo e demanda positivos`);
    if (![1, 2, 3].includes(i.trMeses)) e.push(`${w}: trMeses deve ser 1, 2 ou 3`);
    if (!isNum(i.validadeMeses) || i.validadeMeses < 4) e.push(`${w}: validadeMeses ≥ 4`);
    if (!isNum(i.validadeEstoqueInicial) || i.validadeEstoqueInicial < 1) e.push(`${w}: validadeEstoqueInicial ≥ 1`);
    if (!isNum(i.estoqueInicial) || i.estoqueInicial < 0) e.push(`${w}: estoqueInicial ≥ 0`);
    if (!isNum(i.precoUnit) || i.precoUnit <= 0) e.push(`${w}: precoUnit > 0`);
    if (!isNum(i.capacidade) || i.capacidade <= 0) e.push(`${w}: capacidade > 0`);
    if (e.length === 0 && !programacaoResolvivel(i)) e.push(`${w}: nenhuma configuração zera ruptura e perdas dentro da capacidade (ajuste estoque inicial, capacidade ou validade)`);
  }
  if (e.length === 0 && !p.itens.some((i: any) => i.diasFalta.some((d: number) => d > 0))) e.push("programacao: inclua ao menos um item com faltas no histórico (diasFalta > 0), para o CMM corrigido fazer diferença");
}

function validarAquisicao(a: any, e: string[]) {
  if (!a || !isStr(a.itemNome)) return e.push("aquisicao.itemNome ausente");
  if (!Array.isArray(a.cotacoes) || a.cotacoes.length < 6 || !uniq(a.cotacoes.map((c: any) => c?.id)) || a.cotacoes.some((c: any) => !isStr(c?.fonte) || !isNum(c?.valor) || c.valor <= 0 || !isStr(c?.detalhe))) e.push("aquisicao.cotacoes precisa de 6+ itens com id único, fonte, valor > 0 e detalhe");
  if (!Array.isArray(a.propostas) || a.propostas.length < 4 || !uniq(a.propostas.map((p: any) => p?.id))) e.push("aquisicao.propostas precisa de 4+ itens com id único");
  const ed = a.edital;
  if (!ed || !isNum(ed.validadeMinimaMeses) || !isNum(ed.prazoMaximoEntregaDias)) e.push("aquisicao.edital sem validadeMinimaMeses/prazoMaximoEntregaDias");
  const p = a.parcelamento;
  if (!p || !["quantidadeAnual", "precoUnit", "freteEntrega", "taxaManutencaoMes", "validadeMeses", "mesesSeguranca", "capacidade"].every((k) => isNum(p[k]) && p[k] >= 0)) e.push("aquisicao.parcelamento com campos numéricos ausentes");
  if (e.length) return;
  for (const q of a.propostas) if (!isStr(q?.fornecedor) || !isNum(q?.precoUnit) || !isNum(q?.validadeMeses) || !isNum(q?.prazoEntregaDias) || typeof q?.documentacaoOk !== "boolean") { e.push("aquisicao.propostas com campo ausente"); return; }
  const aptas = a.propostas.filter((q: any) => q.documentacaoOk && q.validadeMeses >= ed.validadeMinimaMeses && q.prazoEntregaDias <= ed.prazoMaximoEntregaDias);
  if (aptas.length < 1) e.push("aquisicao: nenhuma proposta cumpre o edital");
  if (aptas.length === a.propostas.length) e.push("aquisicao: todas as propostas cumprem o edital (falta contraste para o julgamento)");
  const menor = a.propostas.reduce((x: any, y: any) => (y.precoUnit < x.precoUnit ? y : x));
  if (aptas.some((q: any) => q.id === menor.id)) e.push("aquisicao: a proposta de menor preço cumpre o edital; ao menos uma proposta mais barata que a vencedora deve ser inapta");
  const ns = [1, 2, 3, 4, 6, 12];
  if (!ns.some((n) => p.quantidadeAnual / n + (p.quantidadeAnual / 12) * p.mesesSeguranca <= p.capacidade)) e.push("aquisicao: nenhuma opção de entregas cabe na capacidade de armazenamento");
}

function validarArmazenamento(x: any, e: string[]) {
  if (!x) return e.push("armazenamento ausente");
  for (const k of ["tempInicialC", "taxaSubidaCporH", "ambienteC", "retornoEnergiaH", "taxaResfriamentoCporH", "limiteSuperiorC", "limiteInferiorC", "chegadaEquipeH"]) if (!isNum(x[k])) e.push(`armazenamento.${k} precisa ser número`);
  if (e.length) return;
  if (x.taxaSubidaCporH <= 0 || x.retornoEnergiaH <= x.chegadaEquipeH) e.push("armazenamento: retornoEnergiaH deve ser maior que chegadaEquipeH e a taxa de subida positiva");
  const h8 = (x.limiteSuperiorC - x.tempInicialC) / x.taxaSubidaCporH;
  if (x.chegadaEquipeH <= h8) e.push("armazenamento: a equipe precisa chegar depois do alarme (chegadaEquipeH > hora em que cruza o limite superior)");
  if (!Array.isArray(x.itens) || x.itens.length < 2 || x.itens.length > 4) return e.push("armazenamento.itens precisa de 2 a 4 itens");
  for (const i of x.itens) {
    if (!isStr(i?.id) || !isStr(i?.nome) || !isStr(i?.unidade) || !isNum(i?.quantidade) || !isNum(i?.valorUnit) || i.quantidade <= 0 || i.valorUnit <= 0) { e.push("armazenamento.itens com campo ausente"); continue; }
    const d = i.dado;
    if (!d || !["limite", "pni", "semDado"].includes(d.tipo) || !isStr(d.descricao)) e.push(`item ${i.id}: dado.tipo deve ser limite, pni ou semDado, com descricao`);
    if (d?.tipo === "limite" && (!isNum(d.tempMaxC) || d.tempMaxC <= x.limiteSuperiorC || d.tempMaxC > x.ambienteC)) e.push(`item ${i.id}: tempMaxC deve ficar entre o limite superior e a temperatura ambiente`);
  }
  if (e.length === 0 && !x.itens.some((i: any) => i.dado.tipo === "limite")) e.push("armazenamento: inclua ao menos um item com dado.tipo 'limite' (tolerância declarada), para a hora da transferência mudar a conduta");
}

function validarDistribuicao(d: any, e: string[]) {
  if (!d || !isStr(d.itemNome) || !isStr(d.unidade)) return e.push("distribuicao.itemNome/unidade ausentes");
  for (const k of ["disponivelCAF", "coberturaAlvoMeses", "limiteRiscoDias", "passo"]) if (!isNum(d[k]) || d[k] <= 0) e.push(`distribuicao.${k} precisa ser número positivo`);
  if (!Array.isArray(d.ubs) || d.ubs.length < 4 || d.ubs.length > 8 || !uniq(d.ubs.map((u: any) => u?.id))) return e.push("distribuicao.ubs precisa de 4 a 8 unidades com id único");
  for (const u of d.ubs) if (!isStr(u?.id) || !isStr(u?.nome) || !isNum(u?.cmm) || !isNum(u?.saldo) || !isNum(u?.capacidade) || u.cmm <= 0 || u.saldo < 0 || u.capacidade <= u.saldo) e.push(`unidade ${u?.id}: cmm > 0, saldo ≥ 0 e capacidade > saldo`);
  if (e.length) return;
  const deficitTotal = d.ubs.reduce((s: number, u: any) => s + Math.max(0, u.cmm * d.coberturaAlvoMeses - u.saldo), 0);
  if (d.disponivelCAF >= deficitTotal) e.push("distribuicao: o disponível cobre todo o déficit; o caso precisa de escassez (disponivelCAF < déficit total)");
  const p = distribuicaoDeficitProblemas(d);
  if (p.length) e.push(`distribuicao: o rateio proporcional ao déficit não atende aos critérios (${p.join(", ")}); ajuste saldos, capacidades ou disponível`);
}

function validarDispensacao(c: any, e: string[]) {
  if (!c || !isIso(c.hoje) || !isIso(c.receitaEmitidaEm) || !isStr(c.paciente) || !isStr(c.prescritor) || !isStr(c.regraLocal)) return e.push("dispensacao: hoje/receitaEmitidaEm em AAAA-MM-DD, paciente, prescritor e regraLocal são obrigatórios");
  if (!Array.isArray(c.itens) || c.itens.length < 2 || c.itens.length > 4) return e.push("dispensacao.itens precisa de 2 a 4 itens");
  const dia = 86_400_000;
  const idade = Math.round((Date.parse(c.hoje) - Date.parse(c.receitaEmitidaEm)) / dia);
  if (idade < 0) e.push("dispensacao: a receita não pode ser emitida depois de hoje");
  let temDispensar = false;
  let temNaoDispensar = false;
  for (const i of c.itens) {
    if (!isStr(i?.id) || !isStr(i?.nome) || !isStr(i?.posologia) || ![i?.dosePorTomada, i?.vezesDia, i?.dias].every(isNum) || i.dosePorTomada <= 0 || i.vezesDia <= 0 || i.dias <= 0) { e.push("dispensacao.itens com posologia inválida"); continue; }
    if (!Array.isArray(i.lotes) || i.lotes.some((l: any) => !isStr(l?.id) || !isStr(l?.lote) || !isIso(l?.validade) || !isNum(l?.saldo) || l.saldo < 0)) { e.push(`item ${i.id}: lotes com id, lote, validade (AAAA-MM-DD) e saldo`); continue; }
    const qtd = i.dosePorTomada * i.vezesDia * i.dias;
    const receitaOk = !i.antimicrobiano || idade <= 10;
    const estoque = i.lotes.reduce((s: number, l: any) => s + l.saldo, 0);
    const fim = new Date(Date.parse(c.hoje) + i.dias * dia).toISOString().slice(0, 10);
    const lotePossivel = i.lotes.some((l: any) => l.saldo >= qtd && l.validade >= fim);
    if (!receitaOk || estoque < qtd) temNaoDispensar = true;
    else if (lotePossivel) temDispensar = true;
    else e.push(`item ${i.id}: há estoque, mas nenhum lote cobre o tratamento com saldo suficiente (a ação esperada seria indefinida)`);
  }
  if (e.length === 0 && (!temDispensar || !temNaoDispensar)) e.push("dispensacao: precisa de ao menos um item a dispensar e um que NÃO deva ser dispensado (receita de antimicrobiano vencida ou falta de estoque)");
}

/** Valida e normaliza o caso gerado. `data` é o caso sem `title`/`difficulty` (que a função generate-case trata à parte). */
export function validateCadeiaCase(c: any, etapaEsperada?: string): { ok: boolean; errors: string[] } {
  const e: string[] = [];
  if (!c || typeof c !== "object") return { ok: false, errors: ["JSON do caso ausente"] };
  if (!ETAPAS_CADEIA.includes(c.etapa)) e.push(`etapa deve ser uma de: ${ETAPAS_CADEIA.join(", ")}`);
  else if (etapaEsperada && c.etapa !== etapaEsperada) e.push(`a etapa deveria ser '${etapaEsperada}'`);
  if (!isStr(c.scenario) || c.scenario.length < 80) e.push("scenario precisa ter contexto e tarefa (80+ caracteres)");
  if (!c.patient || !isStr(c.patient.name) || !isStr(c.patient.diagnosis)) e.push("patient.name e patient.diagnosis são obrigatórios");
  if (!isStr(c.clinicalTip)) e.push("clinicalTip ausente");
  if (!Array.isArray(c.references) || c.references.length < 1) e.push("references precisa de 1+ referência real");
  if (e.length === 0) {
    switch (c.etapa as EtapaCadeia) {
      case "selecao": validarSelecao(c.selecao, e); break;
      case "programacao": validarProgramacao(c.programacao, e); break;
      case "aquisicao": validarAquisicao(c.aquisicao, e); break;
      case "armazenamento": validarArmazenamento(c.armazenamento, e); break;
      case "distribuicao": validarDistribuicao(c.distribuicao, e); break;
      case "dispensacao": validarDispensacao(c.dispensacao, e); break;
    }
  }
  return { ok: e.length === 0, errors: e };
}
