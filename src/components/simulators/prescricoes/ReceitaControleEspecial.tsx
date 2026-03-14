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
  const line = "border-b border-foreground/20";
  const fieldText = "text-foreground";
  const labelText = "text-muted-foreground font-bold text-[10px] uppercase tracking-wide";

  return (
    <div className="rounded border-2 border-border bg-card text-[11px] max-w-lg mx-auto shadow-lg font-sans overflow-hidden">
      {/* Title + Vias */}
      <div className="p-3 pb-2 text-center">
        <p className="font-black text-sm text-foreground">RECEITUÁRIO CONTROLE ESPECIAL</p>
      </div>

      {/* Emitente box + Vias indicator */}
      <div className="px-3 pb-2">
        <div className="flex gap-3">
          {/* Emitente */}
          <fieldset className="border border-border rounded p-2 flex-1 space-y-1">
            <legend className={`${labelText} px-1 text-[9px]`}>IDENTIFICAÇÃO DO EMITENTE</legend>
            <p className={fieldText}>Nome Completo: <span className="font-medium">{d.emitente?.nome || ""}</span></p>
            <div className="flex gap-3">
              <p className={fieldText}>CRM <span className="font-medium">{d.emitente?.crm || "______"}</span></p>
              <p className={fieldText}>UF: <span className="font-medium">{d.emitente?.uf || "___"}</span></p>
              <p className={fieldText}>Nº ______</p>
            </div>
            <p className={fieldText}>Endereço Completo e Telefone: <span className="font-medium">{d.emitente?.endereco || ""} {d.emitente?.telefone || ""}</span></p>
            <div className="flex gap-3">
              <p className={fieldText}>Cidade: <span className="font-medium">{d.emitente?.cidade || ""}</span></p>
              <p className={fieldText}>UF: <span className="font-medium">{d.emitente?.uf || ""}</span></p>
            </div>
          </fieldset>

          {/* Vias */}
          <div className="flex flex-col justify-center text-[10px] space-y-1 min-w-[100px]">
            <p className="font-bold text-foreground">1ª VIA FARMÁCIA</p>
            <p className={`font-bold ${d.segundaVia === false ? "text-destructive" : "text-foreground"}`}>
              2ª VIA PACIENTE
              {d.segundaVia === false && <span className="block text-[9px]">(AUSENTE)</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Paciente + Endereço + Prescrição */}
      <div className="px-3 space-y-2 pb-2">
        <div>
          <span className="text-[10px] text-muted-foreground">Paciente: </span>
          <span className={`${line} inline-block ${fieldText} font-medium`}>{d.paciente?.nome || ""}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Endereço: </span>
          <span className={`${line} inline-block ${fieldText}`}>{d.paciente?.endereco || ""}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Prescrição:</span>
          {d.prescricao && d.prescricao.length > 0 ? (
            <div className="mt-1 space-y-1 pl-1">
              {d.prescricao.map((item, i) => (
                <p key={i} className={`${fieldText} font-medium`}>{i + 1}. {item}</p>
              ))}
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              {[1, 2, 3].map(i => <div key={i} className={`${line} w-full`} />)}
            </div>
          )}
        </div>
      </div>

      {/* Data + Assinatura */}
      <div className="px-3 pb-2 flex justify-between items-end">
        <p className={fieldText}>Data: <span className="font-medium">{d.data || "___/___/___"}</span></p>
        <div className="text-center">
          <div className="w-36 border-b border-foreground/30 mb-0.5" />
          <p className="text-[9px] text-muted-foreground">Assinatura do Emitente
            {d.assinaturaEmitente === false && <span className="text-destructive font-bold ml-1">(AUSENTE)</span>}
          </p>
        </div>
      </div>

      {/* === Comprador + Fornecedor === */}
      <div className="grid grid-cols-2 border-t border-border mx-3 mb-3 mt-4">
        {/* Comprador */}
        <div className="border border-border rounded-l p-2 space-y-1">
          <p className={`${labelText} text-center text-[9px]`}>IDENTIFICAÇÃO DO COMPRADOR</p>
          <p className={fieldText}>Nome: <span className="font-medium">{d.comprador?.nome || ""}</span></p>
          <div className="flex gap-2">
            <p className={fieldText}>Ident.: <span className="font-medium">{d.comprador?.identidade || ""}</span></p>
            <p className={fieldText}>Órg. Emissor: <span className="font-medium">{d.comprador?.orgaoEmissor || ""}</span></p>
          </div>
          <p className={fieldText}>End.: <span className="font-medium">{d.comprador?.endereco || ""}</span></p>
          <div className="flex gap-2">
            <p className={fieldText}>Cidade: <span className="font-medium">{d.comprador?.cidade || ""}</span></p>
            <p className={fieldText}>UF: <span className="font-medium">{d.comprador?.uf || ""}</span></p>
          </div>
          <p className={fieldText}>Telefone: <span className="font-medium">{d.comprador?.telefone || ""}</span></p>
        </div>
        {/* Fornecedor */}
        <div className="border border-l-0 border-border rounded-r p-2 space-y-1">
          <p className={`${labelText} text-center text-[9px]`}>IDENTIFICAÇÃO DO FORNECEDOR</p>
          <div className="min-h-[40px]" />
          <div className="text-[9px] text-right space-y-1 text-muted-foreground">
            <p>ASSINATURA DO FARMACÊUTICO</p>
            <p>DATA: {d.fornecedor?.data || "___/___/___"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
