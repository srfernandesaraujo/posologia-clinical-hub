import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldAlert, XCircle, Loader2, GraduationCap } from "lucide-react";

interface CreditResult {
  found: boolean;
  revoked?: boolean;
  student_name?: string;
  track_category?: string;
  mastery_pct?: number;
  distinct_simulators?: number;
  credit_hours?: number;
  issued_at?: string;
}

export default function VerificarCredito() {
  const { codigo } = useParams<{ codigo: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CreditResult | null>(null);

  useEffect(() => {
    if (!codigo) {
      setResult({ found: false });
      setLoading(false);
      return;
    }
    supabase.functions
      .invoke("education-credit-verify", { body: { action: "verify", code: codigo } })
      .then(({ data, error }) => {
        setResult(error ? { found: false } : (data as CreditResult));
      })
      .finally(() => setLoading(false));
  }, [codigo]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verificação de Crédito de Educação Continuada</CardTitle>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{codigo}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Verificando…
            </div>
          ) : !result?.found ? (
            <div className="text-center py-8 space-y-2">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-medium">Crédito não encontrado</p>
              <p className="text-sm text-muted-foreground">Confira se o código foi digitado corretamente.</p>
            </div>
          ) : result.revoked ? (
            <div className="text-center py-8 space-y-2">
              <ShieldAlert className="h-10 w-10 text-yellow-600 mx-auto" />
              <p className="font-medium">Crédito revogado</p>
              <p className="text-sm text-muted-foreground">
                Este crédito foi emitido, mas posteriormente revogado pela instituição.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                <p className="font-medium">Crédito válido</p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Aluno(a):</span> {result.student_name}</p>
                <p><span className="text-muted-foreground">Trilha:</span> {result.track_category}</p>
                <p><span className="text-muted-foreground">Carga horária:</span> {result.credit_hours}h</p>
                <p><span className="text-muted-foreground">Maestria:</span> {result.mastery_pct}% ({result.distinct_simulators} simuladores distintos)</p>
                {result.issued_at && (
                  <p><span className="text-muted-foreground">Emitido em:</span> {new Date(result.issued_at).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Este certificado atesta a conclusão de uma trilha de estudos na plataforma Posologia Clinical Hub.
                O reconhecimento como crédito de educação continuada perante conselhos profissionais (CFF, CRF, CFM)
                depende de trâmite institucional próprio, não coberto por este documento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
