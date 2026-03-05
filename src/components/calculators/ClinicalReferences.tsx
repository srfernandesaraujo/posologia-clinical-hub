import { BookOpen, ExternalLink } from "lucide-react";

interface Reference {
  title: string;
  source: string;
  url?: string;
  year?: string;
}

interface ClinicalReferencesProps {
  references: Reference[];
}

const CALCULATOR_REFERENCES: Record<string, Reference[]> = {
  "risco-cardiovascular": [
    { title: "ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease", source: "JACC", year: "2019", url: "https://doi.org/10.1016/j.jacc.2019.03.010" },
    { title: "SCORE2 risk prediction algorithms", source: "European Heart Journal (ESC)", year: "2021", url: "https://doi.org/10.1093/eurheartj/ehab309" },
    { title: "General Cardiovascular Risk Profile (Framingham)", source: "Circulation", year: "2008", url: "https://doi.org/10.1161/CIRCULATIONAHA.107.699579" },
  ],
  "desmame-corticoide": [
    { title: "Diagnosis and Treatment of Primary Adrenal Insufficiency", source: "Endocrine Society", year: "2016", url: "https://doi.org/10.1210/jc.2015-1710" },
    { title: "Glucocorticoid Withdrawal Strategies", source: "UpToDate", year: "2024" },
    { title: "Corticosteroid Tapering in Rheumatic Diseases", source: "Nat Rev Rheumatol", year: "2022" },
  ],
  "equivalencia-opioides": [
    { title: "CDC Clinical Practice Guideline for Prescribing Opioids", source: "MMWR", year: "2022", url: "https://doi.org/10.15585/mmwr.rr7103a1" },
    { title: "Opioid Equianalgesic Tables", source: "Palliat Med", year: "2016" },
    { title: "Clinical Guidelines for Opioid Rotation", source: "J Pain Symptom Manage", year: "2009" },
  ],
  "ajuste-dose-renal": [
    { title: "KDIGO 2024 Clinical Practice Guideline for CKD", source: "Kidney International", year: "2024", url: "https://kdigo.org/guidelines/ckd-evaluation-and-management/" },
    { title: "Drug Prescribing in Renal Failure (Aronoff)", source: "ACP Press", year: "2007" },
    { title: "CKD-EPI Creatinine Equation (2021)", source: "NEJM", year: "2021", url: "https://doi.org/10.1056/NEJMoa2102953" },
  ],
  "equivalencia-antidepressivos": [
    { title: "APA Practice Guidelines for MDD", source: "American Psychiatric Association", year: "2023" },
    { title: "Dose Equivalents of Antidepressants (Hayasaka)", source: "J Affect Disord", year: "2015" },
    { title: "Switching Antidepressants: Guidance", source: "Maudsley Prescribing Guidelines", year: "2021" },
  ],
  "homa-ir": [
    { title: "ADA Standards of Medical Care in Diabetes", source: "Diabetes Care", year: "2024", url: "https://doi.org/10.2337/dc24-Sint" },
    { title: "HOMA: Homeostasis Model Assessment", source: "Diabetologia", year: "1985" },
    { title: "Insulin Resistance and Metabolic Syndrome", source: "Endocrine Society", year: "2022" },
  ],
  "findrisc": [
    { title: "Finnish Diabetes Risk Score (FINDRISC)", source: "Diabetes Care", year: "2003", url: "https://doi.org/10.2337/diacare.26.3.725" },
    { title: "IDF Consensus on Type 2 Diabetes Prevention", source: "Int Diabetes Federation", year: "2007" },
    { title: "Screening for Prediabetes and T2DM", source: "ADA Standards", year: "2024" },
  ],
  "ckd-epi": [
    { title: "New Creatinine- and Cystatin C–Based Equations (CKD-EPI 2021)", source: "NEJM", year: "2021", url: "https://doi.org/10.1056/NEJMoa2102953" },
    { title: "KDIGO 2024 Clinical Practice Guideline for CKD", source: "Kidney International", year: "2024", url: "https://kdigo.org/guidelines/ckd-evaluation-and-management/" },
    { title: "Removing Race From eGFR Calculations", source: "NEJM", year: "2021" },
  ],
  "correcao-sodio": [
    { title: "Diagnosis and Treatment of Hyponatremia", source: "Am J Med", year: "2013", url: "https://doi.org/10.1016/j.amjmed.2013.02.015" },
    { title: "European Hyponatremia Guidelines", source: "Eur J Endocrinol", year: "2014" },
    { title: "Correction of Hyperglycemia-Related Hyponatremia (Katz)", source: "NEJM", year: "1973" },
  ],
  "correcao-calcio": [
    { title: "Evaluation and Treatment of Hypocalcemia", source: "Endocrine Society", year: "2022" },
    { title: "Albumin-Corrected Calcium (Payne Formula)", source: "BMJ", year: "1979" },
    { title: "Management of Acute Hypercalcemia", source: "NEJM", year: "2005", url: "https://doi.org/10.1056/NEJMcp0801870" },
  ],
  "wells-score": [
    { title: "Wells Score for PE — Derivation and Validation", source: "Thromb Haemost", year: "2000" },
    { title: "Diagnosis of DVT with Wells Score", source: "Lancet", year: "1997" },
    { title: "ACEP Clinical Policy: PE", source: "Ann Emerg Med", year: "2018", url: "https://doi.org/10.1016/j.annemergmed.2018.03.005" },
  ],
  "qsofa": [
    { title: "Sepsis-3: Third International Consensus Definitions for Sepsis", source: "JAMA", year: "2016", url: "https://doi.org/10.1001/jama.2016.0287" },
    { title: "Surviving Sepsis Campaign Guidelines 2021", source: "Crit Care Med", year: "2021", url: "https://doi.org/10.1097/CCM.0000000000005337" },
    { title: "qSOFA as Screening Tool for Sepsis", source: "Chest", year: "2017" },
  ],
};

export function ClinicalReferences({ references }: ClinicalReferencesProps) {
  if (!references || references.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5" />
        Referências Clínicas
      </h3>
      <div className="space-y-2">
        {references.map((ref, i) => (
          <div key={i} className="text-xs">
            {ref.url ? (
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {ref.title}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="text-foreground/80">{ref.title}</span>
            )}
            <span className="text-muted-foreground ml-1">
              — {ref.source}{ref.year ? `, ${ref.year}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { CALCULATOR_REFERENCES };
export type { Reference };
