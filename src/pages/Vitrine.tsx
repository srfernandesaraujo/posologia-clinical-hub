import { Link } from "react-router-dom";
import {
  Calculator, FlaskConical, Gamepad2, ArrowRight, Heart, Brain,
  Activity, Zap, Shield, Pill, Beaker, Stethoscope, Syringe,
  TrendingUp, BookOpen, Users, Sparkles, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const calculadoras = [
  { name: "Risco Cardiovascular", desc: "Escore de Framingham e estratificação de risco com base em fatores clínicos.", icon: Heart, color: "text-red-400 bg-red-500/10" },
  { name: "CKD-EPI", desc: "Estimativa da taxa de filtração glomerular para avaliação da função renal.", icon: Activity, color: "text-blue-400 bg-blue-500/10" },
  { name: "Wells Score (TEP)", desc: "Probabilidade pré-teste de tromboembolismo pulmonar com critérios validados.", icon: Zap, color: "text-orange-400 bg-orange-500/10" },
  { name: "MELD Score", desc: "Classificação de gravidade de doença hepática para priorização de transplante.", icon: Activity, color: "text-amber-400 bg-amber-500/10" },
  { name: "Equivalência de Opióides", desc: "Conversão segura entre opióides com fator de equivalência atualizado.", icon: Syringe, color: "text-purple-400 bg-purple-500/10" },
  { name: "Vancomicina AUC/MIC", desc: "Monitoramento farmacocinético com cálculo de AUC para dosagem otimizada.", icon: Beaker, color: "text-teal-400 bg-teal-500/10" },
];

const simuladores = [
  { name: "Simulador de PRM", desc: "Identifique Problemas Relacionados a Medicamentos em casos clínicos interativos.", icon: Stethoscope, color: "text-emerald-400 bg-emerald-500/10" },
  { name: "TDM - Monitorização Terapêutica", desc: "Simule dosagens e ajustes farmacocinéticos em tempo real.", icon: TrendingUp, color: "text-cyan-400 bg-cyan-500/10" },
  { name: "Simulador de Interações", desc: "Avalie interações medicamentosas via enzimas CYP com casos práticos.", icon: FlaskConical, color: "text-rose-400 bg-rose-500/10" },
  { name: "Equilíbrio Ácido-Base", desc: "Manipule variáveis gasométricas e visualize compensações fisiológicas.", icon: Activity, color: "text-indigo-400 bg-indigo-500/10" },
];

const jogos = [
  { name: "Milionário da Farmacologia", desc: "Teste seus conhecimentos em farmacologia no formato do Quem Quer Ser Milionário.", icon: Crown, color: "text-yellow-400 bg-yellow-500/10" },
  { name: "Código Azul", desc: "Tome decisões rápidas em emergências clínicas simuladas.", icon: Zap, color: "text-blue-400 bg-blue-500/10" },
  { name: "Detetive Toxicológico", desc: "Investigue intoxicações e identifique substâncias com base nos sintomas.", icon: Brain, color: "text-purple-400 bg-purple-500/10" },
  { name: "Batalha Naval Clínica", desc: "Encontre diagnósticos e tratamentos em um tabuleiro interativo.", icon: Gamepad2, color: "text-emerald-400 bg-emerald-500/10" },
];

function ToolCard({ name, desc, icon: Icon, color }: { name: string; desc: string; icon: any; color: string }) {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all">
      <div className={`rounded-xl p-3 w-fit mb-4 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-white font-semibold mb-2">{name}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Vitrine() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(168_80%_36%/0.15),transparent)]" />
        <div className="relative container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Conheça nossas ferramentas</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Ferramentas clínicas que fazem{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">a diferença</span>
          </h1>
          <p className="text-lg text-white/50 mb-8 max-w-2xl mx-auto">
            Calculadoras validadas, simuladores interativos e jogos educativos projetados para profissionais de saúde, educadores e estudantes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/cadastro">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-8 gap-2">
                Criar conta gratuita <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/15 text-white/80 hover:bg-white/5">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Calculadoras */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-6 w-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Calculadoras Clínicas</h2>
          </div>
          <p className="text-white/40 mb-10 max-w-xl">Scores, fórmulas e índices validados pela literatura para uso no ponto de cuidado.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculadoras.map(c => <ToolCard key={c.name} {...c} />)}
          </div>
          <p className="text-center text-white/30 text-sm mt-6">E mais de 15 outras calculadoras disponíveis na plataforma</p>
        </div>
      </section>

      {/* Simuladores */}
      <section className="py-16 md:py-20 border-t border-white/[0.04]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <FlaskConical className="h-6 w-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Simuladores Interativos</h2>
          </div>
          <p className="text-white/40 mb-10 max-w-xl">Cenários clínicos dinâmicos para prática segura de raciocínio farmacoterapêutico.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {simuladores.map(s => <ToolCard key={s.name} {...s} />)}
          </div>
          <p className="text-center text-white/30 text-sm mt-6">Mais de 25 simuladores de fisiologia, bioquímica e farmácia clínica</p>
        </div>
      </section>

      {/* Jogos */}
      <section className="py-16 md:py-20 border-t border-white/[0.04]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Gamepad2 className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Jogos Clínicos</h2>
          </div>
          <p className="text-white/40 mb-10 max-w-xl">Aprendizado gamificado com narrativas clínicas envolventes geradas por IA.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {jogos.map(j => <ToolCard key={j.name} {...j} />)}
          </div>
          <p className="text-center text-white/30 text-sm mt-6">Mais de 20 jogos com diferentes mecânicas e níveis de dificuldade</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.08] to-transparent p-10 md:p-14">
            <Shield className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Pronto para elevar sua prática clínica?</h2>
            <p className="text-white/50 mb-8">Crie sua conta gratuita e tenha acesso imediato às calculadoras essenciais. Faça upgrade para Premium e desbloqueie todas as ferramentas.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/cadastro">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-8 gap-2">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/planos">
                <Button size="lg" variant="outline" className="border-white/15 text-white/80 hover:bg-white/5">
                  Ver planos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
