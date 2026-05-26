import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { controlAllEvidenceSources, getEvidenceAdminSummary } from "@/lib/evidence/source-control";
import { assertCronSecretPolicy } from "@/lib/security/access-control";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  try {
    assertCronSecretPolicy({});
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "CRON_SECRET_POLICY_FAILED",
      },
      { status: 503 },
    );
  }

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await controlAllEvidenceSources({
    liveEnabled: process.env.EVIDENCE_LIVE_CHECKS === "enabled",
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: {
      status: results.some((result) => result.status === "changed" || result.status === "failed")
        ? "review_required"
        : "unchanged",
      summary: getEvidenceAdminSummary(results),
      results,
    },
  });
}
