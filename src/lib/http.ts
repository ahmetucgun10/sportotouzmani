import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";
export async function currentUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id
    ? db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, role: true },
      })
    : null;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !!origin && origin === new URL(req.url).origin;
}
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  if (error instanceof InputError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "Unknown",
  );
  return Response.json(
    {
      error: "İşlem tamamlanamadı. Yapılandırmayı ve bağlantıyı kontrol edin.",
    },
    { status: 503 },
  );
}
export async function readJson(req: Request) {
  if (!req.body) throw new InputError("JSON verisi gerekli.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 300000) {
      await reader.cancel();
      throw new InputError("İstek çok büyük.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InputError("Geçerli JSON gerekli.");
  }
}
