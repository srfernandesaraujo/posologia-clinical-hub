import { Link } from "react-router-dom";
import { Pill, ArrowLeft } from "lucide-react";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white/80">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg bg-emerald-500/10 p-2"><Pill className="h-6 w-6 text-emerald-400" /></div>
          <h1 className="text-3xl font-bold text-white">Política de Privacidade</h1>
        </div>
        <p className="text-sm text-white/40 mb-10">Última atualização: 08 de março de 2026</p>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">1. Dados Coletados</h2>
            <p>Coletamos os seguintes dados pessoais: nome completo, endereço de e-mail, dados de uso da plataforma (ferramentas utilizadas, frequência de acesso) e informações de pagamento (processadas pelo Stripe, não armazenadas em nossos servidores).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">2. Finalidade do Tratamento</h2>
            <p>Os dados são utilizados para: (a) criação e gerenciamento de conta; (b) personalização da experiência; (c) comunicação sobre atualizações e novidades; (d) melhoria contínua da Plataforma; (e) processamento de pagamentos.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">3. Base Legal (LGPD)</h2>
            <p>O tratamento de dados pessoais tem como base legal: o consentimento do titular (Art. 7º, I da LGPD); a execução de contrato (Art. 7º, V); e o legítimo interesse do controlador (Art. 7º, IX), sempre respeitando os direitos fundamentais do titular.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">4. Compartilhamento de Dados</h2>
            <p>Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing. Os dados podem ser compartilhados com: (a) Supabase (infraestrutura e banco de dados); (b) Stripe (processamento de pagamentos); (c) Resend (envio de e-mails transacionais).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">5. Armazenamento e Segurança</h2>
            <p>Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Implementamos políticas de segurança em nível de linha (RLS) para garantir que cada usuário acesse apenas seus próprios dados.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">6. Direitos do Titular</h2>
            <p>Conforme a LGPD, o titular pode solicitar: acesso aos dados, correção, exclusão, portabilidade, revogação do consentimento e informações sobre compartilhamento. Solicitações devem ser enviadas para <a href="mailto:sergio.araujo@ufrn.br" className="text-emerald-400 hover:underline">sergio.araujo@ufrn.br</a>.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">7. Retenção de Dados</h2>
            <p>Os dados pessoais são mantidos enquanto a conta estiver ativa. Após a exclusão da conta, os dados são removidos em até 30 dias, exceto quando houver obrigação legal de retenção.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">8. Contato do Encarregado (DPO)</h2>
            <p>Para questões sobre privacidade: <a href="mailto:sergio.araujo@ufrn.br" className="text-emerald-400 hover:underline">sergio.araujo@ufrn.br</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
