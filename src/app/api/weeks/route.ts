import { db } from "@/lib/db";
import { failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(
      await db.week.findMany({
        orderBy: [{ season: "desc" }, { number: "desc" }],
        take: 60,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
