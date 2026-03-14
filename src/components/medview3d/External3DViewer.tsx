import { useRef } from "react";

interface External3DViewerProps {
  modelId: string;
  title?: string;
}

/**
 * Componente de visualização 3D externa via iframe.
 * Usa Sketchfab como placeholder inicial.
 * Preparado para integração futura com BioDigital Human API.
 * 
 * Para integração via postMessage com Sketchfab Viewer API:
 * - Carregar o script do Sketchfab Viewer API
 * - Usar iframeRef.current.contentWindow.postMessage(...)
 * - Documentação: https://sketchfab.com/developers/viewer
 */
export function External3DViewer({ modelId, title }: External3DViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedUrl = `https://sketchfab.com/models/${modelId}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_help=0&ui_settings=0&ui_inspector=0&ui_annotations=0&ui_stop=0&preload=1`;

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border bg-card">
      <iframe
        ref={iframeRef}
        title={title || "Visualizador 3D"}
        src={embedUrl}
        className="w-full h-full absolute inset-0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
