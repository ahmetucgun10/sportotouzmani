import { hash } from "argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { failure, sameOrigin, readJson } from "@/lib/http";
import { allowAttempt } from "@/lib/rate-limit";
const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Geçersiz kaynak." }, { status: 403 });
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown")
      .split(",")[0]
      .trim();
    if (!(await allowAttempt("register-ip", ip, 5, 3600)))
      return Response.json(
        { error: "Çok fazla kayıt denemesi. Daha sonra tekrar deneyin." },
        { status: 429 },
      );
    const parsed = schema.safeParse(await readJson(req));
    if (!parsed.success)
      return Response.json(
        { error: "Geçerli e-posta ve en az 12 karakterlik şifre gerekli." },
        { status: 400 },
      );
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hash(parsed.data.password);
    await db.user.create({ data: { email, passwordHash } });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return Response.json(
        { error: "Bu e-posta kullanılıyor." },
        { status: 409 },
      );
    return failure(error);
  }
}
