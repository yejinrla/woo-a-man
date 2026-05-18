import { NextResponse } from "next/server";
import { addParticipant } from "@/lib/meeting-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(addParticipant(roomId, body), { status: 201 });
}
