import { createHash } from "node:crypto";
import { db } from "./db";
// Shared database counters remain effective across serverless instances.
export async function allowAttempt(
  namespace: string,
  identity: string,
  limit: number,
  seconds: number,
): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + seconds * 1000);
  const key = createHash("sha256")
    .update(namespace + ":" + identity)
    .digest("hex");
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "expiresAt"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${expiresAt} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  await db.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 86400000) } },
  });
  return rows[0].count <= limit;
}
