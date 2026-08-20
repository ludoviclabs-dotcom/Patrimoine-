import { getDatabase } from "../db/client";
import { resolveDownloadSigningSecret } from "../documents/access-grant";
import { createVercelPrivateBlobStorage } from "../documents/private-storage";
import { documentErrorResponse } from "../documents/runtime";
import { createServerReportService } from "./report-service";

/**
 * Runtime wiring for the server report routes. Reports reuse the PF-05 private
 * storage adapter and the same short-lived signed grant mechanism; nothing here
 * accepts a browser-provided tenant, key or secret.
 */
export function getServerReportService() {
  return createServerReportService({
    database: getDatabase(),
    storage: createVercelPrivateBlobStorage(),
    downloadSigningSecret: resolveDownloadSigningSecret(),
  });
}

export { documentErrorResponse as reportErrorResponse };
