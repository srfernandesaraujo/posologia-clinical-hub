import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "@/pages/Home";
import { LANDING_MEDIA } from "@/components/landing/mediaConfig";
import "@/i18n";

describe("Landing Page (Posologia Clinical Hub)", () => {
  it("only enables media assets that exist in public/media", () => {
    expect(LANDING_MEDIA.heroAmbient).toBe(true);
    expect(LANDING_MEDIA.founderStory).toBe(false);
    expect(LANDING_MEDIA.showreel).toBe(false);
    expect(LANDING_MEDIA.voicePatientDemo).toBe(false);
    Object.values(LANDING_MEDIA.bentoClips).forEach((enabled) => {
      expect(enabled).toBe(false);
    });
  });

  it("renders key sections, PIN room entry, interactive playground tabs, and showreel modal", () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Only the enabled hero ambient video is mounted; zero audio mounted while disabled
    expect(container.querySelectorAll("video").length).toBe(1);
    expect(container.querySelectorAll("audio").length).toBe(0);

    // PIN input validates 6 numeric digits
    const pinInput = screen.getByPlaceholderText(/PIN/i) as HTMLInputElement;
    const submitBtn = screen.getByRole("button", { name: /Entrar na sala/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(pinInput, { target: { value: "48ab291099" } });
    expect(pinInput.value).toBe("482910");
    expect(submitBtn).not.toBeDisabled();

    // Open and close Showreel modal
    const demoBtn = screen.getByRole("button", { name: /Assistir demonstração/i });
    fireEvent.click(demoBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Fechar/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Switch Interactive Playground tabs (PK -> Team -> Voice/FHIR)
    const teamTab = screen.getByRole("tab", { name: /Caso em Equipe/i });
    fireEvent.click(teamTab);
    expect(screen.getByText(/Sala PIN #482910/i)).toBeInTheDocument();

    const voiceTab = screen.getByRole("tab", { name: /Paciente-IA & FHIR R4/i });
    fireEvent.click(voiceTab);
    const fhirToggle = screen.getByRole("button", { name: /Ver como FHIR R4/i });
    fireEvent.click(fhirToggle);
    expect(screen.getByText(/MedicationRequest/i)).toBeInTheDocument();
  });
});
