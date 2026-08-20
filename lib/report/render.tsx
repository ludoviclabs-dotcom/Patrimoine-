import { createHash } from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportSnapshotPdf } from "./report-pdf";
import type { ReportSnapshot } from "./snapshot";

/**
 * Renders the report PDF server-side with @react-pdf/renderer.
 *
 * The document's creation and modification dates are pinned to the snapshot's
 * own generation timestamp, so rendering the same snapshot twice produces a
 * byte-identical file and therefore a stable `pdfSha256`.
 */
export async function renderReportPdf(snapshot: ReportSnapshot) {
  const buffer = await renderToBuffer(<ReportSnapshotPdf snapshot={snapshot} />);
  const bytes = new Uint8Array(buffer);

  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
