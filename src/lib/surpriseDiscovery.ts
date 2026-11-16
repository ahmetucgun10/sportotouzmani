/**
 * SÜRPRİZ MAÇ KEŞİF MOTORU (EK ÖZELLİK)
 * Kullanıcı bir maç girmeden, yaklaşan fikstürü tarayıp sürpriz olabilecek maçları bulur.
 *  1) 🗓️ Fikstür Tarayıcı Ajanı — seçilen zaman aralığındaki maçları web'den çıkarır
 *  2) 📣 Sürpriz Radar Ajanı — lig genelindeki "upset / sürpriz" yorumlarını toplar
 *  3) 🔍 Sürpriz Puanlama Ajanı — her maçı hızlıca tarayıp 0-100 sürpriz puanı verir
 *  4) 🧭 Sürpriz Keşif Komutanı — sıralar ve listeyi sunar
 */
import {
  searchUpcomingFixtures,
  searchLeagueUpsetTips,
  searchQuickMatchPreview,
  todayLabel,
  SearchResult,
} from "./tavily";
import { analyzeJSON } from "./openai";
import {
  AgentLog,
  LogCallback,
  assertConfigured,
  condense,
  runWithConcurrency,
  sourcesToText,
} from "./agents";

export const DISCOVERY_LEAGUES = [
  "Türkiye Süper Lig",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

export type DiscoveryWindow = "today" | "tomorrow" | "next3" | "weekend";

export interface DiscoveredFixture {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
}

export interface SurpriseCandidate extends DiscoveredFixture {
  surpriseScore: number; // 0-100
  isSurpriseCandidate: boolean;
  expectedResult: string;
  surpriseResult: string | null;
  surpriseScoreline: string | null;
  reasons: string[];
  sources: SearchResult[];
}

export interface DiscoveryResult {
  windowLabel: string;
  leagues: string[];
  candidates: SurpriseCandidate[];
}

function windowLabelOf(w: DiscoveryWindow): string {
  switch (w) {
    case "today":
      return "bugün (today)";
    case "tomorrow":
      return "yarın (tomorrow)";
    case "weekend":
      return "bu hafta sonu (this weekend)";
    default:
      return "önümüzdeki 3 gün (next 3 days)";
  }
}

function log(
  onLog: LogCallback,
  agentName: string,
  agentEmoji: string,
  step: string,
  status: AgentLog["status"],
  content = "",
  sources: SearchResult[] = []
) {
  onLog({ agentName, agentEmoji, step, content, sources, status, timestamp: new Date().toISOString() });
}

const SURPRISE_THRESHOLD = 45;

export async function runSurpriseDiscovery(
  leagueInput: string | undefined,
  window: DiscoveryWindow,
  onLog: LogCallback,
  maxMatches = 10
): Promise<DiscoveryResult> {
  assertConfigured();
  const leagues = leagueInput && leagueInput !== "Tümü" ? [leagueInput] : DISCOVERY_LEAGUES;
  const wLabel = windowLabelOf(window);
  const today = todayLabel();

  log(
    onLog,
    "Sürpriz Keşif Komutanı",
    "🧭",
    `Sürpriz keşfi başlatıldı — ${leagues.join(", ")} | ${wLabel} (Bugün: ${today})`,
    "done",
    `🗓️ Fikstür Tarayıcı → 📣 Sürpriz Radar → 🔍 Sürpriz Puanlama (maç başı) → 🧭 Sıralama`
  );

  // 1) Fikstür + lig geneli sürpriz yorumları (paralel)
  const perLeague = await runWithConcurrency(
    leagues.map((lg) => async () => {
      log(onLog, "Fikstür Tarayıcı Ajanı", "🗓️", `${lg} ${wLabel} maç programı taranıyor...`, "running");
      const [fx, tips] = await Promise.all([
        searchUpcomingFixtures(lg, wLabel).catch(() => ({ results: [] as SearchResult[], answer: undefined })),
        searchLeagueUpsetTips(lg, wLabel).catch(() => ({ results: [] as SearchResult[], answer: undefined })),
      ]);
      log(
        onLog,
        "Fikstür Tarayıcı Ajanı",
        "🗓️",
        `${lg} - ${fx.results.length} fikstür kaynağı, ${tips.results.length} sürpriz yorumu bulundu`,
        fx.results.length ? "done" : "error",
        "",
        [...fx.results, ...tips.results]
      );
      return { league: lg, fx, tips };
    }),
    4
  );

  const fixtureText = perLeague
    .map((p) => `### ${p.league}\n${condense(sourcesToText(p.fx.results, p.fx.answer), 2500)}`)
    .join("\n\n");
  const tipsText = perLeague
    .map((p) => `### ${p.league}\n${condense(sourcesToText(p.tips.results, p.tips.answer), 1500)}`)
    .join("\n\n");

  // 2) Fikstürü yapılandır + radar önceliği
  log(onLog, "Sürpriz Radar Ajanı", "📣", `Kaynaklardan maç listesi çıkarılıyor ve sürpriz yorumlarıyla eşleştiriliyor...`, "running");
  let fixtures: DiscoveredFixture[] = [];
  try {
    const parsed = await analyzeJSON<{ matches?: DiscoveredFixture[] }>(
      `Sen bir futbol fikstür ayıklayıcısısın. Bugünün tarihi: ${today}. Sadece kaynaklarda AÇIKÇA geçen ve henüz OYNANMAMIŞ, istenen zaman aralığındaki (${wLabel}) maçları çıkarırsın. Oynanmış maçları, tarihi aralık dışında olanları veya uydurma maçları ASLA ekleme. Geçerli JSON döndür.`,
      `İstenen ligler: ${leagues.join(", ")}\nZaman aralığı: ${wLabel}\n\n═══ FİKSTÜR KAYNAKLARI ═══\n${fixtureText}\n\n═══ SÜRPRİZ YORUMLARI (önceliklendirme için) ═══\n${tipsText}\n\nEn fazla ${maxMatches} maç seç; sürpriz yorumlarında adı geçen maçları ve favori ile underdog arasındaki maçları önceliklendir. Şema:\n{"matches":[{"homeTeam":string,"awayTeam":string,"league":string,"date":string}]}`,
      { maxTokens: 1200, temperature: 0.1 }
    );
    const seen = new Set<string>();
    fixtures = (parsed.matches || [])
      .filter((m) => m && m.homeTeam && m.awayTeam)
      .filter((m) => {
        const k = `${m.homeTeam}|${m.awayTeam}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, maxMatches)
      .map((m) => ({
        homeTeam: String(m.homeTeam).trim(),
        awayTeam: String(m.awayTeam).trim(),
        league: String(m.league || leagues[0]).trim(),
        date: String(m.date || "").trim(),
      }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(onLog, "Sürpriz Radar Ajanı", "📣", `Maç listesi çıkarılamadı: ${msg}`, "error");
    throw new Error(`Fikstür çıkarılamadı: ${msg}`);
  }

  if (fixtures.length === 0) {
    log(onLog, "Sürpriz Radar Ajanı", "📣", `Bu aralıkta güvenilir şekilde doğrulanan maç bulunamadı`, "error");
    return { windowLabel: wLabel, leagues, candidates: [] };
  }
  log(
    onLog,
    "Sürpriz Radar Ajanı",
    "📣",
    `${fixtures.length} maç taramaya alındı`,
    "done",
    fixtures.map((f) => `• ${f.homeTeam} vs ${f.awayTeam} (${f.league}${f.date ? `, ${f.date}` : ""})`).join("\n")
  );

  // 3) Her maç için hızlı sürpriz puanlaması
  const scored = await runWithConcurrency(
    fixtures.map((f) => async (): Promise<SurpriseCandidate | null> => {
      const name = `${f.homeTeam} vs ${f.awayTeam}`;
      log(onLog, "Sürpriz Puanlama Ajanı", "🔍", `${name} sürpriz potansiyeli puanlanıyor...`, "running");
      try {
        const preview = await searchQuickMatchPreview(f.homeTeam, f.awayTeam);
        const leagueTips = perLeague.find((p) => p.league === f.league)?.tips;
        const j = await analyzeJSON<{
          surpriseScore?: number;
          expectedResult?: string;
          surpriseResult?: string | null;
          surpriseScoreline?: string | null;
          reasons?: string[];
        }>(
          "Sen sürpriz maçları önceden yakalayan bir futbol analistisin. Kanıtsız sürpriz ilan etmezsin. Favori çok netse puanı düşük tutarsın. Tüm metinler Türkçe, yalnızca geçerli JSON.",
          `Bugün: ${today}\nMaç: ${f.homeTeam} (Ev) vs ${f.awayTeam} (Dep) — ${f.league} ${f.date}\n\n═══ MAÇ ÖNİZLEME KAYNAKLARI ═══\n${condense(sourcesToText(preview.results, preview.answer), 2600)}\n\n═══ LİG SÜRPRİZ YORUMLARI ═══\n${condense(sourcesToText(leagueTips?.results || [], leagueTips?.answer), 900)}\n\nSürpriz puanı (0-100) ver: 0 = favori çok net, 100 = çok güçlü ters köşe sinyali. Sinyaller: favoride as eksikleri, yorgunluk/rotasyon, underdog'un iç saha gücü veya motivasyonu, xG/form uyumsuzluğu, oran kayması, H2H. Şema:\n{"surpriseScore":number,"expectedResult":string,"surpriseResult":string|null,"surpriseScoreline":string|null,"reasons":string[]}`,
          { maxTokens: 600, temperature: 0.2 }
        );
        const score = Math.round(Math.max(0, Math.min(100, Number(j.surpriseScore) || 0)));
        const isCand = score >= SURPRISE_THRESHOLD && !!j.surpriseResult;
        const cand: SurpriseCandidate = {
          ...f,
          surpriseScore: score,
          isSurpriseCandidate: isCand,
          expectedResult: String(j.expectedResult || "—"),
          surpriseResult: isCand ? String(j.surpriseResult) : null,
          surpriseScoreline: isCand && j.surpriseScoreline ? String(j.surpriseScoreline) : null,
          reasons: Array.isArray(j.reasons) ? j.reasons.map(String).slice(0, 4) : [],
          sources: preview.results.slice(0, 4),
        };
        log(
          onLog,
          "Sürpriz Puanlama Ajanı",
          "🔍",
          `${name} - Sürpriz puanı ${score}/100${isCand ? ` ⚡ Sürpriz adayı: ${cand.surpriseResult}` : " (net maç)"}`,
          "done",
          cand.reasons.map((r) => `• ${r}`).join("\n"),
          cand.sources
        );
        return cand;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(onLog, "Sürpriz Puanlama Ajanı", "🔍", `${name} - Puanlanamadı: ${msg}`, "error");
        return null;
      }
    }),
    4
  );

  const candidates = scored
    .filter((c): c is SurpriseCandidate => !!c)
    .sort((a, b) => b.surpriseScore - a.surpriseScore);

  const nCand = candidates.filter((c) => c.isSurpriseCandidate).length;
  log(
    onLog,
    "Sürpriz Keşif Komutanı",
    "🧭",
    nCand > 0
      ? `${nCand} sürpriz adayı maç bulundu (toplam ${candidates.length} maç tarandı)`
      : `Taranan ${candidates.length} maçta güçlü sürpriz sinyali yok — favoriler net görünüyor`,
    "done"
  );

  return { windowLabel: wLabel, leagues, candidates };
}
