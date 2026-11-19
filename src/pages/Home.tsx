import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowDown, ArrowRight, Beaker, BookOpen, Calculator, DoorOpen, FlaskConical, Gamepad2, GraduationCap, MousePointer2, Sparkles, Users } from "lucide-react";
import { SalesAgent } from "@/components/SalesAgent";
import "./home-cinematic.css";

const tools = [
  { icon: FlaskConical, title: "Simuladores interativos", text: "Experimente hipóteses e acompanhe as respostas de cada cenário.", link: "/simuladores", number: "01" },
  { icon: Calculator, title: "Calculadoras clínicas", text: "Tenha fórmulas e escores à mão para apoiar a prática.", link: "/calculadoras", number: "02" },
  { icon: Beaker, title: "Laboratório virtual", text: "Explore processos e experimentos em bancadas digitais.", link: "/laboratorio-virtual", number: "03" },
  { icon: Users, title: "Salas virtuais", text: "Compartilhe atividades e transforme a discussão em aprendizado coletivo.", link: "/salas-virtuais", number: "04" },
  { icon: Gamepad2, title: "Jogos educativos", text: "Revise conceitos e exercite decisões de um jeito envolvente.", link: "/jogos-clinicos", number: "05" },
  { icon: GraduationCap, title: "Para quem ensina", text: "Crie experiências que aproximam teoria, prática e discussão.", link: "/vitrine", number: "06" },
];

function SimulationCard() {
  const [dose, setDose] = useState(50);
  const height = 38 + dose * 0.75;
  const path = `M 0 155 C 45 155, 55 ${155 - height}, 115 ${155 - height} S 205 ${145 - height * 0.45}, 290 ${150 - height * 0.25} S 350 145, 400 148`;
  return (
    <div className="sim-card">
      <div className="sim-card-top"><div><span className="sim-eyebrow"><span className="live-dot" /> EXPERIÊNCIA INTERATIVA</span><h3>Uma decisão. Novos caminhos.</h3><p>Explore uma resposta simulada</p></div><Activity size={20} /></div>
      <div className="sim-chart" aria-hidden="true">
        <div className="chart-label">RESPOSTA AO LONGO DO TEMPO</div>
        <svg viewBox="0 0 400 170" preserveAspectRatio="none"><defs><linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#78f4cd" stopOpacity=".28"/><stop offset="100%" stopColor="#78f4cd" stopOpacity="0"/></linearGradient></defs><path d={`${path} L 400 170 L 0 170 Z`} fill="url(#curve-fill)"/><path d={path} fill="none" stroke="#8cf5d1" strokeWidth="3" strokeLinecap="round"/></svg>
        <div className="chart-axis"><span>INÍCIO</span><span>TEMPO →</span></div>
      </div>
      <div className="sim-control"><div className="sim-control-title"><label htmlFor="demo-dose">Intensidade da intervenção</label><span>{dose}%</span></div><input id="demo-dose" type="range" min="0" max="100" value={dose} onChange={e => setDose(Number(e.target.value))} aria-describedby="demo-note"/><div className="sim-control-bottom"><span>MENOR</span><span>MAIOR</span></div></div>
      <div className="sim-hint"><MousePointer2 size={15}/><span>Arraste o controle e observe a curva mudar.</span></div>
      <p id="demo-note" className="sim-disclaimer">Demonstração ilustrativa, sem valores clínicos.</p>
      <Link className="sim-real-link" to="/simuladores/tdm">Conheça o simulador TDM <ArrowRight size={14}/></Link>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [roomPin, setRoomPin] = useState("");
  const storyRef = useRef<HTMLElement>(null);
  const filmRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = [storyRef.current, filmRef.current].filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      sections.forEach(section => {
        const bounds = section.getBoundingClientRect();
        const distance = section.offsetHeight - window.innerHeight;
        const progress = distance > 0 ? Math.min(1, Math.max(0, -bounds.top / distance)) : 0;
        section.style.setProperty("--story-progress", String(progress));
        section.style.setProperty("--story-scale", String(1.12 - progress * 0.12));
        section.style.setProperty("--story-rotate", `${(1 - progress) * -8}deg`);
        section.style.setProperty("--story-shift", `${(1 - progress) * 35}px`);
        section.style.setProperty("--story-shift-up", `${(1 - progress) * -35}px`);
        section.style.setProperty("--film-scale", String(1.12 - progress * 0.12));
        section.style.setProperty("--film-shift", `${progress * -4}%`);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);

  return (
    <main className="cinematic-home">
      <section className="cinema-hero">
        <div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/><div className="hero-grid"/>
        <div className="cinema-wrap hero-layout">
          <div className="hero-copy">
            <div className="cinema-kicker"><span /> POSOLOGIA CLINICAL HUB <span className="kicker-line" /> APRENDER É EXPERIMENTAR</div>
            <h1>O conhecimento ganha <em>vida</em> quando você experimenta.</h1>
            <p>Da teoria à decisão: explore cenários, observe resultados e desenvolva seu raciocínio em um universo interativo de saúde.</p>
            <form id="sala-virtual" className="hero-room" onSubmit={e => { e.preventDefault(); if (roomPin.length === 6) navigate(`/sala?pin=${roomPin}`); }}>
              <div className="hero-room-heading"><span className="hero-room-icon"><DoorOpen size={19}/></span><div><strong>Recebeu um PIN do professor?</strong><span>Entre diretamente na sua sala virtual.</span></div><span className="hero-room-badge">SALA VIRTUAL</span></div>
              <div className="hero-room-controls"><label className="sr-only" htmlFor="room-pin">PIN da sala com 6 números</label><input id="room-pin" inputMode="numeric" autoComplete="off" value={roomPin} onChange={e => setRoomPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Digite o PIN de 6 números" maxLength={6}/><button type="submit" disabled={roomPin.length !== 6}>Entrar na sala <ArrowRight size={18}/></button></div>
            </form>
            <div className="cinema-actions"><Link className="cinema-button primary" to="/cadastro">Começar a explorar <ArrowRight size={18}/></Link><a className="cinema-button secondary" href="#experiencia">Descubra como funciona <ArrowDown size={17}/></a></div>
          </div>
          <div className="hero-visual"><div className="visual-ring ring-one"/><div className="visual-ring ring-two"/><div className="visual-cross cross-one">+</div><div className="visual-cross cross-two">+</div><div className="visual-caption">SIMULE <span> / </span> OBSERVE <span> / </span> DECIDA</div><div className="visual-backplate" aria-hidden="true"><span>CLINICAL<br/>PLAYGROUND</span><div className="backplate-lines"/><b>✳</b></div><div className="visual-tag visual-tag-one" aria-hidden="true"><Sparkles size={15}/> IDEIAS EM MOVIMENTO</div><SimulationCard/><div className="visual-tag visual-tag-two" aria-hidden="true">01 — EXPERIÊNCIA INTERATIVA <span>↗</span></div><div className="floating-note"><span className="floating-icon"><Activity size={17}/></span><span><strong>O aprendizado em movimento</strong><small>Experimente quantas vezes quiser</small></span></div></div>
        </div>
        <a className="scroll-cue" href="#experiencia"><span>ROLE PARA EXPLORAR</span><span className="scroll-line"/></a>
      </section>

      <div className="cinema-marquee" aria-hidden="true"><div className="marquee-track">{[0, 1].map(i => <span key={i}>SIMULE <b>✳</b> EXPERIMENTE <b>✳</b> DESCUBRA <b>✳</b> COMPARTILHE <b>✳</b> </span>)}</div></div>

      <section className="film-section" ref={filmRef} aria-labelledby="film-title">
        <div className="film-sticky">
          <div className="film-image" aria-hidden="true" />
          <div className="film-shade" />
          <div className="cinema-wrap film-content">
            <div className="film-intro"><span className="section-index">A EXPERIÊNCIA POSOLOGIA / 01</span><h2 id="film-title">Toda decisão começa com uma <em>pergunta.</em></h2><p>Imagine uma turma diante de um caso. Cada escolha abre uma nova possibilidade de aprender.</p></div>
            <div className="film-chapters"><div><span>01 / ENTRE</span><strong>Um caso ganha vida.</strong><p>Acesse a sala e conheça o cenário proposto pelo professor.</p></div><div><span>02 / EXPERIMENTE</span><strong>Mude a perspectiva.</strong><p>Explore os controles e observe o que acontece na simulação.</p></div><div><span>03 / DISCUTA</span><strong>Decidam juntos.</strong><p>Compare possibilidades e transforme resultados em conversa.</p></div></div>
          </div>
          <div className="film-frame" aria-hidden="true"><span>POSOLOGIA CLINICAL HUB</span><span>UMA NOVA FORMA DE APRENDER ↗</span></div>
        </div>
      </section>

      <section id="experiencia" className="story-section" ref={storyRef}>
        <div className="story-sticky"><div className="cinema-wrap story-layout"><div className="story-copy"><span className="section-index">01 / A EXPERIÊNCIA</span><h2>Aprender deixa de ser apenas <em>observar.</em></h2><p>Em vez de imaginar o que aconteceria, você pode experimentar. Ajuste uma variável, acompanhe a resposta e use o que vê para construir sua próxima decisão.</p><a href="#ferramentas" className="text-link">Explore as possibilidades <ArrowRight size={17}/></a></div><div className="story-visual"><div className="story-orbit"/><div className="story-core"><Activity size={40}/><span>CONHECIMENTO<br/><strong>EM AÇÃO</strong></span></div><div className="story-step step-one"><span>01</span><strong>Ajuste</strong><small>Explore uma hipótese</small></div><div className="story-step step-two"><span>02</span><strong>Observe</strong><small>Veja o cenário responder</small></div><div className="story-step step-three"><span>03</span><strong>Decida</strong><small>Interprete e discuta</small></div></div></div><div className="story-progress"><span/><span/><span/></div></div>
      </section>

      <section id="ferramentas" className="cinema-section tools-section"><div className="cinema-wrap"><div className="section-heading"><div><span className="section-index">02 / UM UNIVERSO DE POSSIBILIDADES</span><h2>Uma plataforma.<br/><em>Muitas formas de aprender.</em></h2></div><p>Ferramentas para acompanhar você na sala de aula, nos estudos e na construção do raciocínio clínico.</p></div><div className="tools-grid">{tools.map(({icon: Icon, title, text, link, number}) => <Link className="tool-tile" to={link} key={title}><div className="tool-tile-top"><Icon size={23}/><span>{number}</span></div><div><h3>{title}</h3><p>{text}</p></div><ArrowRight className="tool-arrow" size={19}/></Link>)}</div></div></section>

      <section className="cinema-section everyday-section"><div className="cinema-wrap everyday-layout"><div><span className="section-index">03 / DO SEU JEITO</span><h2>Mais perguntas.<br/><em>Mais descobertas.</em></h2><p>Estude no seu ritmo, experimente alternativas e leve novas perguntas para a discussão. Para professores, cada cenário também pode ser um ponto de partida para aprender em grupo.</p><Link to="/vitrine" className="text-link">Conheça as ferramentas <ArrowRight size={17}/></Link></div><div className="everyday-panel"><div className="panel-line"><BookOpen/><div><strong>Para quem aprende</strong><p>Conecte conceitos a situações que respondem às suas escolhas.</p></div></div><div className="panel-line"><Users/><div><strong>Para quem ensina</strong><p>Proponha cenários, estimule a participação e discuta possibilidades.</p></div></div><div className="panel-line"><Activity/><div><strong>Para a prática</strong><p>Consulte ferramentas e desenvolva seu raciocínio ao longo da jornada.</p></div></div></div></div></section>

      <section className="final-section"><div className="final-glow"/><div className="cinema-wrap final-content"><span className="section-index">O PRÓXIMO PASSO É SEU</span><h2>O que você vai<br/><em>descobrir hoje?</em></h2><p>Comece a explorar o Posologia Clinical Hub.</p><div className="cinema-actions"><Link to="/cadastro" className="cinema-button primary">Criar minha conta <ArrowRight size={18}/></Link><Link to="/login" className="cinema-button secondary">Já tenho uma conta</Link></div><Link to="/docs" className="final-docs">Conheça a documentação <ArrowRight size={14}/></Link></div></section>
      <SalesAgent />
    </main>
  );
}
