import { NextResponse } from "next/server";
import { z } from "zod";
import { recordFunnelEvent } from "@/lib/tracking/record-event";
import { utmSchema } from "@/lib/validation/schemas";

const eventRequestSchema = utmSchema.extend({
  eventName: z.string().min(1),
  sessionId: z.string().min(1),
  leadId: z.string().uuid().nullable().optional(),
  step: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = eventRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  await recordFunnelEvent(parsed.data);

  return NextResponse.json({ ok: true });
}
