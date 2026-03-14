

## Problem

Every procedure page uses a single static `defaultQuery` for Sketchfab search (e.g., `"dental implant jaw mandible"` for all of Odontologia). When the user navigates different steps — implant placement vs. orthodontic movement — the search returns the same generic models. The search lacks **step-level context**.

## Solution

### 1. Add per-step search keywords to `ProcedureStep`

Each step definition gets a `searchQuery` field with specific terms for that step's anatomy/procedure:

```typescript
export interface ProcedureStep {
  stepNumber: number;
  title: string;
  description: string;
  modelId?: string;
  searchQuery?: string; // NEW — contextual search terms
}
```

Example for Odontologia:
- Step 1 (Avaliação Tomográfica): `"dental cone beam CT jaw"`
- Step 4 (Fresagem Óssea): `"dental implant drill bone"`
- Step 5 (Instalação do Implante): `"titanium dental implant fixture"`
- Step 6 (Cicatrização e Prótese): `"dental implant crown abutment"`

### 2. Auto-update search when step changes

- The `SketchfabModelSearch` component will accept a `query` prop that updates externally.
- When the user changes the step in the timeline, the search input auto-populates with that step's `searchQuery` and triggers a new search automatically.
- The search panel stays open if it was already open.

### 3. Improve search quality in the Edge Function

- Add `categories` filter for medical/science models on the Sketchfab API (`categories=science-technology`).
- Increase default result count from 4 to 8 for more variety.
- Add `license` param to filter for embeddable models.

### 4. Apply to all 6 procedure pages

Each page's steps array gets contextual `searchQuery` values tailored to that specialty:
- **Cardiologia**: stent, coronary artery, catheter, balloon angioplasty
- **Ortopedia**: knee prosthesis, hip replacement, fracture fixation
- **Cirurgia Geral**: laparoscopic trocar, appendectomy, cholecystectomy
- **Dermatologia**: skin graft, flap surgery, reconstructive
- **Farmacologia**: drug delivery device, inhaler, insulin pump
- **Odontologia**: implant, orthodontic bracket, extraction forceps

### Files to edit
- `src/components/medview3d/ProcedureTimeline.tsx` — add `searchQuery` to interface
- `src/components/medview3d/SketchfabModelSearch.tsx` — accept reactive `query` prop, auto-search on change
- `src/pages/medview3d/*.tsx` (all 6) — add `searchQuery` to each step
- `supabase/functions/search-sketchfab/index.ts` — add category filter for better relevance

