"use client";

/**
 * Champs de formulaire partagés des laboratoires de simulation (v2 et v3).
 * Extraits de components/v2/tax-scenario-lab.tsx pour être réutilisés par les
 * formulaires des nouveaux moteurs (IR, PFU, DMTG, démembrement, IS…).
 */

export function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-10 min-w-0 rounded-lg border border-border bg-white px-3 font-mono text-sm text-foreground outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(43,122,88,0.18)]"
        inputMode="numeric"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-4 w-4 accent-[var(--accent)]"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function SelectInput<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        className="h-10 min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(43,122,88,0.18)]"
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
