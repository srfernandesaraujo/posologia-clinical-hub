/**
 * Casos nativos do simulador "Gestão da Cadeia de Suprimentos Farmacêuticos" (slug: cadeia-suprimentos).
 * Um caso por etapa do ciclo da Assistência Farmacêutica, no mesmo município fictício (Vale do Sol, 60 mil habitantes,
 * 8 UBS, uma CAF municipal). A ORDEM deste array precisa ser a mesma de `nativeCaseCatalog.ts` e dos conjuntos de
 * desafios em `getCadeiaSuprimentosChallenges` (`simulatorChallenges.ts`). Preços e quantidades são ilustrativos.
 */
import type { SelecaoCaso } from "./selecao";
import type { ProgItem } from "./programacao";
import type { Cotacao, Proposta, EditalRequisitos, ParcelamentoCaso } from "./aquisicao";
import type { ExcursaoCaso } from "./armazenamento";
import type { DistribuicaoCaso } from "./distribuicao";
import type { DispensacaoCaso } from "./dispensacao";

export type Etapa = "selecao" | "programacao" | "aquisicao" | "armazenamento" | "distribuicao" | "dispensacao";

export const ETAPAS: { id: Etapa; label: string; resumo: string }[] = [
  { id: "selecao", label: "Seleção", resumo: "Definir o elenco (REMUME) com base em necessidade, evidência, RENAME e custo." },
  { id: "programacao", label: "Programação", resumo: "Estimar as quantidades: CMM, estoque de segurança, intervalo de compra." },
  { id: "aquisicao", label: "Aquisição", resumo: "Pesquisar preços, julgar propostas e parcelar as entregas." },
  { id: "armazenamento", label: "Armazenamento", resumo: "Receber, guardar e proteger a qualidade dos produtos." },
  { id: "distribuicao", label: "Distribuição", resumo: "Abastecer as unidades de saúde na quantidade e no tempo certos." },
  { id: "dispensacao", label: "Dispensação", resumo: "Entregar o medicamento certo, no lote certo, com orientação." },
];

export interface AquisicaoCaso {
  itemNome: string;
  cotacoes: Cotacao[];
  propostas: Proposta[];
  edital: EditalRequisitos;
  parcelamento: ParcelamentoCaso;
}

export interface CasoCadeia {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  etapa: Etapa;
  patient: { name: string; diagnosis: string };
  scenario: string;
  selecao?: SelecaoCaso;
  programacao?: { itens: ProgItem[] };
  aquisicao?: AquisicaoCaso;
  armazenamento?: ExcursaoCaso;
  distribuicao?: DistribuicaoCaso;
  dispensacao?: DispensacaoCaso;
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

// ── Caso 1: Seleção ─────────────────────────────────────────────────────────────────────────────────────────────────
const selecao: SelecaoCaso = {
  orcamentoAnual: 240000,
  necessidades: [
    { id: "has", label: "Hipertensão arterial (1ª linha)", pacientes: 2400 },
    { id: "has-resistente", label: "Hipertensão resistente / IC com FE reduzida", pacientes: 180 },
    { id: "dm2-1", label: "Diabetes tipo 2: 1ª linha", pacientes: 900 },
    { id: "dm2-2", label: "Diabetes tipo 2: 2ª linha", pacientes: 350 },
    { id: "dm2-insulina", label: "Diabetes: insulina", pacientes: 280 },
    { id: "dislip", label: "Dislipidemia (estatina)", pacientes: 700 },
  ],
  itens: [
    { id: "hctz", nome: "Hidroclorotiazida 25 mg (comprimido)", classe: "Diurético tiazídico", necessidade: "has", rename: true, emUso: true, precoUnit: 0.03, unidMes: 30, usuarios: 1400, evidencia: "Diurético tiazídico: 1ª linha na hipertensão, com redução de desfechos cardiovasculares demonstrada." },
    { id: "enalapril", nome: "Enalapril 10 mg (comprimido)", classe: "IECA", necessidade: "has", rename: true, emUso: true, precoUnit: 0.05, unidMes: 60, usuarios: 700, evidencia: "IECA: 1ª linha; a tosse seca ocorre em parte dos pacientes.", alerta: "Tosse seca em parte dos usuários" },
    { id: "losartana", nome: "Losartana 50 mg (comprimido)", classe: "BRA", necessidade: "has", rename: true, emUso: true, precoUnit: 0.08, unidMes: 60, usuarios: 600, evidencia: "BRA: 1ª linha; alternativa ao IECA quando há tosse." },
    { id: "anlodipino", nome: "Anlodipino 5 mg (comprimido)", classe: "Bloqueador de canal de cálcio", necessidade: "has", rename: true, emUso: true, precoUnit: 0.06, unidMes: 30, usuarios: 800, evidencia: "Bloqueador de canal de cálcio: 1ª linha; edema de membros inferiores é frequente." },
    { id: "atenolol", nome: "Atenolol 50 mg (comprimido)", classe: "Betabloqueador", necessidade: "has", rename: true, emUso: true, precoUnit: 0.04, unidMes: 30, usuarios: 250, evidencia: "Betabloqueador: reservado a indicações específicas (infarto prévio, insuficiência cardíaca, arritmia); não é 1ª linha isolado." },
    { id: "metformina", nome: "Metformina 850 mg (comprimido)", classe: "Biguanida", necessidade: "dm2-1", rename: true, emUso: true, precoUnit: 0.05, unidMes: 60, usuarios: 900, evidencia: "1ª linha no diabetes tipo 2; baixo risco de hipoglicemia e custo baixo." },
    { id: "glibenclamida", nome: "Glibenclamida 5 mg (comprimido)", classe: "Sulfonilureia", necessidade: "dm2-2", rename: true, emUso: true, precoUnit: 0.03, unidMes: 60, usuarios: 350, evidencia: "Sulfonilureia eficaz e barata; maior risco de hipoglicemia, sobretudo em idosos e na doença renal.", alerta: "Hipoglicemia em idosos" },
    { id: "insulina-nph", nome: "Insulina humana NPH 100 UI/mL (frasco 10 mL)", classe: "Insulina", necessidade: "dm2-insulina", rename: true, emUso: true, precoUnit: 22, unidMes: 1, usuarios: 280, evidencia: "Indicada na falha dos orais ou na hiperglicemia grave; exige cadeia de frio (2–8 °C)." },
    { id: "sinvastatina", nome: "Sinvastatina 20 mg (comprimido)", classe: "Estatina", necessidade: "dislip", rename: true, emUso: true, precoUnit: 0.06, unidMes: 30, usuarios: 700, evidencia: "Estatina com redução de eventos cardiovasculares comprovada; dose ajustável até 40 mg." },
    { id: "espironolactona", nome: "Espironolactona 25 mg (comprimido)", classe: "Antagonista mineralocorticoide", necessidade: "has-resistente", rename: true, emUso: false, precoUnit: 0.10, unidMes: 30, usuarios: 180, evidencia: "Indicada na hipertensão resistente (4º fármaco) e na insuficiência cardíaca com fração de ejeção reduzida; exige monitorar K⁺ e creatinina.", alerta: "Solicitada pela cardiologia" },
    { id: "olmesartana", nome: "Olmesartana 20 mg (comprimido)", classe: "BRA", necessidade: "has", rename: false, emUso: false, precoUnit: 1.20, unidMes: 30, usuarios: 350, migraDe: "losartana", evidencia: "BRA: efeito anti-hipertensivo semelhante ao da losartana, sem superioridade demonstrada em desfechos.", alerta: "Solicitada pela cardiologia; fora da RENAME" },
    { id: "rosuvastatina", nome: "Rosuvastatina 10 mg (comprimido)", classe: "Estatina", necessidade: "dislip", rename: false, emUso: false, precoUnit: 0.60, unidMes: 30, usuarios: 200, migraDe: "sinvastatina", evidencia: "Estatina mais potente por miligrama; a maioria dos pacientes atinge a meta com a estatina do elenco em dose ajustada.", alerta: "Solicitada pela clínica médica; fora da RENAME" },
    { id: "sitagliptina", nome: "Sitagliptina 100 mg (comprimido)", classe: "Inibidor de DPP-4", necessidade: "dm2-2", rename: false, emUso: false, precoUnit: 3.20, unidMes: 30, usuarios: 120, migraDe: "glibenclamida", evidencia: "Reduz a HbA1c de modo semelhante à sulfonilureia, com menos hipoglicemia, sem benefício cardiovascular demonstrado e a custo muito maior.", alerta: "Solicitada pela endocrinologia; fora da RENAME" },
  ],
};

// ── Caso 2: Programação ─────────────────────────────────────────────────────────────────────────────────────────────
const programacaoItens: ProgItem[] = [
  {
    id: "losartana", nome: "Losartana potássica 50 mg", apresentacao: "comprimido", unidade: "comprimido", precoUnit: 0.08, trMeses: 1, validadeMeses: 24,
    estoqueInicial: 66000, validadeEstoqueInicial: 14,
    consumoHist: [58000, 58500, 59000, 59200, 59500, 60000, 60000, 60500, 61000, 61200, 61500, 62000],
    diasFalta: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    demanda: [62500, 62800, 63000, 63200, 63500, 63800, 64000, 64200, 64500, 64700, 65000, 65200],
    capacidade: 400000,
    nota: "Uso contínuo, consumo estável e crescendo cerca de 0,4% ao mês.",
  },
  {
    id: "amoxicilina", nome: "Amoxicilina 500 mg", apresentacao: "cápsula", unidade: "cápsula", precoUnit: 0.32, trMeses: 2, validadeMeses: 24,
    estoqueInicial: 36000, validadeEstoqueInicial: 18,
    consumoHist: [15000, 14500, 15500, 16000, 19000, 19500, 18000, 20000, 16500, 15000, 14500, 15000],
    diasFalta: [0, 0, 0, 0, 4, 16, 20, 12, 0, 0, 0, 0],
    demanda: [15500, 15000, 16000, 16500, 24000, 30000, 33000, 28000, 20000, 16000, 15000, 15500],
    capacidade: 200000,
    nota: "Faltou em maio, junho, julho e agosto do ano passado (4, 16, 20 e 12 dias sem estoque).",
  },
  {
    id: "insulina", nome: "Insulina humana NPH 100 UI/mL", apresentacao: "frasco de 10 mL", unidade: "frasco", precoUnit: 22, trMeses: 2, validadeMeses: 8,
    estoqueInicial: 5800, validadeEstoqueInicial: 6,
    consumoHist: [2300, 2320, 2350, 2380, 2400, 2430, 2460, 2490, 2520, 2550, 2580, 2610],
    diasFalta: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    demanda: [2640, 2670, 2700, 2730, 2760, 2790, 2820, 2850, 2880, 2910, 2940, 2970],
    capacidade: 10000,
    nota: "Cadeia de frio: a câmara comporta 10.000 frascos. O fornecedor costuma entregar lotes com 8 meses de validade restante.",
  },
];

// ── Caso 3: Aquisição ───────────────────────────────────────────────────────────────────────────────────────────────
const aquisicao: AquisicaoCaso = {
  itemNome: "Insulina humana NPH 100 UI/mL (frasco 10 mL)",
  cotacoes: [
    { id: "c1", fonte: "Banco de Preços em Saúde (pregão de outro município, há 2 meses)", valor: 19.8, detalhe: "Compra pública recente, quantidade parecida" },
    { id: "c2", fonte: "Ata de registro de preços vigente do Estado", valor: 20.4, detalhe: "Ata em vigor" },
    { id: "c3", fonte: "Painel de Preços do governo federal (contratação similar, há 6 meses)", valor: 21.1, detalhe: "Contratação pública recente" },
    { id: "c4", fonte: "Cotação direta com fornecedor A", valor: 23.9, detalhe: "Proposta formal por e-mail" },
    { id: "c5", fonte: "Cotação direta com fornecedor B", valor: 24.5, detalhe: "Proposta formal por e-mail" },
    { id: "c6", fonte: "Tabela CMED (preço máximo de venda ao governo)", valor: 41.0, detalhe: "Teto legal do preço, não é preço praticado" },
    { id: "c7", fonte: "Compra emergencial de outro órgão (dispensa por emergência)", valor: 31.5, detalhe: "Contratação feita às pressas, sem competição" },
    { id: "c8", fonte: "Ata de registro de preços vencida há 2 anos", valor: 12.6, detalhe: "Preço de dois anos atrás" },
  ],
  propostas: [
    { id: "p1", fornecedor: "Distribuidora Alfa Saúde", precoUnit: 17.9, validadeMeses: 12, prazoEntregaDias: 20, documentacaoOk: false, pendencia: "Autorização de Funcionamento (AFE) vencida" },
    { id: "p2", fornecedor: "Beta Farma", precoUnit: 19.4, validadeMeses: 6, prazoEntregaDias: 15, documentacaoOk: true },
    { id: "p3", fornecedor: "Ômega Distribuidora", precoUnit: 19.95, validadeMeses: 14, prazoEntregaDias: 45, documentacaoOk: true },
    { id: "p4", fornecedor: "Gama Medicamentos", precoUnit: 20.2, validadeMeses: 15, prazoEntregaDias: 15, documentacaoOk: true },
    { id: "p5", fornecedor: "Delta Hospitalar", precoUnit: 20.9, validadeMeses: 18, prazoEntregaDias: 10, documentacaoOk: true },
  ],
  edital: { validadeMinimaMeses: 12, prazoMaximoEntregaDias: 30 },
  parcelamento: { quantidadeAnual: 33600, precoUnit: 20.2, freteEntrega: 3600, taxaManutencaoMes: 0.01, validadeMeses: 15, mesesSeguranca: 0.5, capacidade: 10000 },
};

// ── Caso 4: Armazenamento ───────────────────────────────────────────────────────────────────────────────────────────
const armazenamento: ExcursaoCaso = {
  tempInicialC: 5,
  taxaSubidaCporH: 1,
  ambienteC: 30,
  retornoEnergiaH: 28,
  taxaResfriamentoCporH: 1.2,
  limiteSuperiorC: 8,
  limiteInferiorC: 2,
  chegadaEquipeH: 7,
  itens: [
    { id: "insulina", nome: "Insulina humana NPH 100 UI/mL (lote 24A115)", quantidade: 2100, unidade: "frascos", valorUnit: 22, dado: { tipo: "limite", tempMaxC: 25, descricao: "Documento do fabricante deste lote: pode ficar fora da refrigeração, a até 25 °C, por até 28 dias." } },
    { id: "vacina", nome: "Vacina hepatite B (imunobiológico do PNI, frasco de 10 doses)", quantidade: 180, unidade: "frascos", valorUnit: 48, dado: { tipo: "pni", descricao: "Imunobiológico do PNI: qualquer exposição fora de 2 a 8 °C exige avaliação pela instância estadual antes do uso." } },
    { id: "ocitocina", nome: "Ocitocina 5 UI/mL (ampola de 1 mL, lote 0392B)", quantidade: 800, unidade: "ampolas", valorUnit: 2.3, dado: { tipo: "semDado", descricao: "Rótulo: conservar entre 2 e 8 °C. O fabricante ainda não respondeu ao pedido de dados de estabilidade." } },
  ],
};

// ── Caso 5: Distribuição ────────────────────────────────────────────────────────────────────────────────────────────
const distribuicao: DistribuicaoCaso = {
  itemNome: "Amoxicilina 500 mg (cápsula)",
  unidade: "cápsulas",
  disponivelCAF: 40000,
  coberturaAlvoMeses: 1.5,
  limiteRiscoDias: 30,
  passo: 100,
  ubs: [
    { id: "central", nome: "UBS Central", cmm: 12000, saldo: 3000, capacidade: 30000 },
    { id: "jardim", nome: "UBS Jardim", cmm: 8000, saldo: 6000, capacidade: 20000 },
    { id: "rural", nome: "UBS Rural Norte", cmm: 3000, saldo: 500, capacidade: 6000, nota: "Armário pequeno; a entrega chega a 60 km de estrada" },
    { id: "vila", nome: "UBS Vila Nova", cmm: 9000, saldo: 1500, capacidade: 20000 },
    { id: "santa", nome: "UBS Santa Rita", cmm: 5000, saldo: 4500, capacidade: 12000 },
    { id: "alto", nome: "UBS Bairro Alto", cmm: 7000, saldo: 700, capacidade: 15000 },
  ],
};

// ── Caso 6: Dispensação ─────────────────────────────────────────────────────────────────────────────────────────────
const dispensacao: DispensacaoCaso = {
  hoje: "2026-08-14",
  paciente: "Antônio Ferreira, 58 anos, hipertenso, com faringoamigdalite",
  receitaEmitidaEm: "2026-07-30",
  prescritor: "Dra. Helena Duarte (médica da UBS Central)",
  regraLocal: "Protocolo municipal: medicamentos de uso contínuo são dispensados para 30 dias por vez.",
  itens: [
    {
      id: "amoxicilina", nome: "Amoxicilina 500 mg (cápsula)", posologia: "1 cápsula de 8/8 h por 7 dias", dosePorTomada: 1, vezesDia: 3, dias: 7, antimicrobiano: true,
      lotes: [
        { id: "am-1", lote: "AMX-2318", validade: "2027-01-31", saldo: 1200 },
        { id: "am-2", lote: "AMX-2277", validade: "2026-11-30", saldo: 300 },
      ],
    },
    {
      id: "enalapril", nome: "Enalapril 10 mg (comprimido)", posologia: "1 comprimido de 12/12 h, uso contínuo", dosePorTomada: 1, vezesDia: 2, dias: 30, usoContinuo: true,
      lotes: [
        { id: "en-0", lote: "ENL-0912", validade: "2026-08-31", saldo: 400 },
        { id: "en-1", lote: "ENL-1045", validade: "2026-10-31", saldo: 800 },
        { id: "en-2", lote: "ENL-1188", validade: "2027-04-30", saldo: 5000 },
      ],
    },
    {
      id: "paracetamol", nome: "Paracetamol 500 mg (comprimido)", posologia: "1 comprimido de 6/6 h se dor ou febre, por 3 dias", dosePorTomada: 1, vezesDia: 4, dias: 3,
      lotes: [],
      observacaoEstoque: "Sem estoque desde 10/08. Pedido em trânsito, chegada prevista para 18/08.",
    },
  ],
};

export const BUILT_IN_CASES: CasoCadeia[] = [
  {
    title: "Caso 1: Revisão da REMUME — hipertensão, diabetes e dislipidemia",
    difficulty: "Médio",
    etapa: "selecao",
    patient: { name: "Comissão de Farmácia e Terapêutica", diagnosis: "Seleção · Elenco da linha de cuidado com R$ 240 mil por ano" },
    scenario: "Você é o farmacêutico responsável técnico da Secretaria Municipal de Saúde de Vale do Sol (60 mil habitantes, 8 UBS e uma Central de Abastecimento Farmacêutico) e secretário(a) executivo(a) da Comissão de Farmácia e Terapêutica (CFT). Na reunião de hoje a CFT revisa o elenco (REMUME) da linha de cuidado de hipertensão, diabetes tipo 2 e dislipidemia, que atende 2.400 hipertensos, 900 diabéticos e 700 pessoas com indicação de estatina. O orçamento anual do município para esses medicamentos é de R$ 240.000,00. Chegaram quatro solicitações de inclusão: espironolactona 25 mg (cardiologia), olmesartana 20 mg (cardiologia), rosuvastatina 10 mg (clínica médica) e sitagliptina 100 mg (endocrinologia). Os preços são os do último pregão e são ilustrativos. Cabe a você montar o parecer técnico da CFT.",
    selecao,
    expectedDrugs: ["Espironolactona 25 mg (comprimido)"],
    clinicalTip: "A seleção parte da necessidade da população, não do pedido de quem prescreve: evidência de desfecho, RENAME, custo-tratamento e impacto orçamentário decidem. O que não entra no elenco pode ter um fluxo de exceção com critérios clínicos claros.",
    references: [
      "Brasil. Ministério da Saúde. Assistência Farmacêutica na Atenção Básica: instruções técnicas para a sua organização. 2ª ed. Brasília, 2006",
      "Barroso WKS et al. Diretrizes Brasileiras de Hipertensão Arterial – 2020. Arq Bras Cardiol 2021;116(3):516-658",
      "Brasil. Decreto nº 7.508/2011 e Relação Nacional de Medicamentos Essenciais (RENAME) vigente",
    ],
  },
  {
    title: "Caso 2: Programação anual da CAF — losartana, amoxicilina e insulina",
    difficulty: "Difícil",
    etapa: "programacao",
    patient: { name: "Central de Abastecimento Farmacêutica", diagnosis: "Programação · CMM, estoque de segurança e intervalo de compra" },
    scenario: "Você assumiu a programação da Central de Abastecimento Farmacêutica (CAF) de Vale do Sol. Para cada item você tem o consumo registrado nos 12 meses anteriores, os dias sem estoque em cada mês, o tempo de reposição (do pedido ao recebimento), a validade com que o fornecedor entrega, o estoque atual e a capacidade de armazenamento. Escolha como calcular o consumo médio mensal (CMM), quantos meses de estoque de segurança manter e de quanto em quanto tempo comprar. A simulação executa os 12 meses seguintes contra a demanda real, que você não conhece de antemão, e mostra o estoque mês a mês, os dias de ruptura e as perdas por vencimento.",
    programacao: { itens: programacaoItens },
    expectedDrugs: ["Amoxicilina 500 mg"],
    clinicalTip: "CMM bruto subestima a demanda de quem ficou sem estoque: corrija pelos dias de desabastecimento. Estoque de segurança e intervalo de compra têm de caber na validade do lote e na capacidade da câmara.",
    references: [
      "Marin N et al. Assistência Farmacêutica para Gerentes Municipais. Rio de Janeiro: OPAS/OMS, 2003",
      "Management Sciences for Health. MDS-3: Managing Access to Medicines and Health Technologies. 2012",
      "Brasil. Ministério da Saúde. Assistência Farmacêutica na Atenção Básica: instruções técnicas para a sua organização. 2ª ed. 2006",
    ],
  },
  {
    title: "Caso 3: Pregão de insulina NPH — preços, propostas e entregas",
    difficulty: "Difícil",
    etapa: "aquisicao",
    patient: { name: "Setor de Compras da Secretaria", diagnosis: "Aquisição · Referência de preço, julgamento e parcelamento" },
    scenario: "A programação apontou a necessidade de 33.600 frascos de insulina humana NPH para os próximos 12 meses (2.800 por mês). A Secretaria fará um pregão eletrônico com registro de preços. Você apoia tecnicamente o pregoeiro em três frentes: (1) montar o preço de referência a partir de oito cotações; (2) julgar as cinco propostas recebidas, sabendo que o edital exige validade mínima de 12 meses na entrega e prazo máximo de 30 dias; (3) definir em quantas entregas parceladas a quantidade anual será entregue, sabendo que a câmara fria comporta 10.000 frascos, que cada entrega custa R$ 3.600 de transporte refrigerado e que manter estoque custa 1% do valor ao mês.",
    aquisicao,
    expectedDrugs: ["Insulina humana NPH 100 UI/mL (frasco 10 mL)"],
    clinicalTip: "Preço de referência exige cotações comparáveis e recentes; o menor preço só vale entre propostas habilitadas e que cumprem o edital; parcelar reduz estoque e vencimento, mas cada entrega tem custo.",
    references: [
      "Brasil. Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos)",
      "Brasil. Instrução Normativa SEGES/ME nº 65/2021 (pesquisa de preços)",
      "Brasil. Ministério da Saúde. Banco de Preços em Saúde (BPS)",
    ],
  },
  {
    title: "Caso 4: Falha de energia na câmara fria da CAF",
    difficulty: "Médio",
    etapa: "armazenamento",
    patient: { name: "Câmara fria da CAF municipal", diagnosis: "Armazenamento · Excursão de temperatura e conduta por item" },
    scenario: "À meia-noite (hora 0 do registro) a energia da CAF caiu e o gerador não partiu. O data logger da câmara fria, que estava a 5 °C, passou a registrar elevação contínua. O alarme foi disparado quando a temperatura cruzou 8 °C e você, chamado(a) de casa, chegou às 7 h. A concessionária promete o retorno da energia, mas não informa a hora. Você precisa decidir a que horas transferir os produtos para o refrigerador reserva e o que fazer com cada lote afetado: 2.100 frascos de insulina NPH, 180 frascos de vacina contra hepatite B e 800 ampolas de ocitocina. A energia acabou voltando na hora 28.",
    armazenamento,
    expectedDrugs: ["Quarentena e consulta ao fabricante"],
    clinicalTip: "A decisão sobre um produto termolábil depende do dado de estabilidade, não da aparência: dentro da tolerância declarada, libera com registro; sem dado ou fora dele, quarentena identificada e consulta; descarte é decisão de quem tem o dado.",
    references: [
      "Brasil. Anvisa. RDC nº 430/2020 (Boas Práticas de Distribuição, Armazenagem e de Transporte de Medicamentos)",
      "Brasil. Ministério da Saúde. Manual de Rede de Frio do Programa Nacional de Imunizações. 5ª ed. 2017",
    ],
  },
  {
    title: "Caso 5: Amoxicilina em julho — rateio entre as UBS",
    difficulty: "Médio",
    etapa: "distribuicao",
    patient: { name: "Distribuição da CAF às UBS", diagnosis: "Distribuição · Rateio de estoque insuficiente" },
    scenario: "É julho, pico das infecções respiratórias. A CAF recebeu 40.000 cápsulas de amoxicilina 500 mg de uma compra emergencial e é tudo o que há para as próximas semanas. As seis UBS têm consumo mensal (CMM), saldo atual e capacidade de armazenamento diferentes. O ressuprimento é mensal, então cada unidade precisa terminar a distribuição com pelo menos 30 dias de cobertura; a meta ideal é 1,5 mês (45 dias), que somando todas as unidades exigiria 49.800 cápsulas. Distribua as 40.000 cápsulas entre as UBS.",
    distribuicao,
    expectedDrugs: ["Proporcional ao déficit"],
    clinicalTip: "Rateio justo olha o que falta a cada unidade (meta menos saldo), não só o quanto ela consome nem o quanto cada uma recebeu antes.",
    references: [
      "Brasil. Ministério da Saúde. Assistência Farmacêutica na Atenção Básica: instruções técnicas para a sua organização. 2ª ed. 2006",
      "Marin N et al. Assistência Farmacêutica para Gerentes Municipais. OPAS/OMS, 2003",
    ],
  },
  {
    title: "Caso 6: Balcão da UBS — receita, lote e falta de estoque",
    difficulty: "Fácil",
    etapa: "dispensacao",
    patient: { name: "Farmácia da UBS Central", diagnosis: "Dispensação · Receita, lote (PVPS) e quantidade" },
    scenario: "Você está no balcão da farmácia da UBS Central em 14/08/2026. O Sr. Antônio Ferreira (58 anos, hipertenso, com faringoamigdalite) apresenta uma receita com três itens, emitida em 30/07/2026 pela Dra. Helena Duarte. Para cada item, decida a ação, o lote e a quantidade a dispensar. Regra do protocolo municipal: medicamentos de uso contínuo são dispensados para 30 dias por vez.",
    dispensacao,
    expectedDrugs: ["Enalapril 10 mg (comprimido)"],
    clinicalTip: "Dispensar é validar antes de entregar: receita, disponibilidade, lote que cobre o tratamento e quantidade. Ausência de item não autoriza trocar o princípio ativo por conta própria.",
    references: [
      "Brasil. Anvisa. RDC nº 471/2021 (antimicrobianos: prescrição e dispensação)",
      "Brasil. Anvisa. RDC nº 44/2009 (Boas Práticas Farmacêuticas para farmácias e drogarias)",
      "Brasil. Lei nº 9.787/1999 (medicamentos genéricos e intercambialidade)",
    ],
  },
];
