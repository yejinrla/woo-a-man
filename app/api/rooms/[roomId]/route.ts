import { NextResponse } from "next/server";
import { getRoomResponse, patchRoom } from "@/lib/meeting-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  return NextResponse.json(getRoomResponse(roomId));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(patchRoom(roomId, body));
}
