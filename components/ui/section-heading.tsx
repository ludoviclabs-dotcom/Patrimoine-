import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  as = "h2",
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  className?: string;
}) {
  const Title = as;
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? (
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-strong)]">
          {eyebrow}
        </p>
      ) : null}
      <Title className="mt-2 font-serif text-2xl font-semibold tracking-[-0.01em] text-foreground sm:text-3xl">
        {title}
      </Title>
      {lead ? (
        <p
          className={cn(
            "mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
