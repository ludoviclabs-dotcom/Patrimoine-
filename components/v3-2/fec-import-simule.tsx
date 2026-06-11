"use client";

import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { SciSnapshotPanel } from "@/components/v3-2/compta-sci-panels";
import { demoFecContent, parseFec, trialBalanceFromFec } from "@/lib/compta/fec";
import { buildSciSnapshot } from "@/lib/compta/sci-accounting";

export function FecImportSimule() {
  const [content, setContent] = useState(demoFecContent);
  const [imported, setImported] = useState(false);

  const snapshot = useMemo(() => {
    if (!imported) return null;
    const entries = parseFec(content);
    if (entries.length === 0) return null;
    return buildSciSnapshot(trialBalanceFromFec(entries), { source: "fec-import-simule" });
  }, [content, imported]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Import simulé</CardEyebrow>
            <CardTitle className="mt-1">FEC (art. A47 A-1 LPF)</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Collez un extrait de FEC (séparateur tabulation ou pipe). Aucun fichier n&apos;est
              téléversé : tout reste dans le navigateur.
            </p>
          </div>
          <FileUp className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
        </CardHeader>
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setImported(false);
          }}
          rows={8}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-white p-3 font-mono text-xs text-foreground outline-none transition focus:border-[var(--accent)]"
          aria-label="Contenu FEC à analyser"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => setImported(true)}>
            Analyser ce FEC
          </Button>
          <Badge tone="teal" dot>
            Démo sans connecteur ni upload
          </Badge>
          {imported && !snapshot ? (
            <Badge tone="warning" dot>
              Format non reconnu : en-tête FEC attendu
            </Badge>
          ) : null}
        </div>
      </Card>

      {snapshot ? <SciSnapshotPanel snapshot={snapshot} /> : null}
    </div>
  );
}
