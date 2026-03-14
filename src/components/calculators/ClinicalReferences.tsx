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
  "vancomicina-auc": [
    { title: "IDSA/ASHP/SIDP Vancomycin Therapeutic Monitoring Guidelines", source: "Am J Health-Syst Pharm", year: "2020", url: "https://doi.org/10.1093/ajhp/zxaa036" },
    { title: "AUC-Guided Vancomycin Dosing", source: "Clin Infect Dis", year: "2020" },
    { title: "Vancomycin Pharmacokinetics in Critically Ill", source: "Antimicrob Agents Chemother", year: "2019" },
  ],
  "insulina-basal-bolus": [
    { title: "ADA Standards of Care: Glycemic Management in Hospital", source: "Diabetes Care", year: "2024", url: "https://doi.org/10.2337/dc24-Sint" },
    { title: "RABBIT 2 Trial: Basal-Bolus vs Sliding Scale", source: "NEJM", year: "2007" },
    { title: "Endocrine Society: Management of Hyperglycemia in Hospitalized Patients", source: "JCEM", year: "2022" },
  ],
  "holliday-segar": [
    { title: "Holliday MA, Segar WE. Maintenance need for water", source: "Pediatrics", year: "1957" },
    { title: "Fluid and Electrolyte Management in Children", source: "Nelson Textbook of Pediatrics", year: "2023" },
    { title: "NICE Guideline: IV Fluid Therapy in Children", source: "NICE", year: "2020" },
  ],
  "meld-score": [
    { title: "MELD Score for Liver Transplant Allocation", source: "Hepatology", year: "2001", url: "https://doi.org/10.1053/jhep.2001.22172" },
    { title: "MELD-Na for Liver Transplant", source: "Gastroenterology", year: "2008" },
    { title: "Child-Pugh Classification", source: "Br J Surg", year: "1973" },
  ],
  "qtc-corrigido": [
    { title: "QT Interval Correction Formulas", source: "JACC", year: "2017" },
    { title: "Drug-Induced QT Prolongation", source: "Circulation", year: "2010", url: "https://doi.org/10.1161/CIRCULATIONAHA.109.868570" },
    { title: "CredibleMeds QTDrugs List", source: "CredibleMeds.org", year: "2024", url: "https://crediblemeds.org" },
  ],
  "dose-pediatrica": [
    { title: "Nelson Textbook of Pediatrics: Drug Dosages", source: "Elsevier", year: "2023" },
    { title: "BNF for Children (BNFC)", source: "BMJ/Pharmaceutical Press", year: "2024" },
    { title: "Harriet Lane Handbook", source: "Johns Hopkins", year: "2024" },
  ],
  "rass-sedacao": [
    { title: "PADIS Guidelines: Pain, Agitation/Sedation, Delirium, Immobility, Sleep", source: "Crit Care Med", year: "2018", url: "https://doi.org/10.1097/CCM.0000000000002806" },
    { title: "Richmond Agitation-Sedation Scale (RASS)", source: "Am J Respir Crit Care Med", year: "2002" },
    { title: "Daily Sedation Interruption", source: "NEJM", year: "2000" },
  ],
  "nutricao-parenteral": [
    { title: "ASPEN Guidelines for Parenteral Nutrition", source: "JPEN", year: "2023", url: "https://doi.org/10.1002/jpen.2525" },
    { title: "ESPEN Guideline on Parenteral Nutrition", source: "Clin Nutr", year: "2018" },
    { title: "Harris-Benedict Equation", source: "Proc Natl Acad Sci", year: "1918" },
  ],
  "interacoes-cyp": [
    { title: "Cytochrome P450 Drug Interaction Table", source: "Indiana University", year: "2024", url: "https://drug-interactions.medicine.iu.edu" },
    { title: "Drug Metabolism and CYP450 Interactions", source: "Clin Pharmacol Ther", year: "2021" },
    { title: "FDA Guidance on Drug Interaction Studies", source: "FDA", year: "2020" },
  ],
  "adesao-oncologia": [
    { title: "ARMS: Adherence to Refills and Medications Scale", source: "Ann Pharmacother", year: "2007", url: "https://doi.org/10.1345/aph.1H413" },
    { title: "MASCC MOATT — Oral Agent Teaching Tool", source: "Support Care Cancer", year: "2010" },
    { title: "Morisky Medication Adherence Scales (MMAS-4/8)", source: "J Clin Hypertens", year: "2008" },
    { title: "Adherence to Oral Anticancer Agents", source: "J Oncol Pharm Pract", year: "2019" },
  ],
  "toxicidade-antineoplasicos": [
    { title: "CARG Toxicity Score for Older Adults with Cancer", source: "Cancer", year: "2011", url: "https://doi.org/10.1002/cncr.26094" },
    { title: "CRASH Score — Chemotherapy Risk Assessment Scale for High-Age Patients", source: "Cancer", year: "2012", url: "https://doi.org/10.1002/cncr.27284" },
    { title: "ESC Cardio-Oncology Guidelines (HFA-ICOS)", source: "European Heart Journal", year: "2022", url: "https://doi.org/10.1093/eurheartj/ehac244" },
    { title: "Practical Assessment of Older Adults with Cancer", source: "J Clin Oncol", year: "2021" },
  ],
  "ajuste-dose-oncologico": [
    { title: "Calvert AH et al. Carboplatin Dosage: Prospective Evaluation", source: "J Clin Oncol", year: "1989", url: "https://doi.org/10.1200/JCO.1989.7.11.1748" },
    { title: "Cockcroft DW, Gault MH. Prediction of Creatinine Clearance", source: "Nephron", year: "1976" },
    { title: "NCI Organ Dysfunction Working Group (NCI-ODWG)", source: "J Clin Oncol", year: "2006" },
    { title: "Child-Pugh Classification for TKI Dose Adjustment", source: "Hepatology", year: "2001" },
    { title: "FDA Guidance: Pharmacokinetics in Patients with Hepatic Impairment", source: "FDA", year: "2020" },
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
