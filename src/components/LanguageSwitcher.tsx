import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={i18n.language?.substring(0, 2) || "pt"} onValueChange={(v) => i18n.changeLanguage(v)}>
        <SelectTrigger className="h-8 w-[70px] text-xs border-border bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((l) => (
            <SelectItem key={l.code} value={l.code} className="text-xs">
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
