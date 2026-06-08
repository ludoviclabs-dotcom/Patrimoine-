import { cn } from "@/lib/utils";

export type LedgerRow = {
  label: string;
  value: string;
  /** Ligne mise en avant (laiton) — typiquement « Revue requise ». */
  emphasis?: boolean;
};

/**
 * Registre éditorial remplaçant le pattern « 5 tuiles identiques ».
 * Liste de définition à liseré, fonds alternés, dernière ligne accentuée.
 */
export function EvidenceLedger({
  items,
  className,
}: {
  items: LedgerRow[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "overflow-hidden rounded-[var(--r-md)] border border-border",
        className,
      )}
    >
      {items.map((row, index) => (
        <div
          key={row.label}
          className={cn(
            "grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-5",
            index % 2 === 1 && "bg-[var(--surface-soft)]",
            row.emphasis && "bg-[var(--gold-soft)]",
          )}
        >
          <dt
            className={cn(
              "flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em]",
              row.emphasis ? "text-[var(--gold-strong)]" : "text-muted",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-3 w-[3px] shrink-0 rounded-full",
                row.emphasis ? "bg-[var(--gold)]" : "bg-border",
              )}
            />
            {row.label}
          </dt>
          <dd className="text-sm leading-6 text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
