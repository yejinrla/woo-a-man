import { addSseClient, getOrCreateRoom, removeSseClient, serializeSseRoom } from "@/lib/meeting-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  getOrCreateRoom(roomId);

  let activeController: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      activeController = controller;
      addSseClient(roomId, controller);
      controller.enqueue(serializeSseRoom(roomId));

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
          removeSseClient(roomId, controller);
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        removeSseClient(roomId, controller);
      });
    },
    cancel() {
      if (activeController) removeSseClient(roomId, activeController);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
