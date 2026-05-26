import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { runDemoSourceWatch } from "@/lib/source-watch/watcher";

export function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = runDemoSourceWatch(new Date());

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: {
      status: results.some((result) => result.status === "changed")
        ? "review_required"
        : "unchanged",
      results,
    },
  });
}
