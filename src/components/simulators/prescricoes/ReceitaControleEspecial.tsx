interface ReceitaControleEspecialProps {
  data: {
    emitente?: { nome: string; crm: string; uf: string; endereco: string; telefone: string; cidade: string };
    paciente?: { nome: string; endereco: string };
    prescricao?: string[];
    data?: string;
    assinaturaEmitente?: boolean;
    comprador?: { nome: string; identidade: string; orgaoEmissor: string; endereco: string; cidade: string; uf: string; telefone: string };
    fornecedor?: { assinaturaFarmaceutico: boolean; data: string };
    segundaVia?: boolean;
  };
}

export default function ReceitaControleEspecial({ data }: ReceitaControleEspecialProps) {
  const d = data;
  return (
    <div className="rounded-lg border-2 border-border bg-card p-4 sm:p-6 text-xs sm:text-sm font-mono space-y-3 max-w-xl mx-auto shadow-md">
      {/* Header */}
      <div className="text-center space-y-0.5">
        <h3 className="text-base font-bold text-foreground">RECEITUÁRIO DE CONTROLE ESPECIAL</h3>
        <div className="flex justify-center gap-6 text-[10px] text-muted-foreground">
          <span className="px-2 py-0.5 border rounded bg-muted">1ª VIA — FARMÁCIA</span>
          <span className={`px-2 py-0.5 border rounded ${d.segundaVia === false ? "bg-destructive/10 text-destructive font-bold" : "bg-muted"}`}>
            2ª VIA — PACIENTE {d.segundaVia === false && "(AUSENTE)"}
          </span>
        </div>
      </div>

      <hr className="border-border" />

      {/* Emitente */}
      <fieldset className="border border-border rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-muted-foreground px-1">IDENTIFICAÇÃO DO EMITENTE</legend>
        <p>Nome: {d.emitente?.nome || "________________________"}</p>
        <p>CRM: {d.emitente?.crm || "______"} — UF: {d.emitente?.uf || "___"}</p>
        <p>End.: {d.emitente?.endereco || "________________________"} — Tel.: {d.emitente?.telefone || "(__)____-____"}</p>
        <p>Cidade: {d.emitente?.cidade || "____________"} — UF: {d.emitente?.uf || "___"}</p>
      </fieldset>

      {/* Paciente */}
      <fieldset className="border border-border rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-muted-foreground px-1">PACIENTE</legend>
        <p>Nome: {d.paciente?.nome || "________________________"}</p>
        <p>End.: {d.paciente?.endereco || "________________________"}</p>
      </fieldset>

      {/* Prescrição */}
      <fieldset className="border border-border rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-muted-foreground px-1">PRESCRIÇÃO</legend>
        {d.prescricao && d.prescricao.length > 0 ? (
          <ol className="list-decimal list-inside space-y-1">
            {d.prescricao.map((item, i) => (
              <li key={i}><strong>{item}</strong></li>
            ))}
          </ol>
        ) : (
          <p>____________________________________________</p>
        )}
      </fieldset>

      {/* Data e Assinatura */}
      <div className="flex justify-between items-end">
        <p>Data: <strong>{d.data || "__/__/____"}</strong></p>
        <div className="text-center">
          <div className="w-40 border-b border-foreground/30 mb-0.5" />
          <p className="text-[10px]">Assinatura do Emitente {d.assinaturaEmitente === false && <span className="text-destructive font-bold">(AUSENTE)</span>}</p>
        </div>
      </div>

      <hr className="border-border" />

      {/* Comprador */}
      <fieldset className="border border-border rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-muted-foreground px-1">IDENTIFICAÇÃO DO COMPRADOR</legend>
        <p>Nome: {d.comprador?.nome || "________________________"}</p>
        <p>Ident.: {d.comprador?.identidade || "____________"} — Org. Emissor: {d.comprador?.orgaoEmissor || "______"}</p>
        <p>End.: {d.comprador?.endereco || "________________________"}</p>
        <p>Cidade: {d.comprador?.cidade || "____________"} — UF: {d.comprador?.uf || "___"} — Tel.: {d.comprador?.telefone || "(__)____-____"}</p>
      </fieldset>

      {/* Fornecedor */}
      <fieldset className="border border-border rounded p-2 space-y-1">
        <legend className="text-[10px] font-bold text-muted-foreground px-1">IDENTIFICAÇÃO DO FORNECEDOR</legend>
        <div className="flex justify-between items-end">
          <div className="text-center">
            <div className="w-40 border-b border-foreground/30 mb-0.5" />
            <p className="text-[10px]">Assinatura do Farmacêutico</p>
          </div>
          <p>Data: {d.fornecedor?.data || "__/__/____"}</p>
        </div>
      </fieldset>
    </div>
  );
}
