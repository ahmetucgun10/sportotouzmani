import { NextRequest } from "next/server";
import { AgentLog } from "@/lib/agents";
import { runSurpriseDiscovery, DiscoveryWindow } from "@/lib/surpriseDiscovery";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const WINDOWS: DiscoveryWindow[] = ["today", "tomorrow", "next3", "weekend"];

export async function POST(req: NextRequest) {
  let body: { league?: string; window?: string } = {};
  try {
    body = await req.json();
  } catch {
    // boş gövde kabul
  }
  const window: DiscoveryWindow = WINDOWS.includes(body.window as DiscoveryWindow)
    ? (body.window as DiscoveryWindow)
    : "next3";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const result = await runSurpriseDiscovery(body.league, window, (log: AgentLog) =>
          send({ type: "log", log })
        );
        send({ type: "complete", result });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Sürpriz keşfi sırasında hata oluştu",
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
