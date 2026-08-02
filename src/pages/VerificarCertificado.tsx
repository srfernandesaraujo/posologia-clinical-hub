import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert, XCircle, Loader2, Award } from "lucide-react";

interface CertificateResult {
  found: boolean;
  revoked?: boolean;
  student_name?: string;
  exam_title?: string;
  final_score?: number;
  competency_breakdown?: { category: string; score: number; activityCount: number }[];
  integrity_flags?: { tabSwitchCount?: number };
  issued_at?: string;
}

export default function VerificarCertificado() {
  const { codigo } = useParams<{ codigo: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CertificateResult | null>(null);

  useEffect(() => {
    if (!codigo) {
      setResult({ found: false });
      setLoading(false);
      return;
    }
    supabase.functions
      .invoke("certificate-verify", { body: { action: "verify", code: codigo } })
      .then(({ data, error }) => {
        setResult(error ? { found: false } : (data as CertificateResult));
      })
      .finally(() => setLoading(false));
  }, [codigo]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verificação de Certificado OSCE</CardTitle>
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
              <p className="font-medium">Certificado não encontrado</p>
              <p className="text-sm text-muted-foreground">Confira se o código foi digitado corretamente.</p>
            </div>
          ) : result.revoked ? (
            <div className="text-center py-8 space-y-2">
              <ShieldAlert className="h-10 w-10 text-yellow-600 mx-auto" />
              <p className="font-medium">Certificado revogado</p>
              <p className="text-sm text-muted-foreground">
                Este certificado foi emitido, mas posteriormente revogado pela instituição.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                <p className="font-medium">Certificado válido</p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Aluno(a):</span> {result.student_name}</p>
                <p><span className="text-muted-foreground">Prova:</span> {result.exam_title}</p>
                <p><span className="text-muted-foreground">Nota final:</span> {result.final_score}%</p>
                {result.issued_at && (
                  <p><span className="text-muted-foreground">Emitido em:</span> {new Date(result.issued_at).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
              {!!result.competency_breakdown?.length && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Desempenho por competência</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.competency_breakdown.map((c) => (
                      <Badge key={c.category} variant="outline" className="text-xs">
                        {c.category}: {c.score}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
