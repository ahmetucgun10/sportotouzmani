import { NextRequest } from "next/server";
import { db, ensureSchema, hasDatabase } from "@/db";
import { matchAnalyses } from "@/db/schema";
import { runFullMatchAnalysis, AgentLog } from "@/lib/agents";
import { eq } from "drizzle-orm";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { homeTeam, awayTeam, league, matchDate } = body;

    if (!homeTeam || !awayTeam) {
      return new Response(JSON.stringify({ error: "Ev sahibi ve deplasman takımı gereklidir" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create analysis record (only if a database is configured)
    let analysisId: number = Date.now();
    if (hasDatabase) {
      try {
        await ensureSchema();
        const [analysis] = await db
          .insert(matchAnalyses)
          .values({
            homeTeam,
            awayTeam,
            league: league || null,
            matchDate: matchDate || null,
            status: "running",
            agentLogs: [],
          })
          .returning();
        analysisId = analysis.id;
      } catch (dbErr) {
        console.error("DB insert failed, continuing without persistence:", dbErr);
      }
    }

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const allLogs: AgentLog[] = [];

        const sendEvent = (data: object) => {
          const json = JSON.stringify(data);
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        };

        // Send analysis ID first
        sendEvent({ type: "init", analysisId, persisted: hasDatabase });

        try {
          const result = await runFullMatchAnalysis(
            homeTeam,
            awayTeam,
            league,
            (log: AgentLog) => {
              allLogs.push(log);
              sendEvent({ type: "log", log });
            },
            matchDate
          );

          // Update database with results (best-effort)
          if (hasDatabase) {
            try {
              await db
                .update(matchAnalyses)
                .set({
                  status: "completed",
                  agentLogs: allLogs,
                  finalPrediction: result.finalPrediction,
                  homeTeamData: result.homeTeamAnalysis,
                  awayTeamData: result.awayTeamAnalysis,
                  headToHead: result.headToHead,
                  updatedAt: new Date(),
                })
                .where(eq(matchAnalyses.id, analysisId));
            } catch (dbErr) {
              console.error("DB update failed:", dbErr);
            }
          }

          // Send final result
          sendEvent({
            type: "complete",
            analysisId,
            result: {
              homeTeamAnalysis: result.homeTeamAnalysis,
              awayTeamAnalysis: result.awayTeamAnalysis,
              matchContext: result.matchContext,
              headToHead: result.headToHead,
              finalPrediction: result.finalPrediction,
            },
          });
        } catch (error) {
          console.error("Analysis error:", error);
          if (hasDatabase) {
            try {
              await db
                .update(matchAnalyses)
                .set({
                  status: "error",
                  agentLogs: allLogs,
                  updatedAt: new Date(),
                })
                .where(eq(matchAnalyses.id, analysisId));
            } catch {
              // ignore
            }
          }

          sendEvent({
            type: "error",
            message: error instanceof Error ? error.message : "Analiz sırasında hata oluştu",
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
  } catch (error) {
    console.error("Route error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Sunucu hatası" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  if (!hasDatabase) {
    return Response.json({ analyses: [], noDatabase: true });
  }
  try {
    await ensureSchema();
    const analyses = await db.select().from(matchAnalyses).orderBy(matchAnalyses.createdAt);
    return Response.json({ analyses });
  } catch {
    return Response.json({ error: "Veriler alınamadı", analyses: [] }, { status: 500 });
  }
}
