import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Layers } from "lucide-react";
import { SalesAgent } from "@/components/SalesAgent";
import { getLandingCopy } from "@/components/landing/landingCopy";
import { HeroSection } from "@/components/landing/HeroSection";
import { StorySection } from "@/components/landing/StorySection";
import { DomainPillarsSection } from "@/components/landing/DomainPillarsSection";
import { InteractiveDemoSection } from "@/components/landing/InteractiveDemoSection";
import { ProductShowcaseBento } from "@/components/landing/ProductShowcaseBento";
import { WorkflowGraphSection } from "@/components/landing/WorkflowGraphSection";
import { AuthorityVideoSection } from "@/components/landing/AuthorityVideoSection";
import { ShowreelModal } from "@/components/landing/ShowreelModal";
import { Reveal } from "@/components/landing/Reveal";
import "./home-landing.css";

export default function Home() {
  const { i18n } = useTranslation();
  const [showreelOpen, setShowreelOpen] = useState(false);

  const copy = getLandingCopy(i18n.language);

  return (
    <div className="landing-page">
      <HeroSection copy={copy.hero} onOpenDemo={() => setShowreelOpen(true)} />

      <StorySection copy={copy.story} />

      <DomainPillarsSection copy={copy.pillars} />

      <InteractiveDemoSection copy={copy.playground} />

      <ProductShowcaseBento copy={copy.bento} />

      <WorkflowGraphSection copy={copy.workflow} />

      <AuthorityVideoSection copy={copy.authority} />

      {/* Final Conversion CTA */}
      <section className="lp-final-cta" aria-labelledby="lp-final-title">
        <div className="lp-wrap">
          <Reveal>
            <div className="lp-final-card">
              <span className="lp-section-eyebrow">{copy.finalCta.eyebrow}</span>
              <h2 id="lp-final-title">{copy.finalCta.title}</h2>
              <p>{copy.finalCta.subtitle}</p>
              <div className="lp-final-actions">
                <Link to="/cadastro" className="lp-btn lp-btn-primary">
                  <span>{copy.finalCta.primary}</span>
                  <ArrowRight size={17} />
                </Link>
                <Link to="/login" className="lp-btn lp-btn-glass">
                  <span>{copy.finalCta.secondary}</span>
                </Link>
              </div>
              <div className="lp-final-links">
                <Link to="/docs">
                  <BookOpen size={14} />
                  <span>{copy.finalCta.docsLink}</span>
                </Link>
                <Link to="/planos">
                  <Layers size={14} />
                  <span>{copy.finalCta.plansLink}</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <ShowreelModal
        open={showreelOpen}
        onClose={() => setShowreelOpen(false)}
        copy={copy.showreel}
      />

      <SalesAgent />
    </div>
  );
}
