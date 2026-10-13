import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, failure, sameOrigin, readJson } from "@/lib/http";
import { generate, covers, hits, MAX_COLUMNS } from "@/lib/engine";
import { isLocked, resultOf, type Match } from "@/lib/program";
import { allowAttempt } from "@/lib/rate-limit";
const schema = z.object({
  weekId: z.string().max(100),
  selections: z
    .array(
      z
        .array(z.enum(["1", "X", "2"]))
        .min(1)
        .max(3),
    )
    .length(15),
  columns: z
    .array(z.string().regex(/^[1X2]{15}$/))
    .min(1)
    .max(MAX_COLUMNS),
  guarantee: z.number().int().min(12).max(15).nullable(),
});
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return Response.json({ error: "Giriş gerekli." }, { status: 401 });
    const coupons = await db.coupon.findMany({
      where: { userId: user.id },
      include: { week: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json(
      coupons.map((c) => {
        const result = resultOf(c.week.matches as Match[]);
        return {
          ...c,
          bestHits: result
            ? Math.max(
                ...(c.columns as string[]).map((col) => hits(col, result)),
              )
            : null,
        };
      }),
    );
  } catch (e) {
    if (e instanceof Error && e.message === "WEEK_LOCKED")
      return Response.json(
        { error: "Hafta kilitli veya bulunamadı." },
        { status: 409 },
      );
    return failure(e);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Geçersiz kaynak." }, { status: 403 });
  try {
    const user = await currentUser();
    if (!user)
      return Response.json({ error: "Giriş gerekli." }, { status: 401 });
    if (!(await allowAttempt("coupon-user", user.id, 20, 60)))
      return Response.json(
        { error: "Çok fazla kayıt isteği." },
        { status: 429 },
      );
    const parsed = schema.safeParse(await readJson(req));
    if (!parsed.success)
      return Response.json({ error: "Geçersiz kupon." }, { status: 400 });
    const data = parsed.data;
    let universe: string[];
    try {
      universe = generate(data.selections);
    } catch {
      return Response.json(
        { error: "Geçersiz veya çok büyük sistem." },
        { status: 400 },
      );
    }
    const allowed = new Set(universe);
    if (
      new Set(data.columns).size !== data.columns.length ||
      data.columns.some((c) => !allowed.has(c)) ||
      (data.guarantee !== null &&
        !covers(data.columns, universe, data.guarantee))
    )
      return Response.json(
        { error: "Kolonlar veya garanti doğrulanamadı." },
        { status: 400 },
      );
    const coupon = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Week" WHERE "id" = ${data.weekId} FOR UPDATE`;
      const week = await tx.week.findUnique({ where: { id: data.weekId } });
      if (!week || isLocked(week.matches as Match[]))
        throw new Error("WEEK_LOCKED");
      return tx.coupon.create({ data: { ...data, userId: user.id } });
    });
    return Response.json({ id: coupon.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "WEEK_LOCKED")
      return Response.json(
        { error: "Hafta kilitli veya bulunamadı." },
        { status: 409 },
      );
    return failure(e);
  }
}
