

## Problems Identified

### 1. Toolbar buttons don't affect the 3D model
The toolbar receives `api` via `viewerRef.current?.api`, but **refs don't trigger re-renders**. When the viewer finishes loading and sets `api` in state, the parent component (`CardiologiaStent`) never re-renders, so the toolbar always receives `null`. The buttons then hit the `"Aguarde o modelo carregar..."` guard and do nothing.

**Fix**: Store the `api` instance in parent state via the `onApiReady` callback instead of reading it from `ref.current` during render.

### 2. Procedure Timeline is disconnected from the 3D viewer
The timeline and step card at the bottom are purely informational — changing steps only updates text. The user expects the 3D model to change (camera angle, visibility, annotations) as they navigate steps.

**Fix**: Each `ProcedureStep` can optionally include a `modelId` (to swap models per step) and/or a callback that uses the Sketchfab API to adjust the camera, hide/show nodes, or trigger annotations when the step changes. We'll implement step-change callbacks that call `recenterCamera` and attempt to use `setCameraLookAt` or `show/hide` relevant structures per step.

## Plan

### Step 1: Fix toolbar API connection (all 6 procedure pages)
- Add `const [viewerApi, setViewerApi] = useState<SketchfabApi | null>(null)` and `const [viewerReady, setViewerReady] = useState(false)` to each page.
- Pass `onApiReady={(api) => { setViewerApi(api); setViewerReady(true); }}` to `External3DViewer`.
- Pass `api={viewerApi} isReady={viewerReady}` to `MedViewToolbar`.

### Step 2: Integrate timeline with 3D viewer
- When `currentStep` changes, call Sketchfab API to:
  - `recenterCamera()` as baseline reset.
  - If the step has a different `modelId`, swap the model.
  - Use camera presets or node visibility to highlight relevant anatomy per step.
- Add a `useEffect` watching `[currentStep, viewerApi]` that triggers these transitions.
- Each procedure page's steps can optionally define `modelId` to load a different model per step, or use camera/visibility commands on the same model.

### Step 3: Remove duplicate info (ProcedureStepCard)
- The `ProcedureStepCard` below the timeline duplicates the info already shown inside `ProcedureTimeline`. Remove or consolidate into one component.

### Files to edit
- `src/pages/medview3d/CardiologiaStent.tsx` (and all 5 other procedure pages similarly)
- `src/components/medview3d/External3DViewer.tsx` — no changes needed, already supports `onApiReady`

