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

/**
 * JSON çıktısı zorunlu AI çağrısı (sürpriz kararı & keşif ajanları için).
 * Yanıt geçerli JSON değilse hata fırlatır.
 */
export async function analyzeJSON<T>(
  systemPrompt: string,
  userContent: string,
  options: AnalyzeOptions = {}
): Promise<T> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: options.model ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1200,
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Model boş JSON yanıtı döndürdü.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Model geçerli JSON döndürmedi.");
  }
}
