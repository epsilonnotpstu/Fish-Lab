import { chatAccess, messagesAfter, messagesTouchedSince } from "@/lib/chat";

export const dynamic = "force-dynamic";

const TICK_MS = 2000;
// Connections are recycled so a dropped client cannot hold a worker forever;
// EventSource reconnects on its own.
const MAX_MS = 4 * 60 * 1000;

/** Server-sent events: new and changed messages for the lab group. */
export async function GET(request: Request) {
  const access = await chatAccess();
  if (!access) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const startedAt = url.searchParams.get("since");
  let cursor = startedAt && !Number.isNaN(Date.parse(startedAt)) ? new Date(startedAt) : new Date();
  let touchedCursor = new Date();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      send("ready", { at: new Date().toISOString() });
      const startTime = Date.now();

      const timer = setInterval(async () => {
        try {
          if (Date.now() - startTime > MAX_MS) {
            clearInterval(timer);
            controller.close();
            return;
          }
          const fresh = await messagesAfter(cursor.toISOString());
          if (fresh.length) {
            cursor = new Date(fresh[fresh.length - 1].createdAt);
            send("messages", fresh);
          }
          const touched = await messagesTouchedSince(touchedCursor.toISOString());
          touchedCursor = new Date();
          if (touched.length) send("updated", touched);
          send("ping", { at: Date.now() });
        } catch (err) {
          console.error("chat stream", err);
        }
      }, TICK_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
