import OpenAI from "openai";
import { getOpenAIApiKey } from "./env";

let openaiClient: OpenAI | null = null;
let cachedApiKey: string | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!openaiClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    openaiClient = new OpenAI({
      apiKey,
      timeout: 90_000,
      maxRetries: 2,
    });
  }
  return openaiClient;
}

export interface AnalyzeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function analyzeWithAI(
  systemPrompt: string,
  userContent: string,
  options: AnalyzeOptions | string = {}
): Promise<string> {
  const opts: AnalyzeOptions =
    typeof options === "string" ? { model: options } : options;

  const model = opts.model ?? "gpt-4o-mini";
  const maxTokens = opts.maxTokens ?? 1500;
  const temperature = opts.temperature ?? 0.3;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const choice = response.choices[0];
    const text = choice?.message?.content?.trim();

    if (!text) {
      throw new Error(
        `Model boş yanıt döndürdü (finish_reason: ${choice?.finish_reason ?? "bilinmiyor"}).`
      );
    }

    return text;
  } catch (error) {
    console.error("OpenAI error:", error);
    throw new Error(
      `OpenAI analizi başarısız: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
