import { NextRequest } from "next/server";
import { db, ensureSchema, hasDatabase } from "@/db";
import { matchAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabase) {
    return Response.json({ error: "Veritabanı yapılandırılmamış", noDatabase: true }, { status: 404 });
  }
  try {
    await ensureSchema();
    const { id } = await params;
    const analysisId = parseInt(id);

    if (isNaN(analysisId)) {
      return Response.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const [analysis] = await db
      .select()
      .from(matchAnalyses)
      .where(eq(matchAnalyses.id, analysisId));

    if (!analysis) {
      return Response.json({ error: "Analiz bulunamadı" }, { status: 404 });
    }

    return Response.json({ analysis });
  } catch {
    return Response.json({ error: "Veri alınamadı" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabase) {
    return Response.json({ error: "Veritabanı yapılandırılmamış", noDatabase: true }, { status: 404 });
  }
  try {
    await ensureSchema();
    const { id } = await params;
    const analysisId = parseInt(id);

    if (isNaN(analysisId)) {
      return Response.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    await db.delete(matchAnalyses).where(eq(matchAnalyses.id, analysisId));

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}
