import { NextResponse } from "next/server";
import { createRoom } from "@/lib/meeting-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(createRoom(body), { status: 201 });
}
