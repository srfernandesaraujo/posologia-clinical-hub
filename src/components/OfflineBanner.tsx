import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 pointer-events-none">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-4 flex items-start gap-3 pointer-events-auto">
        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
          <WifiOff className="h-4 w-4 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Modo offline.</span>{" "}
          As calculadoras continuam funcionando, mas os resultados não serão salvos no histórico até você reconectar.
        </p>
      </div>
    </div>
  );
}
