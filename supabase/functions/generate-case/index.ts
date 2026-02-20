import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SIMULATOR_PROMPTS: Record<string, string> = {
  prm: `Gere um caso clínico COMPLETO para o Simulador de PRM (Problemas Relacionados a Medicamentos).
O caso deve conter:
- patient: { name, age, weight, height, sex }
- history: { diseases (array), mainComplaint, allergies (array), creatinineClearance (number or null), vitalSigns: { bp, hr, temp, spo2 } }
- prescription: array de { drug, dose, route, frequency }
- answers: array de { drugIndex (0-based), hasPRM (boolean), type (string: "Seguranca"|"Efetividade"|"Indicacao"|"Adesao"|null), justification (string) }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo do caso

Inclua pelo menos 2 PRMs reais baseados em evidências. Varie entre idosos, pediatria, gestantes, polimedicados e comorbidades. Use farmacologia realista.`,

  antimicrobianos: `Gere um caso clínico COMPLETO para o Simulador de Antimicrobial Stewardship.
O caso deve conter:
- patient: { name, age, weight, comorbidities (array), allergies (array), vitalSigns: { bp, hr, temp, spo2 } }
- day1: { clinicalDescription, suspectedDiagnosis }
- day3: { evolution, cultureResult, organism, antibiogram: array de { antibiotic, result ("S"|"R"), mic (string) } }
- expectedDay1: { antibiotics (array of strings), cultures (array of strings), justification }
- expectedDay3: { action ("descalonar"|"manter"|"trocar"), newAntibiotic (string or null), stopAntibiotics (array), justification }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use patógenos reais, antibiogramas coerentes. Varie entre ITU, PAC, infecção de pele, meningite, etc.`,

  tdm: `Gere um caso clínico COMPLETO para o Simulador de TDM (Monitoramento Terapêutico de Fármacos).
O caso deve conter:
- patient: { name, age, weight, sex, serumCreatinine, creatinineClearance }
- infection: descrição da infecção/indicação
- currentPrescription: { drug, dose, interval, route }
- tdmResult: { troughLevel (number), peakLevel (number or null), unit (string) }
- therapeuticRange: { troughMin, troughMax, peakMin (or null), peakMax (or null) }
- expected: { newDose, newInterval, holdDose (boolean), justification }
- pharmacokineticData: { halfLife, vd, elimination } para gráfico
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use fármacos como Vancomicina, Gentamicina, Fenitoína, Lítio, Digoxina. Varie cenários.`,

  acompanhamento: `Gere um caso clínico COMPLETO para o Simulador de Acompanhamento Farmacoterapêutico.
O caso deve conter:
- patient: { name, age, diagnoses (array) }
- consultations: array de pelo menos 3 consultas, cada uma com:
  - month: número do mês (0, 3, 6)
  - symptoms: descrição clínica
  - labs: objeto com marcadores { name, value, unit, target, status ("normal"|"high"|"low") }
  - currentPrescription: array de { drug, dose, frequency }
  - expected: { actions: array de { drug, action ("manter"|"aumentar"|"reduzir"|"suspender"|"adicionar"), newDose (or null), justification } }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use doenças crônicas reais: DM2, HAS, dislipidemia, hipotireoidismo, IC, asma. Exames coerentes.`,

  insulina: `Gere um caso clínico COMPLETO para o Simulador de Dose de Insulina (Koda-Kimble).
O caso deve conter:
- patient: { name, age, weight, sex, diagnosis, hba1c, fastingGlucose, bp, lipidProfile: { ldl, hdl, tg }, clinicalSummary }
- glycemicProfile: array de 4 números (07h, 12h, 17h, 23h em mg/dL)
- initialTDD: dose total diária sugerida (0.45 * peso)
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Varie entre DM1 e DM2, diferentes perfis glicêmicos, comorbidades variadas.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { simulator_slug } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = SIMULATOR_PROMPTS[simulator_slug];
    if (!prompt) {
      return new Response(JSON.stringify({ error: `Simulador '${simulator_slug}' não encontrado` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const difficulties = ["Fácil", "Médio", "Difícil"];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const randomSeed = Math.floor(Math.random() * 100000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 1.2,
        messages: [
          { role: "system", content: "Você é um especialista em farmácia clínica e medicina. Gere casos clínicos realistas e educacionais. CADA caso deve ser ÚNICO e DIFERENTE dos anteriores. Use nomes de pacientes brasileiros variados, idades diferentes, cenários clínicos distintos. Retorne APENAS um JSON válido, sem markdown, sem blocos de código." },
          { role: "user", content: `${prompt}\n\nIMPORTANTE: A dificuldade deste caso DEVE ser "${randomDifficulty}". Gere um caso COMPLETAMENTE DIFERENTE e ALEATÓRIO. Use um cenário clínico incomum ou uma combinação única de comorbidades. Seed de aleatoriedade: ${randomSeed}.\n\nRETORNE APENAS O JSON PURO, sem \`\`\`json\`\`\` ou qualquer formatação. O JSON deve ter os campos title, difficulty e todos os dados clínicos no mesmo nível.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("IA não retornou conteúdo");

    // Clean markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(jsonStr);
    const { title, difficulty, ...caseFields } = result;

    console.log("Generated case fields:", Object.keys(caseFields));

    return new Response(JSON.stringify({ 
      case: { 
        title: title || "Caso Clínico Gerado por IA", 
        difficulty: difficulty || "Médio", 
        case_data: caseFields 
      } 
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-case error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
