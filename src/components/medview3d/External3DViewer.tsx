import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

export interface SketchfabApi {
  start: (callback?: () => void) => void;
  stop: () => void;
  addEventListener: (event: string, callback: (...args: any[]) => void) => void;
  removeEventListener: (event: string, callback: (...args: any[]) => void) => void;
  getSceneGraph: (callback: (err: any, result: any) => void) => void;
  getNodeMap: (callback: (err: any, result: any) => void) => void;
  hide: (instanceId: number, callback?: (err: any) => void) => void;
  show: (instanceId: number, callback?: (err: any) => void) => void;
  setBackground: (options: any, callback?: (err: any) => void) => void;
  setCameraLookAt: (position: number[], target: number[], duration?: number, callback?: (err: any) => void) => void;
  recenterCamera: (callback?: (err: any) => void) => void;
  focusOnVisibleGeometries: (callback?: (err: any) => void) => void;
  getAnimations: (callback: (err: any, animations: any[]) => void) => void;
  setCurrentAnimationByUID: (uid: string, callback?: (err: any) => void) => void;
  play: (callback?: (err: any) => void) => void;
  pause: (callback?: (err: any) => void) => void;
  seekTo: (time: number, callback?: (err: any) => void) => void;
  setSpeed: (speed: number, callback?: (err: any) => void) => void;
  getCycleMode: (callback: (err: any, mode: string) => void) => void;
  getScreenShot: (width: number, height: number, callback: (err: any, result: string) => void) => void;
  getMaterialList: (callback: (err: any, materials: any[]) => void) => void;
  setMaterial: (material: any, callback?: (err: any) => void) => void;
  [key: string]: any;
}

export interface External3DViewerHandle {
  api: SketchfabApi | null;
  isReady: boolean;
}

interface External3DViewerProps {
  modelId: string;
  title?: string;
  onApiReady?: (api: SketchfabApi) => void;
}

declare global {
  interface Window {
    Sketchfab: any;
  }
}

// Load the Sketchfab Viewer API script once
let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadSketchfabScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const External3DViewer = forwardRef<External3DViewerHandle, External3DViewerProps>(
  ({ modelId, title, onApiReady }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [api, setApi] = useState<SketchfabApi | null>(null);
    const [isReady, setIsReady] = useState(false);
    const clientRef = useRef<any>(null);
    const onApiReadyRef = useRef(onApiReady);
    onApiReadyRef.current = onApiReady;

    useImperativeHandle(ref, () => ({ api, isReady }), [api, isReady]);

    const initViewer = useCallback(async () => {
      if (!iframeRef.current || !modelId) return;

      // Cleanup previous
      setApi(null);
      setIsReady(false);

      try {
        await loadSketchfabScript();
      } catch {
        console.error("Failed to load Sketchfab Viewer API script");
        return;
      }

      if (!window.Sketchfab) {
        console.error("Sketchfab not available on window");
        return;
      }

      const client = new window.Sketchfab(iframeRef.current);
      clientRef.current = client;

      client.init(modelId, {
        success: (apiInstance: SketchfabApi) => {
          apiInstance.start();
          apiInstance.addEventListener("viewerready", () => {
            setApi(apiInstance);
            setIsReady(true);
            onApiReady?.(apiInstance);
          });
        },
        error: () => {
          console.error("Sketchfab Viewer API initialization error");
        },
        autostart: 1,
        ui_theme: "dark",
        ui_infos: 0,
        ui_watermark: 0,
        ui_watermark_link: 0,
        ui_help: 0,
        ui_settings: 0,
        ui_inspector: 0,
        ui_annotations: 0,
        ui_stop: 0,
        preload: 1,
        transparent: 0,
      });
    }, [modelId, onApiReady]);

    useEffect(() => {
      initViewer();
    }, [initViewer]);

    return (
      <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border bg-card">
        <iframe
          ref={iframeRef}
          title={title || "Visualizador 3D"}
          src=""
          className="w-full h-full absolute inset-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Carregando modelo 3D...</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

External3DViewer.displayName = "External3DViewer";
