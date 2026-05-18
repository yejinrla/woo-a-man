import { NextResponse } from "next/server";
import { toggleVote } from "@/lib/meeting-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = toggleVote(roomId, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.room);
}
