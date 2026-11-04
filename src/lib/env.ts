/**
 * Centralized, resilient environment variable helpers.
 * Never hardcodes secrets — only reads from `process.env`, strips accidental
 * quotes/whitespace, and supports common naming typos users often make in
 * hosting dashboards (e.g. OPEN_AI_KEY, TAVILY_KEY).
 */

function cleanEnvValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getOpenAIApiKey(): string | undefined {
  const candidates = [
    process.env.OPENAI_API_KEY,
    process.env.OPEN_AI_KEY,
    process.env["OPENAİ_API_KEY"],
    process.env.OPENAI_KEY,
  ];
  for (const val of candidates) {
    const cleaned = cleanEnvValue(val);
    if (cleaned) return cleaned;
  }
  return undefined;
}

export function getTavilyApiKey(): string | undefined {
  const candidates = [
    process.env.TAVILY_API_KEY,
    process.env.TAVILY_KEY,
    process.env.TAVILY_API,
    process.env["TAVİLY_API_KEY"],
  ];
  for (const val of candidates) {
    const cleaned = cleanEnvValue(val);
    if (cleaned) return cleaned;
  }
  return undefined;
}
