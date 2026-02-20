import { Link } from "react-router-dom";
import {
  Pill, Calculator, FlaskConical, Zap, Shield, Users,
  Clock, Brain, Heart, Activity, CheckCircle2, ArrowRight,
  TrendingUp, BookOpen, Star, ChevronRight,
} from "lucide-react";

const painPoints = [
  {
    icon: Clock,
    problem: "Calculando scores manualmente?",
    solution: "Resultados instantâneos com fórmulas validadas. Sem erros, sem perda de tempo.",
  },
  {
    icon: Brain,
    problem: "Inseguro na tomada de decisão?",
    solution: "Simuladores clínicos que treinam seu raciocínio com cenários reais.",
  },
  {
    icon: BookOpen,
    problem: "Fórmulas espalhadas em livros e apps?",
    solution: "Tudo centralizado: dezenas de calculadoras organizadas por especialidade.",
  },
];

const toolExamples = [
  { name: "Clearance de Creatinina", category: "Nefrologia", icon: Activity, color: "bg-blue-500/10 text-blue-500" },
  { name: "CHA₂DS₂-VASc", category: "Cardiologia", icon: Heart, color: "bg-red-500/10 text-red-500" },
  { name: "Escala de Glasgow", category: "Neurologia", icon: Brain, color: "bg-purple-500/10 text-purple-500" },
  { name: "MELD Score", category: "Hepatologia", icon: Activity, color: "bg-amber-500/10 text-amber-500" },
  { name: "CURB-65", category: "Pneumologia", icon: Activity, color: "bg-emerald-500/10 text-emerald-500" },
  { name: "Wells Score", category: "Emergência", icon: Zap, color: "bg-orange-500/10 text-orange-500" },
];

const stats = [
  { value: "50+", label: "Calculadoras Clínicas" },
  { value: "12", label: "Especialidades" },
  { value: "100%", label: "Gratuito" },
  { value: "24/7", label: "Disponível" },
];

const benefits = [
  "Economize até 10 minutos por paciente em cálculos",
  "Fórmulas atualizadas conforme diretrizes vigentes",
  "Interface limpa e pensada para uso rápido no plantão",
  "Explicação didática abaixo de cada ferramenta",
  "Novos scores adicionados frequentemente",
  "Acesso em qualquer dispositivo — desktop, tablet ou celular",
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-[#0A0F1C]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(168_80%_36%/0.2),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_60%,hsl(262_83%_58%/0.1),transparent)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                  Gratuito para profissionais de saúde
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
                Pare de perder tempo com{" "}
                <span className="relative">
                  <span className="text-gradient">cálculos manuais</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 8C50 2 100 2 150 6C200 10 250 4 298 6" stroke="hsl(168 80% 42%)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-white/60 mb-8 leading-relaxed max-w-lg">
                Scores, fórmulas e simuladores clínicos validados — prontos para usar 
                no plantão, na enfermaria ou na sala de aula. Resultados precisos em segundos.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link
                  to="/cadastro"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-4 text-base font-bold text-white hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25"
                >
                  Criar conta gratuita
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-7 py-4 text-base font-medium text-white/80 hover:bg-white/5 transition-colors"
                >
                  Já tenho conta
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm text-white/40">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400/60" />
                  Baseado em evidências
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400/60" />
                  Revisado por médicos
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
              <div className="relative space-y-3">
                {toolExamples.slice(0, 4).map((tool, i) => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4 hover:bg-white/[0.06] transition-colors"
                    style={{ marginLeft: `${i % 2 === 0 ? 0 : 40}px` }}
                  >
                    <div className={`rounded-xl p-2.5 ${tool.color}`}>
                      <tool.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{tool.name}</p>
                      <p className="text-white/40 text-xs">{tool.category}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/20 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative bg-[#0D1220] border-y border-white/[0.06]">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gradient mb-1">{stat.value}</p>
                <p className="text-sm text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="bg-[#080C18] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase mb-4">O problema que resolvemos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">A rotina clínica não pode esperar</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Você precisa de respostas rápidas e confiáveis. Nós entregamos exatamente isso.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {painPoints.map((item) => (
              <div key={item.problem} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-emerald-500/20 transition-colors group">
                <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 mb-5 group-hover:bg-emerald-500/20 transition-colors">
                  <item.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{item.problem}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools showcase */}
      <section className="bg-[#0A0F1C] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase mb-4">Ferramentas disponíveis</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Scores e calculadoras que você usa todo dia</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">De CHA₂DS₂-VASc a Clearance de Creatinina — tudo em um só lugar, com explicação didática e referências atualizadas.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
            {toolExamples.map((tool) => (
              <div key={tool.name} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 hover:border-emerald-500/20 hover:bg-white/[0.05] transition-all">
                <div className={`rounded-xl p-2.5 shrink-0 ${tool.color}`}>
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{tool.name}</p>
                  <p className="text-white/40 text-xs">{tool.category}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/cadastro" className="inline-flex items-center gap-2 text-emerald-400 font-semibold text-sm hover:text-emerald-300 transition-colors">
              Ver todas as ferramentas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#080C18] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase mb-4">Por que usar o Posologia Clinical Hub?</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Feito por quem entende a rotina clínica</h2>
              <p className="text-white/50 text-lg mb-8">Cada ferramenta foi pensada para se encaixar no fluxo de trabalho do profissional de saúde — rápida, precisa e sem distrações.</p>
              <Link to="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3.5 text-sm font-bold text-white hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20">
                Começar agora — é grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-white/70 text-sm leading-relaxed">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#0A0F1C] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase mb-4">Como funciona</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">3 passos para começar</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Crie sua conta", desc: "Cadastro rápido e gratuito. Sem cartão de crédito.", icon: Users },
              { step: "02", title: "Escolha a ferramenta", desc: "Navegue por especialidade ou busque pelo nome do score.", icon: Calculator },
              { step: "03", title: "Obtenha o resultado", desc: "Preencha os campos e receba o resultado com interpretação clínica.", icon: TrendingUp },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative mx-auto mb-5">
                  <div className="inline-flex rounded-2xl bg-emerald-500/10 p-5">
                    <item.icon className="h-7 w-7 text-emerald-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-black text-emerald-400/30 text-4xl">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#080C18] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(262_83%_58%/0.3),transparent_60%)]" />
            <div className="relative p-10 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Sua próxima decisão clínica merece{" "}
                <span className="underline decoration-white/30 decoration-2 underline-offset-4">precisão</span>
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">Junte-se a profissionais que já utilizam o Posologia Clinical Hub para agilizar sua rotina e melhorar o cuidado ao paciente.</p>
              <Link to="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-emerald-700 hover:bg-white/90 transition-colors shadow-xl">
                Criar minha conta gratuita <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
