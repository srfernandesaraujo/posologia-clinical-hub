import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calculator, FlaskConical, Gamepad2, Users, CreditCard,
  BookOpen, Search, ArrowRight, Shield,
  ChevronDown, ChevronRight, HelpCircle, Microscope, GraduationCap,
  UserPlus, DoorOpen, Brain, Beaker, Dna, HeartPulse, Pill, Scan, Accessibility, Box,
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
      { q: "Como criar uma conta?", a: "Clique em 'Criar Conta' na página inicial, preencha seu nome, e-mail e senha. Após o cadastro, um administrador irá aprovar seu acesso." },
      { q: "Como fazer login?", a: "Acesse a página de Login e utilize seu e-mail e senha cadastrados, ou faça login com sua conta Google." },
      { q: "O que acontece após o cadastro?", a: "Novos cadastros ficam com status 'Pendente' até a aprovação de um administrador. Após aprovação, você terá acesso ao plano Gratuito com limite diário de uso." },
      { q: "Esqueci minha senha, como recupero?", a: "Na tela de login, clique em 'Esqueceu a senha?' e informe seu e-mail. Você receberá um link de redefinição." },
      { q: "A plataforma tem um assistente para tirar dúvidas?", a: "Sim! O Oráculo é um chat de IA disponível para usuários logados que orienta sobre qual ferramenta usar e como aproveitar cada funcionalidade." },
    ],
  },
  {
    id: "calculadoras", title: "Calculadoras Clínicas", icon: Calculator, color: "text-blue-400 bg-blue-500/10",
    items: [
      { q: "O que são as calculadoras?", a: "São ferramentas de apoio à decisão clínica que calculam scores, índices e fórmulas validadas pela literatura. Exemplos: CKD-EPI, Wells Score, MELD, Vancomicina AUC/MIC, entre outros." },
      { q: "Quantas calculadoras estão disponíveis?", a: "Atualmente a plataforma conta com 34 calculadoras clínicas cobrindo áreas como nefrologia, cardiologia, emergência, farmacologia clínica, endocrinologia, oncologia, pediatria/neonatologia e ginecologia/obstetrícia." },
      { q: "Posso salvar os resultados?", a: "Sim! Usuários autenticados podem salvar cálculos no histórico pessoal, incluindo nome do paciente e data." },
      { q: "Existe limite de uso?", a: "No plano Gratuito há um limite de 3 calculadoras por dia, verificado a cada acesso a uma calculadora (inclusive por link direto ou atualização de página). O plano Premium oferece uso ilimitado." },
    ],
  },
  {
    id: "simuladores", title: "Simuladores Interativos", icon: FlaskConical, color: "text-cyan-400 bg-cyan-500/10",
    items: [
      { q: "O que são os simuladores?", a: "São ambientes interativos que reproduzem cenários clínicos, fisiológicos e bioquímicos, permitindo prática segura de raciocínio. A plataforma conta com mais de 107 simuladores." },
      { q: "Quantas categorias de simuladores existem?", a: "Os simuladores estão organizados em 12 categorias: Farmácia Clínica (16), Fisiologia Humana (10), Bioquímica (10), Farmacologia Básica (8), Farmacotécnica (8), Química Farmacêutica (8), Odontologia (8), Fisioterapia (8), Nutrição (8), Genética (8), Farmacoterapia Laboratorial (8) e Formação Docente (7), além de simuladores criados pelo usuário." },
      { q: "Os casos são gerados por IA?", a: "Sim! A plataforma utiliza inteligência artificial para gerar casos clínicos únicos com diferentes níveis de dificuldade." },
      { q: "Simuladores são gratuitos?", a: "Simuladores são funcionalidades do plano Premium, incluindo os simuladores dinâmicos criados por IA. Usuários gratuitos podem visualizar a lista, mas abrir qualquer simulador (mesmo por link direto) exige assinatura ativa." },
    ],
  },
  {
    id: "odonto-fisio-nutri", title: "Odontologia, Fisioterapia e Nutrição", icon: Scan, color: "text-orange-400 bg-orange-500/10",
    items: [
      { q: "O que são os simuladores de Odontologia?", a: "São 8 simuladores com SVG interativo cobrindo odontograma, endodontia, periodontograma, anestesiologia, cefalometria, radiografia, farmacologia odontológica e cirurgia/exodontia (Pell & Gregory)." },
      { q: "O que são os simuladores de Fisioterapia?", a: "São 8 simuladores para avaliação funcional: goniometria articular, avaliação postural (simetrógrafo), força muscular (Oxford/MRC), dermátomos, fisioterapia respiratória, eletroterapia, testes ortopédicos especiais e escala de Berg." },
      { q: "O que são os simuladores de Nutrição?", a: "São 8 simuladores abrangendo avaliação nutricional antropométrica, triagem (NRS-2002), cálculo de necessidades energéticas, terapia enteral (TNE), parenteral (TNP), disfagia, nutrição renal e nutrição materno-infantil." },
    ],
  },
  {
    id: "formacao-docente", title: "Formação Docente", icon: GraduationCap, color: "text-rose-400 bg-rose-500/10",
    items: [
      { q: "O que é a categoria Formação Docente?", a: "São 7 simuladores exclusivos para treinamento pedagógico de professores, cobrindo feedback formativo (Pendleton/R2C2/ALOBA), elaboração de questões (Bloom), condução de caso PBL/TBL, planejamento de aula por competências (DCNs), gestão de sala com incidentes críticos, avaliação por rubrica OSCE e preceptoria clínica (One-Minute Preceptor)." },
      { q: "Preciso ser professor para usar?", a: "Não! Embora focados em docentes, os simuladores de formação podem ser usados por qualquer aluno de licenciatura, pós-graduação em docência ou profissional interessado em pedagogia da saúde." },
      { q: "Como funciona a pontuação?", a: "Cada simulador avalia as escolhas do usuário em critérios pedagógicos específicos (empatia, assertividade, alinhamento construtivo, calibração) e atribui uma pontuação percentual." },
    ],
  },
  {
    id: "laboratorio", title: "Laboratório Virtual", icon: Microscope, color: "text-purple-400 bg-purple-500/10",
    items: [
      { q: "O que é o Laboratório Virtual?", a: "É um ambiente com 11 bancadas de pesquisa modulares onde o usuário conduz experimentos sequenciais — cada módulo depende dos resultados do anterior, simulando uma experiência real de bancada." },
      { q: "Quais bancadas estão disponíveis?", a: "Desenvolvimento de Fármacos, Microbiologia, Toxicologia, Farmacogenômica, Estabilidade, Controle de Qualidade, Epidemiologia, Biotecnologia, Simulação Realística, Perícia Forense e Modelagem Molecular." },
      { q: "Como funciona o fluxo modular?", a: "Cada bancada tem 4 módulos experimentais + 1 módulo de mini-relatório. O módulo 2 só desbloqueia após completar o módulo 1, e assim por diante. Suas escolhas iniciais impactam diretamente os resultados dos módulos seguintes." },
      { q: "O que é o mini-relatório?", a: "É o módulo final de cada bancada onde você escreve hipótese, resultados e conclusão sobre o experimento realizado. Pode exportar o relatório completo em PDF com os dados de todos os módulos." },
      { q: "Os laboratórios funcionam em Salas Virtuais?", a: "Sim! Professores podem adicionar bancadas do laboratório como atividades em salas virtuais. Os resultados (decisões, relatório e score) aparecem no Analytics do professor com gráfico radar e detalhamento completo." },
      { q: "O Laboratório Virtual é gratuito?", a: "Não, é uma funcionalidade exclusiva do plano Premium — todas as 11 bancadas exigem assinatura ativa, mesmo ao acessar por link direto." },
    ],
  },
  {
    id: "medview3d", title: "MedView 3D", icon: Box, color: "text-indigo-400 bg-indigo-500/10",
    items: [
      { q: "O que é o MedView 3D?", a: "É um visualizador de modelos 3D anatômicos e de procedimentos clínicos, organizado em 6 categorias: Ortopedia e Traumatologia, Cardiologia Intervencionista, Odontologia e Bucomaxilofacial, Farmacologia e Dispositivos, Dermatologia e Cirurgia Plástica e Cirurgia Geral." },
      { q: "Como funcionam os modelos 3D?", a: "Os modelos são embutidos via Sketchfab/Z-Anatomy e permitem rotação, zoom e exploração interativa de estruturas anatômicas e etapas de procedimentos." },
      { q: "O MedView 3D é gratuito?", a: "Não, é uma funcionalidade exclusiva do plano Premium, com acesso bloqueado por rota mesmo para quem chega por um link direto." },
    ],
  },
  {
    id: "jogos", title: "Jogos Clínicos", icon: Gamepad2, color: "text-amber-400 bg-amber-500/10",
    items: [
      { q: "O que são os Jogos Clínicos?", a: "São jogos educativos com mecânicas diversas (quiz, tabuleiro, aventura, RPG) que testam conhecimentos em farmacologia, fisiologia e clínica de forma divertida." },
      { q: "Quantos jogos estão disponíveis?", a: "A plataforma possui mais de 20 jogos incluindo Milionário da Farmacologia, Código Azul, Detetive Toxicológico, Batalha Naval Clínica, entre outros." },
      { q: "Os jogos utilizam IA?", a: "Sim, os jogos utilizam IA para gerar perguntas, narrativas e cenários dinâmicos." },
      { q: "Existe ranking?", a: "Sim! Os jogos possuem ranking e integram-se ao sistema de gamificação (pontos, badges e streaks)." },
    ],
  },
  {
    id: "salas", title: "Salas Virtuais", icon: DoorOpen, color: "text-teal-400 bg-teal-500/10",
    items: [
      { q: "O que são Salas Virtuais?", a: "São ambientes colaborativos onde professores criam sessões de simulação para que alunos participem em tempo real. Cada sala possui um PIN de 6 dígitos." },
      { q: "Como os alunos acessam?", a: "Alunos não precisam de conta! Basta inserir o PIN da sala na página inicial e informar seu nome." },
      { q: "O professor acompanha os resultados?", a: "Sim, o professor tem um dashboard com Analytics completo: pontuação, gráfico radar de decisões, ações detalhadas, tempo gasto e relatórios de laboratório." },
      { q: "Quem pode criar salas?", a: "Criação exclusiva para usuários Premium, professores convidados e administradores." },
      { q: "Posso usar laboratórios nas salas?", a: "Sim! As salas suportam tanto simuladores (96+) quanto bancadas do Laboratório Virtual (11). O professor escolhe entre 'Simuladores' ou 'Laboratórios' no momento da criação." },
      { q: "Posso criar roteiros com múltiplas atividades?", a: "Sim! No modo 'Atividade Simulada' é possível compor um roteiro multi-etapas com diferentes simuladores/laboratórios, cada um com enunciado pedagógico personalizado." },
    ],
  },
  {
    id: "planos", title: "Planos e Pagamento", icon: CreditCard, color: "text-green-400 bg-green-500/10",
    items: [
      { q: "Quais planos estão disponíveis?", a: "Oferecemos Gratuito (com limite diário de calculadoras) e Premium (acesso ilimitado a calculadoras, 96+ simuladores, 11 bancadas de laboratório, jogos, salas virtuais com analytics, formação docente e relatórios PDF)." },
      { q: "Como faço upgrade para Premium?", a: "Acesse a página de Planos no menu lateral e clique em 'Assinar Premium'. Pagamento seguro pelo Stripe." },
      { q: "Posso cancelar a qualquer momento?", a: "Sim, o cancelamento pode ser solicitado pelo portal do cliente Stripe." },
      { q: "Quais formas de pagamento são aceitas?", a: "Cartão de crédito e débito via Stripe, com suporte a bandeiras internacionais." },
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
          <p className="text-white/50 mb-8">Encontre respostas sobre todas as funcionalidades da plataforma — calculadoras, 107+ simuladores, 11 bancadas de laboratório, MedView 3D, jogos, formação docente, salas virtuais e mais.</p>
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
