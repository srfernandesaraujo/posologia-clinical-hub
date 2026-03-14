import { useState } from "react";

interface BioDigital3DViewerProps {
  modelId: string;
  title?: string;
}

export function BioDigital3DViewer({ modelId, title }: BioDigital3DViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!modelId) {
    return (
      <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border bg-card">
        <div className="absolute inset-0 flex items-center justify-center bg-card p-4">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="rounded-full bg-primary/10 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <div>
              <p className="text-base font-medium text-foreground">Nenhum modelo carregado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione um modelo anatômico na lista do <strong>BioDigital Human</strong> para visualizar.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border bg-card">
      <iframe
        src={`https://human.biodigital.com/widget/?be=${modelId}&ui-info=false&ui-menu=false&ui-panel=false&ui-tutorial=false`}
        title={title || "BioDigital Human 3D"}
        className="w-full h-full absolute inset-0"
        allow="fullscreen; xr-spatial-tracking"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Carregando BioDigital Human...</p>
          </div>
        </div>
      )}
    </div>
  );
}
