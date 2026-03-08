import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calculator, FlaskConical, Gamepad2, Users, CreditCard,
  BookOpen, Search, ArrowRight, Pill, Shield, Settings,
  ChevronDown, ChevronRight, HelpCircle, Zap, Star,
  Monitor, UserPlus, LogIn, DoorOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DocSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: { q: string; a: string }[];
}

const sections: DocSection[] = [
  {
    id: "inicio", title: "Primeiros Passos", icon: UserPlus, color: "text-emerald-400 bg-emerald-500/10",
    items: [
      { q: "Como criar uma conta?", a: "Clique em 'Criar Conta' na página inicial, preencha seu nome, e-mail e senha. Após o cadastro, um administrador irá aprovar seu acesso. Você receberá uma notificação quando sua conta for ativada." },
      { q: "Como fazer login?", a: "Acesse a página de Login e utilize seu e-mail e senha cadastrados, ou faça login com sua conta Google." },
      { q: "O que acontece após o cadastro?", a: "Novos cadastros ficam com status 'Pendente' até a aprovação de um administrador. Após aprovação, você terá acesso ao plano Gratuito com limite diário de uso." },
      { q: "Esqueci minha senha, como recupero?", a: "Na tela de login, clique em 'Esqueceu a senha?' e informe seu e-mail. Você receberá um link de redefinição." },
    ],
  },
  {
    id: "calculadoras", title: "Calculadoras Clínicas", icon: Calculator, color: "text-blue-400 bg-blue-500/10",
    items: [
      { q: "O que são as calculadoras?", a: "São ferramentas de apoio à decisão clínica que calculam scores, índices e fórmulas validadas pela literatura científica. Exemplos: CKD-EPI, Wells Score, MELD, CHA₂DS₂-VASc, entre outros." },
      { q: "Quantas calculadoras estão disponíveis?", a: "Atualmente a plataforma conta com mais de 20 calculadoras clínicas cobrindo áreas como nefrologia, cardiologia, emergência, farmacologia e pediatria." },
      { q: "Posso salvar os resultados?", a: "Sim! Usuários autenticados podem salvar cálculos no histórico pessoal, incluindo nome do paciente e data, facilitando o acompanhamento." },
      { q: "Existe limite de uso?", a: "No plano Gratuito há um limite diário de uso das calculadoras. O plano Premium oferece uso ilimitado de todas as ferramentas." },
    ],
  },
  {
    id: "simuladores", title: "Simuladores Interativos", icon: FlaskConical, color: "text-cyan-400 bg-cyan-500/10",
    items: [
      { q: "O que são os simuladores?", a: "São ambientes interativos que reproduzem cenários clínicos reais, permitindo prática segura de raciocínio farmacoterapêutico e fisiológico. Incluem simuladores de PRM, TDM, interações medicamentosas, bomba de infusão e muito mais." },
      { q: "Quantas categorias de simuladores existem?", a: "Os simuladores são organizados em 3 categorias: Farmácia Clínica (8 simuladores), Fisiologia (10 simuladores) e Bioquímica (10 simuladores), totalizando 28 simuladores." },
      { q: "Os casos são gerados por IA?", a: "Sim! A plataforma utiliza inteligência artificial para gerar casos clínicos únicos com diferentes níveis de dificuldade, garantindo uma experiência nova a cada sessão." },
      { q: "Simuladores são gratuitos?", a: "Simuladores são funcionalidades exclusivas do plano Premium. Usuários gratuitos podem visualizar a lista, mas o acesso completo requer assinatura." },
    ],
  },
  {
    id: "jogos", title: "Jogos Clínicos", icon: Gamepad2, color: "text-purple-400 bg-purple-500/10",
    items: [
      { q: "O que são os Jogos Clínicos?", a: "São jogos educativos com mecânicas diversas (quiz, tabuleiro, aventura, RPG) que testam conhecimentos em farmacologia, fisiologia e clínica médica de forma divertida e engajante." },
      { q: "Quantos jogos estão disponíveis?", a: "A plataforma possui mais de 20 jogos com mecânicas diferentes, como Milionário da Farmacologia, Código Azul, Detetive Toxicológico, Batalha Naval Clínica, entre outros." },
      { q: "Os jogos utilizam IA?", a: "Sim, os jogos utilizam IA para gerar perguntas, narrativas e cenários dinâmicos, oferecendo uma experiência única a cada partida." },
      { q: "Existe ranking?", a: "Sim! Os jogos possuem sistema de pontuação e ranking, integrando-se ao sistema de gamificação da plataforma." },
    ],
  },
  {
    id: "salas", title: "Salas Virtuais", icon: Users, color: "text-amber-400 bg-amber-500/10",
    items: [
      { q: "O que são Salas Virtuais?", a: "São ambientes colaborativos onde professores podem criar sessões de simulação para que alunos participem em tempo real. Cada sala possui um PIN de 6 dígitos para acesso." },
      { q: "Como os alunos acessam?", a: "Alunos não precisam de conta! Basta inserir o PIN da sala na página inicial e informar seu nome para participar da atividade." },
      { q: "O professor acompanha os resultados?", a: "Sim, o professor tem acesso a um dashboard com os resultados de cada aluno, incluindo pontuação, ações realizadas e tempo gasto." },
      { q: "Quem pode criar salas?", a: "A criação de salas é exclusiva para usuários com plano Premium, professores convidados e administradores." },
    ],
  },
  {
    id: "planos", title: "Planos e Pagamento", icon: CreditCard, color: "text-green-400 bg-green-500/10",
    items: [
      { q: "Quais planos estão disponíveis?", a: "Oferecemos dois planos: Gratuito (com limite diário de calculadoras) e Premium (acesso ilimitado a todas as ferramentas: calculadoras, simuladores, jogos, salas virtuais e relatórios PDF)." },
      { q: "Como faço upgrade para Premium?", a: "Acesse a página de Planos no menu lateral e clique em 'Assinar Premium'. O pagamento é processado de forma segura pelo Stripe." },
      { q: "Posso cancelar a qualquer momento?", a: "Sim, o cancelamento pode ser solicitado a qualquer momento pelo portal do cliente Stripe, com efeito ao final do período já pago." },
      { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos cartão de crédito e débito através do Stripe, com suporte a bandeiras internacionais." },
    ],
  },
];

export default function DocumentacaoPublica() {
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string | null>("inicio");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filteredSections = sections.map(s => ({
    ...s,
    items: s.items.filter(i =>
      !search || i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(168_80%_36%/0.12),transparent)]" />
        <div className="relative container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Central de Ajuda</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Documentação do Posologia Clinical Hub</h1>
          <p className="text-white/50 mb-8">Encontre respostas sobre todas as funcionalidades da plataforma.</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar na documentação..."
              className="pl-11 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 h-12"
            />
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-4">
          {filteredSections.map(section => (
            <div key={section.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className={`rounded-xl p-2.5 ${section.color}`}>
                  <section.icon className="h-5 w-5" />
                </div>
                <span className="text-white font-semibold flex-1">{section.title}</span>
                <span className="text-white/20 text-xs">{section.items.length} tópicos</span>
                <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${openSection === section.id ? "rotate-180" : ""}`} />
              </button>
              {openSection === section.id && (
                <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                  {section.items.map((item, i) => {
                    const key = `${section.id}-${i}`;
                    const isOpen = openItems.has(key);
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggleItem(key)}
                          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <HelpCircle className="h-4 w-4 text-white/20 shrink-0" />
                          <span className="text-sm text-white/70 flex-1">{item.q}</span>
                          <ChevronRight className={`h-3.5 w-3.5 text-white/20 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 pl-12">
                            <p className="text-sm text-white/50 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8">
            <HelpCircle className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Não encontrou o que procura?</h3>
            <p className="text-sm text-white/40 mb-6">Entre em contato conosco e teremos prazer em ajudar.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contato">
                <Button variant="outline" className="border-white/15 text-white/80 hover:bg-white/5">Fale Conosco</Button>
              </Link>
              <Link to="/cadastro">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold gap-2">
                  Criar conta gratuita <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
