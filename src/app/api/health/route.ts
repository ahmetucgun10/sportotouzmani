import { db, hasDatabase } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // App is healthy even without a database (serverless / no-DB mode).
  if (!hasDatabase) {
    return Response.json({
      status: "ok",
      database: "not-configured",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      status: "ok",
      database: "error",
      error: error instanceof Error ? error.message : "DB error",
      timestamp: new Date().toISOString(),
    });
  }
}
