interface CaseCardMetaProps {
  caseItem: any;
}

export function CaseCardMeta({ caseItem: c }: CaseCardMetaProps) {
  return (
    <>
      {c._diagnosis && (
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-semibold">Diagnóstico:</span> {c._diagnosis}
        </p>
      )}
      {(c._description || c.scenario) && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {c._description || c.scenario}
        </p>
      )}
      {c._authorName && (
        <p className="text-xs text-muted-foreground/70 mt-1">Por {c._authorName}</p>
      )}
      {c.is_marketplace && (
        <span className="inline-block mt-1 text-xs text-primary font-medium">📢 Marketplace</span>
      )}
    </>
  );
}
