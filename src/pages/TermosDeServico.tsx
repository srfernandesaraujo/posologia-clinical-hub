import { Link } from "react-router-dom";
import { Pill, ArrowLeft } from "lucide-react";

export default function TermosDeServico() {
  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white/80">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg bg-emerald-500/10 p-2"><Pill className="h-6 w-6 text-emerald-400" /></div>
          <h1 className="text-3xl font-bold text-white">Termos de Serviço</h1>
        </div>
        <p className="text-sm text-white/40 mb-10">Última atualização: 08 de março de 2026</p>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar ou utilizar a plataforma Posologia Clinical Hub ("Plataforma"), operada por Posologia Produções, você concorda integralmente com estes Termos de Serviço. Caso não concorde, não utilize a Plataforma.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">2. Descrição do Serviço</h2>
            <p>O Posologia Clinical Hub oferece ferramentas de apoio à decisão clínica, incluindo calculadoras, simuladores interativos, jogos educativos e salas virtuais para educação em saúde. As ferramentas são de caráter educacional e não substituem o julgamento clínico profissional.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">3. Cadastro e Conta</h2>
            <p>Para acessar funcionalidades completas, o usuário deve criar uma conta fornecendo informações verdadeiras e completas. O usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">4. Planos e Pagamentos</h2>
            <p>A Plataforma oferece plano gratuito com funcionalidades limitadas e plano Premium com acesso completo. Os pagamentos são processados via Stripe. Cancelamentos podem ser solicitados a qualquer momento, com efeito ao final do período já pago.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">5. Uso Adequado</h2>
            <p>O usuário se compromete a: (a) não utilizar a Plataforma para fins ilegais; (b) não tentar acessar áreas restritas sem autorização; (c) não reproduzir, distribuir ou comercializar conteúdo da Plataforma sem autorização prévia; (d) não interferir no funcionamento dos serviços.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">6. Propriedade Intelectual</h2>
            <p>Todo o conteúdo da Plataforma, incluindo textos, algoritmos, interfaces, design e código-fonte, é de propriedade exclusiva de Posologia Produções e está protegido pelas leis de direitos autorais e propriedade intelectual.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">7. Limitação de Responsabilidade</h2>
            <p>As ferramentas disponibilizadas são de caráter educacional e de apoio. A Posologia Produções não se responsabiliza por decisões clínicas tomadas com base nas ferramentas. Os resultados devem ser validados pelo profissional de saúde responsável.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">8. Modificações</h2>
            <p>Reservamo-nos o direito de alterar estes Termos a qualquer momento. Alterações significativas serão comunicadas via e-mail ou notificação na Plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">9. Contato</h2>
            <p>Para dúvidas sobre estes Termos, entre em contato pelo e-mail <a href="mailto:sergio.araujo@ufrn.br" className="text-emerald-400 hover:underline">sergio.araujo@ufrn.br</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
