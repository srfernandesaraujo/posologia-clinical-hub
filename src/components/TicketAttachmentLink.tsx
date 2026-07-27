import { useState } from "react";
import { getAttachmentSignedUrl } from "@/hooks/useSupportTickets";
import { toast } from "sonner";

export function TicketAttachmentLink({ path, name }: { path: string; name: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <button
      type="button"
      className="text-xs underline block mt-1"
      onClick={async () => {
        if (url) { window.open(url, "_blank"); return; }
        try {
          const signed = await getAttachmentSignedUrl(path);
          setUrl(signed);
          window.open(signed, "_blank");
        } catch {
          toast.error("Erro ao abrir anexo");
        }
      }}
    >
      📎 {name || "Anexo"}
    </button>
  );
}
