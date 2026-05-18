import { NextResponse } from "next/server";
import { deleteParticipant, patchParticipant } from "@/lib/meeting-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ roomId: string; participantId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { roomId, participantId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const room = patchParticipant(roomId, participantId, body);
  if (!room) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  return NextResponse.json(room);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { roomId, participantId } = await context.params;
  return NextResponse.json(deleteParticipant(roomId, participantId));
}
