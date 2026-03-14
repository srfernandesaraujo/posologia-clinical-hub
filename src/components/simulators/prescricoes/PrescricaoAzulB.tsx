interface PrescricaoAzulBProps {
  data: {
    uf?: string;
    numero?: string;
    emitente?: { nome: string; crm: string; endereco: string; telefone: string };
    paciente?: { nome: string; endereco: string };
    medicamento?: string;
    quantidade?: string;
    formaFarmaceutica?: string;
    doseUnidade?: string;
    posologia?: string;
    data?: string;
    assinaturaEmitente?: boolean;
    comprador?: { nome: string; endereco: string; telefone: string; identidade: string; orgaoEmissor: string };
    fornecedor?: string;
    grafica?: string;
  };
}

export default function PrescricaoAzulB({ data }: PrescricaoAzulBProps) {
  const d = data;
  const line = "border-b border-blue-900/40 dark:border-blue-400/40";
  const fieldText = "text-blue-950 dark:text-blue-100";
  const labelText = "text-blue-900/80 dark:text-blue-300/80 font-bold text-[10px] uppercase tracking-wide";

  return (
    <div className="rounded border-2 border-blue-800 dark:border-blue-600 bg-[#c4daf0] dark:bg-blue-950/60 text-[11px] max-w-2xl mx-auto shadow-lg font-sans overflow-hidden">
      {/* === ROW 1: Top 3-column layout === */}
      <div className="grid grid-cols-[1fr_1.5fr_1fr] border-b border-blue-800 dark:border-blue-600">
        {/* Col 1: Title + UF/Número + Data */}
        <div className="border-r border-blue-800 dark:border-blue-600 p-2 space-y-2">
          <p className="font-black text-xs text-blue-950 dark:text-blue-100">NOTIFICAÇÃO DE RECEITA</p>
          <div className="flex items-center gap-1">
            <div className="flex items-center border border-blue-900 dark:border-blue-500 text-[10px]">
              <span className="px-1 text-[8px] text-blue-800 dark:text-blue-300">UF</span>
              <span className="border-l border-blue-900 dark:border-blue-500 px-1 text-[8px] text-blue-800 dark:text-blue-300">NÚMERO</span>
            </div>
          </div>
          <div className="flex items-center border border-blue-900 dark:border-blue-500">
            <span className={`px-2 py-0.5 font-bold text-sm ${fieldText}`}>{d.uf || "___"}</span>
            <span className={`border-l border-blue-900 dark:border-blue-500 px-2 py-0.5 font-bold text-sm flex-1 ${fieldText}`}>{d.numero || "000000"}</span>
            <span className="px-2 py-0.5 font-black text-2xl text-blue-950 dark:text-blue-100 border-l border-blue-900 dark:border-blue-500">B</span>
          </div>
          <div className="pt-1">
            <span className={`${line} inline-block min-w-[20px] ${fieldText}`}>{d.data ? d.data.split("/")[0] : "___"}</span>
            <span className="text-[10px] text-blue-800 dark:text-blue-300"> de </span>
            <span className={`${line} inline-block min-w-[40px] ${fieldText}`}>{d.data ? d.data.split("/")[1] : "________"}</span>
            <span className="text-[10px] text-blue-800 dark:text-blue-300"> de </span>
            <span className={`${line} inline-block min-w-[20px] ${fieldText}`}>{d.data ? d.data.split("/")[2] : "____"}</span>
          </div>
          <div className="pt-3 space-y-1">
            <div className={`${line} w-full`} />
            <p className="text-[9px] text-center text-blue-800 dark:text-blue-300">Assinatura do Emitente
              {d.assinaturaEmitente === false && <span className="text-red-600 dark:text-red-400 font-bold ml-1">(AUSENTE)</span>}
            </p>
          </div>
        </div>

        {/* Col 2: Emitente + Paciente + Endereço */}
        <div className="border-r border-blue-800 dark:border-blue-600 flex flex-col">
          <div className="border-b border-blue-800 dark:border-blue-600 p-2 flex-1">
            <p className={`${labelText} text-center mb-1`}>IDENTIFICAÇÃO DO EMITENTE</p>
            <div className={`text-center space-y-0.5 ${fieldText}`}>
              <p className="font-bold text-xs">{d.emitente?.nome || "________________________"}</p>
              <p>{d.emitente?.crm || "CRM: ______"}</p>
              <p>{d.emitente?.endereco || "________________________"}</p>
              <p>Telefone: {d.emitente?.telefone || "(__)____-____"}</p>
            </div>
          </div>
          <div className="p-2 space-y-2">
            <div>
              <span className="text-[10px] text-blue-800 dark:text-blue-300">Paciente: </span>
              <span className={`${line} inline-block flex-1 ${fieldText}`}>{d.paciente?.nome || ""}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-800 dark:text-blue-300">Endereço: </span>
              <span className={`${line} inline-block flex-1 ${fieldText}`}>{d.paciente?.endereco || ""}</span>
            </div>
          </div>
        </div>

        {/* Col 3: Medicamento fields */}
        <div className="flex flex-col">
          {[
            { label: "Medicamento ou Substância", value: d.medicamento },
            { label: "Quantidade e Forma Farmacêutica", value: d.quantidade ? `${d.quantidade} — ${d.formaFarmaceutica || ""}` : undefined },
            { label: "Dose por Unidade Posológica", value: d.doseUnidade },
            { label: "Posologia", value: d.posologia },
          ].map((f, i) => (
            <div key={i} className={`border-b border-blue-800 dark:border-blue-600 p-1.5 flex-1 ${i === 3 ? "border-b-0" : ""}`}>
              <p className={`${labelText} text-[8px]`}>{f.label}</p>
              <p className={`${fieldText} mt-0.5 font-medium`}>{f.value || ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === ROW 2: Comprador + Fornecedor === */}
      <div className="grid grid-cols-[2fr_1fr] border-t border-blue-800 dark:border-blue-600">
        {/* Comprador */}
        <div className="border-r border-blue-800 dark:border-blue-600 p-2">
          <p className={`${labelText} text-center mb-1`}>IDENTIFICAÇÃO DO COMPRADOR</p>
          <div className="space-y-1">
            <p className={fieldText}>Nome: <span className={line}>{d.comprador?.nome || ""}</span></p>
            <p className={fieldText}>Endereço: <span className={line}>{d.comprador?.endereco || ""}</span></p>
            <p className={fieldText}>Telefone: <span className={line}>{d.comprador?.telefone || ""}</span></p>
            <div className="flex gap-4">
              <p className={fieldText}>Identidade Nº: <span className={line}>{d.comprador?.identidade || ""}</span></p>
              <p className={fieldText}>Órgão Emissor: <span className={line}>{d.comprador?.orgaoEmissor || ""}</span></p>
            </div>
          </div>
        </div>
        {/* Fornecedor */}
        <div className="p-2">
          <p className={`${labelText} text-center mb-1`}>CARIMBO DO FORNECEDOR</p>
          <div className="min-h-[50px] flex items-center justify-center">
            <p className={`${fieldText} text-center`}>{d.fornecedor || ""}</p>
          </div>
          <p className={`text-right text-[10px] ${fieldText}`}>___/___/___</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-blue-800 dark:border-blue-600 px-2 py-0.5 flex justify-between">
        <p className="text-[8px] text-blue-700 dark:text-blue-400">Dados da Gráfica: Nome - Endereço Completo - CGC</p>
        <p className="text-[8px] text-blue-700 dark:text-blue-400">Numeração desta impressão: de ___ a ___</p>
      </div>
    </div>
  );
}
