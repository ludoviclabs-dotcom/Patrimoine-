import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { toClerkWebhookRecord } from "@/lib/auth/clerk-webhook";
import { recordSignedClerkWebhook } from "@/lib/auth/clerk-webhook-repository";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let event: unknown;
  try {
    event = await verifyWebhook(request);
  } catch {
    return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
  }

  const record = toClerkWebhookRecord(event, request.headers.get("svix-id"));
  if (!record) return NextResponse.json({ received: true, ignored: true }, { status: 202 });

  try {
    const processed = await recordSignedClerkWebhook(record);
    return NextResponse.json({ received: true, processed });
  } catch {
    // A non-2xx result retains Clerk's safe retry behaviour without revealing
    // database topology, role information or SQL errors.
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 503 });
  }
}
