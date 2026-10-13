import { currentUser, failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await currentUser());
  } catch (e) {
    return failure(e);
  }
}
