import { PrismaClient } from "@prisma/client";
import { hash } from "argon2";
const db = new PrismaClient();
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "SEED_ADMIN_EMAIL ve en az 12 karakterlik SEED_ADMIN_PASSWORD gerekli.",
    );
  await db.user.upsert({
    where: { email },
    create: { email, passwordHash: await hash(password), role: "ADMIN" },
    update: { role: "ADMIN", passwordHash: await hash(password) },
  });
  console.log("Admin hazır.");
}
main()
  .catch(() => {
    console.error("Admin oluşturulamadı; ortam ayarlarını kontrol edin.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
