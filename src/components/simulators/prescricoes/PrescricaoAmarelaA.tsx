interface PrescricaoAmarelaAProps {
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
    fornecedor?: { nome: string; data: string };
    grafica?: string;
  };
}

export default function PrescricaoAmarelaA({ data }: PrescricaoAmarelaAProps) {
  const d = data;
  return (
    <div className="rounded-lg border-2 border-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 p-4 sm:p-6 text-xs sm:text-sm font-mono space-y-3 max-w-xl mx-auto shadow-md">
      {/* Header */}
      <div className="text-center space-y-0.5">
        <p className="text-[10px] text-yellow-800 dark:text-yellow-300 font-bold tracking-widest uppercase">
          Ministério da Saúde — ANVISA
        </p>
        <h3 className="text-base font-bold text-yellow-900 dark:text-yellow-200">
          NOTIFICAÇÃO DE RECEITA — A
        </h3>
        <div className="flex justify-center gap-4 text-[10px] text-yellow-700 dark:text-yellow-400">
          <span>UF: <strong>{d.uf || "___"}</strong></span>
          <span>Nº: <strong>{d.numero || "000000"}</strong></span>
        </div>
      </div>

      <hr className="border-yellow-400 dark:border-yellow-700" />

      {/* Emitente */}
      <fieldset className="border border-yellow-400 dark:border-yellow-700 rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300 px-1">IDENTIFICAÇÃO DO EMITENTE</legend>
        <p>{d.emitente?.nome || "________________________"}</p>
        <p>CRM: {d.emitente?.crm || "______"}</p>
        <p>End.: {d.emitente?.endereco || "________________________"}</p>
        <p>Tel.: {d.emitente?.telefone || "(__)____-____"}</p>
      </fieldset>

      {/* Paciente */}
      <fieldset className="border border-yellow-400 dark:border-yellow-700 rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300 px-1">PACIENTE</legend>
        <p>Nome: {d.paciente?.nome || "________________________"}</p>
        <p>End.: {d.paciente?.endereco || "________________________"}</p>
      </fieldset>

      {/* Medicamento */}
      <fieldset className="border border-yellow-400 dark:border-yellow-700 rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300 px-1">MEDICAMENTO</legend>
        <p>Medicamento / Substância: <strong>{d.medicamento || "____________"}</strong></p>
        <p>Quantidade e Forma Farmac.: {d.quantidade || "___"} — {d.formaFarmaceutica || "____________"}</p>
        <p>Dose por Unid. Posológica: {d.doseUnidade || "____________"}</p>
        <p>Posologia: {d.posologia || "____________"}</p>
      </fieldset>

      {/* Data e Assinatura */}
      <div className="flex justify-between items-end">
        <p>Data: <strong>{d.data || "__/__/____"}</strong></p>
        <div className="text-center">
          <div className="w-40 border-b border-yellow-600 dark:border-yellow-500 mb-0.5" />
          <p className="text-[10px]">Assinatura do Emitente {d.assinaturaEmitente === false && <span className="text-destructive font-bold">(AUSENTE)</span>}</p>
        </div>
      </div>

      <hr className="border-yellow-400 dark:border-yellow-700" />

      {/* Comprador */}
      <fieldset className="border border-yellow-400 dark:border-yellow-700 rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300 px-1">IDENTIFICAÇÃO DO COMPRADOR</legend>
        <p>Nome: {d.comprador?.nome || "________________________"}</p>
        <p>End.: {d.comprador?.endereco || "________________________"}</p>
        <p>Tel.: {d.comprador?.telefone || "(__)____-____"}</p>
        <p>Identidade Nº: {d.comprador?.identidade || "____________"} — Órgão Emissor: {d.comprador?.orgaoEmissor || "______"}</p>
      </fieldset>

      {/* Fornecedor */}
      <fieldset className="border border-yellow-400 dark:border-yellow-700 rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300 px-1">IDENTIFICAÇÃO DO FORNECEDOR</legend>
        <p>Nome: {d.fornecedor?.nome || "________________________"}</p>
        <p>Data: {d.fornecedor?.data || "__/__/____"}</p>
      </fieldset>

      {d.grafica && <p className="text-[9px] text-yellow-600 dark:text-yellow-500 text-center">{d.grafica}</p>}
    </div>
  );
}
