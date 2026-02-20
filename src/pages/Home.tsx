import { Link } from "react-router-dom";
import { Stethoscope, Calculator, FlaskConical, Zap, Shield, Users } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Calculadoras Clínicas",
    description: "Scores, índices e fórmulas validadas pela literatura médica atual.",
  },
  {
    icon: FlaskConical,
    title: "Simuladores Clínicos",
    description: "Simule cenários clínicos e treine a tomada de decisão em tempo real.",
  },
  {
    icon: Zap,
    title: "Rápido e Preciso",
    description: "Resultados instantâneos com fórmulas atualizadas e referências científicas.",
  },
  {
    icon: Shield,
    title: "Confiável",
    description: "Ferramentas revisadas e baseadas em diretrizes médicas reconhecidas.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(168_80%_36%/0.15),transparent_50%)]" />
        <div className="relative container mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">
              Plataforma gratuita
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl mx-auto leading-tight">
            Calculadoras Clínicas na
            <span className="text-gradient"> palma da mão</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Acesse dezenas de calculadoras e simuladores clínicos validados.
            Ferramenta essencial para profissionais e estudantes da saúde.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-primary px-8 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              Começar Gratuitamente
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>100% Gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Baseado em Evidências</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Ferramentas clínicas pensadas para otimizar sua rotina e apoiar suas decisões.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="rounded-3xl bg-gradient-primary p-12 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
            Crie sua conta gratuita e acesse todas as calculadoras e simuladores clínicos.
          </p>
          <Link
            to="/cadastro"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-bold text-foreground hover:bg-white/90 transition-colors"
          >
            Criar conta gratuita
          </Link>
        </div>
      </section>
    </div>
  );
}
