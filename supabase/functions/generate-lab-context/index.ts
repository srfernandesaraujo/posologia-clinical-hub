import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LabConfig {
  systemPrompt: string;
  tool: any;
  parseResult?: (args: any) => any;
}

function getLabConfig(labType: string, theme?: string): LabConfig {
  const themeHint = theme
    ? `\nTema solicitado: "${theme}". Gere dados relacionados a este tema.`
    : "\nEscolha um tema criativo e cientificamente desafiador.";

  switch (labType) {
    case "farmacos":
      return {
        systemPrompt: `Você é um pesquisador farmacêutico expert em drug design. Gere dados REALISTAS para um pipeline de desenvolvimento de fármacos.${themeHint}
Regras: ID UniProt fictício (PXXXXX), MW 150-600, LogP -1 a 5, HBD 0-5, HBA 0-10 (Lipinski).`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate drug development context", parameters: { type: "object", required: ["target", "drugProperties"], properties: {
          target: { type: "object", required: ["id", "name", "category", "relatedDrugs"], properties: { id: { type: "string" }, name: { type: "string" }, category: { type: "string" }, relatedDrugs: { type: "string" } } },
          drugProperties: { type: "object", required: ["mw", "logP", "hbd", "hba"], properties: { mw: { type: "number" }, logP: { type: "number" }, hbd: { type: "number" }, hba: { type: "number" } } }
        } } } }
      };

    case "microbiologia":
      return {
        systemPrompt: `Você é um microbiologista clínico. Gere dados REALISTAS para um antibiograma.${themeHint}
Gere bactéria clinicamente relevante com MIC e breakpoints CLSI para os 6 antibióticos: amoxicilina, ciprofloxacino, vancomicina, meropenem, gentamicina, sulfametoxazol. MIC coerente com mecanismos de resistência. Gram-negativos têm MIC alto para vancomicina.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate microbiology context", parameters: { type: "object", required: ["bacteria", "resistanceData"], properties: {
          bacteria: { type: "object", required: ["id", "name", "gram", "habitat", "resistance"], properties: { id: { type: "string" }, name: { type: "string" }, gram: { type: "string" }, habitat: { type: "string" }, resistance: { type: "string" } } },
          resistanceData: { type: "array", items: { type: "object", required: ["antibioticId", "mic", "breakpointS", "breakpointR"], properties: { antibioticId: { type: "string" }, mic: { type: "number" }, breakpointS: { type: "number" }, breakpointR: { type: "number" } } } }
        } } } }
      };

    case "toxicologia":
      return {
        systemPrompt: `Você é um toxicologista. Gere dados REALISTAS para ensaio toxicológico.${themeHint}
HillN 1.2-4.0, LD50 em mg/kg (realista), ED50 < LD50. Unidade sempre mg/kg.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate toxicology context", parameters: { type: "object", required: ["substance"], properties: {
          substance: { type: "object", required: ["id", "name", "hillN", "ld50", "ed50", "unit", "mechanism", "clinical"], properties: { id: { type: "string" }, name: { type: "string" }, hillN: { type: "number" }, ld50: { type: "number" }, ed50: { type: "number" }, unit: { type: "string" }, mechanism: { type: "string" }, clinical: { type: "string" } } }
        } } } }
      };

    case "farmacogenomica":
      return {
        systemPrompt: `Você é um farmacogeneticista. Gere dados REALISTAS para estudo farmacogenômico.${themeHint}
Enzima CYP real, tipo prodrug ou drug, PK: ka 0.3-2.0 h⁻¹, ke 0.01-0.5 h⁻¹, Vd 5-1000 L, F 0.1-1.0.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate pharmacogenomics context", parameters: { type: "object", required: ["drug"], properties: {
          drug: { type: "object", required: ["id", "name", "enzyme", "type", "baseParams"], properties: { id: { type: "string" }, name: { type: "string" }, enzyme: { type: "string" }, type: { type: "string" }, baseParams: { type: "object", required: ["ka", "ke", "vd", "f"], properties: { ka: { type: "number" }, ke: { type: "number" }, vd: { type: "number" }, f: { type: "number" } } } } }
        } } } }
      };

    case "estabilidade":
      return {
        systemPrompt: `Você é cientista farmacêutico de estabilidade. Gere dados REALISTAS.${themeHint}
k25 0.0005-0.03, ordem 0 ou 1, Ea 50-120 kJ/mol, concentração inicial geralmente 100%.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate stability context", parameters: { type: "object", required: ["formulation"], properties: {
          formulation: { type: "object", required: ["id", "name", "k25", "order", "ea", "initialConc"], properties: { id: { type: "string" }, name: { type: "string" }, k25: { type: "number" }, order: { type: "number" }, ea: { type: "number" }, initialConc: { type: "number" } } }
        } } } }
      };

    case "controle-qualidade":
      return {
        systemPrompt: `Você é analista de controle de qualidade farmacêutico. Gere dados REALISTAS.${themeHint}
Medicamento com concentração declarada realista (mg) e especificação farmacopeica.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate QC context", parameters: { type: "object", required: ["analyte"], properties: {
          analyte: { type: "object", required: ["id", "name", "trueConc", "unit", "spec"], properties: { id: { type: "string" }, name: { type: "string" }, trueConc: { type: "number" }, unit: { type: "string" }, spec: { type: "string" } } }
        } } } }
      };

    case "epidemiologia":
      return {
        systemPrompt: `Você é epidemiologista. Gere dados REALISTAS para estudo farmacoepidemiológico.${themeHint}
Exposição com OR base 1.2-5.0, desfecho com prevalência 0.01-0.20. Associação cientificamente plausível.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate epidemiology context", parameters: { type: "object", required: ["exposure", "outcome"], properties: {
          exposure: { type: "object", required: ["id", "name", "baseOR"], properties: { id: { type: "string" }, name: { type: "string" }, baseOR: { type: "number" } } },
          outcome: { type: "object", required: ["id", "name", "prevalence"], properties: { id: { type: "string" }, name: { type: "string" }, prevalence: { type: "number" } } }
        } } } }
      };

    case "biotecnologia":
      return {
        systemPrompt: `Você é biotecnologista de expressão proteica recombinante. Gere dados REALISTAS.${themeHint}
Proteína com MW kDa realista, temp ótima 16-42°C, IPTG 0.05-2.0 mM. Vetor com promotor, tag e eficiência 0.7-1.2. Cepa com eficiência 0.7-1.2.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate biotech context", parameters: { type: "object", required: ["gene", "vector", "strain"], properties: {
          gene: { type: "object", required: ["id", "name", "mw", "optimalTemp", "optimalIPTG"], properties: { id: { type: "string" }, name: { type: "string" }, mw: { type: "number" }, optimalTemp: { type: "number" }, optimalIPTG: { type: "number" } } },
          vector: { type: "object", required: ["id", "name", "size", "promoter", "tag", "efficiency"], properties: { id: { type: "string" }, name: { type: "string" }, size: { type: "number" }, promoter: { type: "string" }, tag: { type: "string" }, efficiency: { type: "number" } } },
          strain: { type: "object", required: ["id", "name", "efficiency"], properties: { id: { type: "string" }, name: { type: "string" }, efficiency: { type: "number" } } }
        } } } }
      };

    case "modelagem-molecular":
      return {
        systemPrompt: `Você é um químico medicinal. Gere um composto farmacêutico REAL para estudo de modelagem molecular.${themeHint}
Retorne um composto existente com SMILES real, CID PubChem, propriedades moleculares e sugestões de modificações estruturais.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate molecular modeling context", parameters: { type: "object", required: ["compound"], properties: {
          compound: { type: "object", required: ["name", "smiles", "cid", "mw", "xLogP", "hbd", "hba", "tpsa", "formula", "suggestions"], properties: {
            name: { type: "string" }, smiles: { type: "string" }, cid: { type: "number" }, mw: { type: "number" },
            xLogP: { type: "number" }, hbd: { type: "number" }, hba: { type: "number" }, tpsa: { type: "number" },
            formula: { type: "string" }, suggestions: { type: "string", description: "2-3 suggested modifications to explore" }
          } }
        } } } }
      };

    case "pericia-forense":
      return {
        systemPrompt: `Você é perito criminal forense. Gere um CENÁRIO CRIMINAL COMPLETO.${themeHint}

Retorne JSON válido (ForensicScenario) com: id, title, difficulty, narrative, crimeScene, victim {name,age,description}, suspects[3] {name,relation,description}, samples[3] {id:"s1"|"s2"|"s3",label,description},
chemicalAnalysis {sampleId:"s1", spectrum[~12 {mz,intensity 0-100}], correctSubstance, correctBasePeak, referenceTable[5 {substance,basePeak,fragments[3]}]},
toxicologyAnalysis {matrices:["Sangue","Urina","Conteúdo Estomacal"], correctMatrix, reagents[3], correctReagent, chromatogram[~15 {time 0-8,absorbance}], noisyChromatogram[mesma mas ruidosa], correctRetentionTime, retentionRanges[5 {className,rangeMin,rangeMax,substances[]}], correctSubstance, correctClass},
dnaAnalysis {sceneSample {label,peaks[5 loci vWA/TH01/TPOX/D13S317/FGA {locus,alleles[2]}]}, suspects[3 perfis], correctSuspectIndex 0-2, degradedLoci[], mixtureLoci[]},
correctCulpritIndex (=correctSuspectIndex), solutionExplanation, chemicalExplanation, toxExplanation, dnaExplanation.
CULPADO deve ter DNA match PERFEITO. Outros suspeitos com sobreposição parcial.`,
        tool: { type: "function", function: { name: "generate_context", description: "Generate forensic scenario", parameters: { type: "object", required: ["scenario_json"], properties: {
          scenario_json: { type: "string", description: "Complete ForensicScenario as valid JSON string" }
        } } } },
        parseResult: (args: any) => {
          try { return JSON.parse(args.scenario_json); }
          catch { throw new Error("Failed to parse forensic scenario JSON"); }
        }
      };

    default:
      throw new Error(`Unknown lab type: ${labType}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { labType, theme, userId } = await req.json();

    if (!labType) {
      return new Response(JSON.stringify({ error: "labType is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = getLabConfig(labType, theme);

    const { data } = await callAI({
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: theme
          ? `Gere um contexto de pesquisa sobre: ${theme}`
          : "Gere um contexto de pesquisa criativo e cientificamente rigoroso." },
      ],
      tools: [config.tool],
      tool_choice: { type: "function", function: { name: "generate_context" } },
      temperature: 0.8,
      userId: userId || undefined,
      promptType: "lab-context-generation",
    });

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    let context = JSON.parse(toolCall.function.arguments);
    if (config.parseResult) context = config.parseResult(context);

    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-lab-context]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
