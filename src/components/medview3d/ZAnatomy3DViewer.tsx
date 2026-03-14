import { useState } from "react";

interface ZAnatomy3DViewerProps {
  title?: string;
}

export function ZAnatomy3DViewer({ title }: ZAnatomy3DViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border bg-card">
      <iframe
        src="https://www.z-anatomy.com"
        title={title || "Z-Anatomy 3D Atlas"}
        className="w-full h-full absolute inset-0"
        allow="fullscreen; xr-spatial-tracking"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Carregando Z-Anatomy...</p>
          </div>
        </div>
      )}
    </div>
  );
}
