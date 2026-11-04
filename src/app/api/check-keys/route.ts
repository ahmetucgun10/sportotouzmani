import { getOpenAIApiKey, getTavilyApiKey } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const openaiKey = getOpenAIApiKey();
  const tavilyKey = getTavilyApiKey();
  const openai = !!openaiKey;
  const tavily = !!tavilyKey;
  const database = !!process.env.DATABASE_URL;

  return Response.json({
    openai,
    tavily,
    database,
    setupComplete: openai && tavily,
  });
}
