import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetProtein, compounds, userId } = await req.json();

    if (!targetProtein || !compounds || compounds.length === 0) {
      return new Response(JSON.stringify({ error: "Alvo proteico e pelo menos um composto são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compoundDescriptions = compounds.map((c: any, i: number) => {
      return `Composto ${i + 1} (${c.label}):
  Nome: ${c.name || "Desconhecido"}
  SMILES: ${c.smiles}
  MW: ${c.mw ?? "N/A"} g/mol
  LogP: ${c.logP ?? "N/A"}
  HBD: ${c.hbd ?? "N/A"}, HBA: ${c.hba ?? "N/A"}
  TPSA: ${c.tpsa ?? "N/A"} Å²
  ΔG estimado (determinístico): ${c.deltaG ?? "N/A"} kcal/mol
  Ki estimado: ${c.ki ?? "N/A"} nM`;
    }).join("\n\n");

    const systemPrompt = `Você é um especialista em modelagem molecular e docking computacional.
Analise a interação entre compostos candidatos e um alvo proteico, fornecendo uma avaliação comparativa detalhada.

Regras:
- Considere as propriedades moleculares (MW, LogP, TPSA, HBD/HBA) para avaliar a complementaridade com o alvo
- Avalie a energia de ligação estimada e a constante de inibição
- Compare os compostos entre si, destacando qual tem o melhor perfil
- Considere aspectos como: complementaridade de cargas, ligações de hidrogênio potenciais, interações hidrofóbicas, tamanho molecular vs. cavidade do sítio ativo
- Use linguagem científica mas acessível em português
- Seja específico sobre os mecanismos moleculares`;

    const userPrompt = `ALVO PROTEICO:
Nome: ${targetProtein.name}
Accession: ${targetProtein.accession}
Gene: ${targetProtein.gene}
Organismo: ${targetProtein.organism}
Função: ${targetProtein.function}
PDB: ${targetProtein.pdbId || "N/A"}

COMPOSTOS PARA DOCKING:
${compoundDescriptions}

Analise a afinidade de cada composto pelo alvo e compare-os.`;

    const { data } = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "docking_analysis",
          description: "Return structured comparative docking analysis",
          parameters: {
            type: "object",
            required: ["compound_analyses", "ranking", "comparative_summary"],
            properties: {
              compound_analyses: {
                type: "array",
                description: "Analysis for each compound",
                items: {
                  type: "object",
                  required: ["label", "affinity_score", "binding_mode", "strengths", "weaknesses", "refined_deltaG", "refined_ki"],
                  properties: {
                    label: { type: "string", description: "Compound label (Original, Modificado, Análogo)" },
                    affinity_score: { type: "number", description: "Estimated affinity score 0-100 (100 = best)" },
                    binding_mode: { type: "string", description: "Description of how the molecule likely interacts with the target (2-3 sentences)" },
                    strengths: { type: "array", items: { type: "string" }, description: "Strengths of this compound for the target (1-3 items)" },
                    weaknesses: { type: "array", items: { type: "string" }, description: "Weaknesses of this compound for the target (1-3 items)" },
                    refined_deltaG: { type: "number", description: "AI-refined ΔG estimate in kcal/mol" },
                    refined_ki: { type: "string", description: "AI-refined Ki estimate with units" },
                  },
                  additionalProperties: false,
                },
              },
              ranking: {
                type: "array",
                items: { type: "string" },
                description: "Labels ordered from best to worst candidate",
              },
              comparative_summary: {
                type: "string",
                description: "2-4 sentence comparative summary explaining which compound is the best candidate and why, in Portuguese",
              },
            },
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "docking_analysis" } },
      temperature: 0.3,
      userId: userId || undefined,
      promptType: "docking-comparativo",
    });

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured analysis");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[docking-comparativo]", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Limite") ? 429 : msg.includes("Créditos") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
