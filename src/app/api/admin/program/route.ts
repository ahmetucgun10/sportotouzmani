import { db } from "@/lib/db";
import { currentUser, failure, sameOrigin, readJson } from "@/lib/http";
import { feedSchema } from "@/lib/program";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Geçersiz kaynak." }, { status: 403 });
  try {
    const user = await currentUser();
    if (user?.role !== "ADMIN")
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );
    const parsed = feedSchema.safeParse(await readJson(req));
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Program biçimi geçersiz: her hafta 15 benzersiz maç, geçerli tarih ve skor içermeli.",
        },
        { status: 400 },
      );
    await db.$transaction(
      async (tx) => {
        for (const w of parsed.data.weeks) {
          const matches = [...w.matches].sort((a, b) => a.matchNo - b.matchNo);
          await tx.$queryRaw`SELECT "id" FROM "Week" WHERE "season" = ${w.season} AND "number" = ${w.number} FOR UPDATE`;
          const existing = await tx.week.findUnique({
            where: { season_number: { season: w.season, number: w.number } },
            include: { _count: { select: { coupons: true } } },
          });
          if (existing && existing._count.coupons > 0) {
            const previous = existing.matches as unknown as typeof matches;
            if (
              matches.some(
                (m, i) =>
                  m.matchNo !== previous[i].matchNo ||
                  m.home !== previous[i].home ||
                  m.away !== previous[i].away ||
                  m.kickoff !== previous[i].kickoff,
              )
            )
              throw new Error("SAVED_WEEK");
          }
          await tx.week.upsert({
            where: { season_number: { season: w.season, number: w.number } },
            create: { season: w.season, number: w.number, matches },
            update: { matches },
          });
        }
      },
      // Each statement sees the latest committed coupons after acquiring the shared week lock.
      { isolationLevel: "ReadCommitted" },
    );
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "SAVED_WEEK")
      return Response.json(
        {
          error:
            "Kayıtlı kupon bulunan haftanın takımları ve başlangıç tarihi değiştirilemez; yalnızca skorları güncelleyin.",
        },
        { status: 409 },
      );
    return failure(e);
  }
}
