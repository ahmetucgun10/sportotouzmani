import { tavily } from "@tavily/core";
import { getTavilyApiKey } from "./env";

let tavilyClient: ReturnType<typeof tavily> | null = null;
let cachedApiKey: string | null = null;

function getTavilyClient() {
  const apiKey = getTavilyApiKey();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set");
  }
  if (!tavilyClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    tavilyClient = tavily({ apiKey });
  }
  return tavilyClient;
}

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

const currentYear = new Date().getFullYear();
const prevYear = currentYear - 1;
const SEASON_TAG = `${prevYear}-${currentYear} ${currentYear} güncel istatistik son durum`;

export async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    topic?: "general" | "news";
    searchDepth?: "basic" | "advanced";
    includeDomains?: string[];
    days?: number;
  } = {}
): Promise<{ results: SearchResult[]; answer?: string }> {
  try {
    const client = getTavilyClient();
    const response = await client.search(query, {
      maxResults: options.maxResults || 6,
      topic: options.topic || "news",
      searchDepth: options.searchDepth || "advanced",
      includeDomains: options.includeDomains,
      days: options.days || 7,
      includeAnswer: true,
    });

    return {
      results: response.results.map((r) => ({
        url: r.url,
        title: r.title,
        content: r.content,
        score: r.score,
        publishedDate: r.publishedDate,
      })),
      answer: response.answer,
    };
  } catch (error) {
    console.error("Tavily search error:", error);
    throw new Error(
      `Tavily araştırması başarısız: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ============ TEAM-LEVEL SEARCHES ============

export function searchSportsNews(teamName: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  return searchWeb(`${teamName}${leagueQuery} son dakika haberler kadro gelişmeler ${SEASON_TAG}`, {
    maxResults: 7,
    topic: "news",
    searchDepth: "advanced",
    days: 10,
  });
}

export function searchTeamInjuries(teamName: string) {
  return searchWeb(`${teamName} sakatlık listesi cezalı eksikler son durum ${SEASON_TAG}`, {
    maxResults: 7,
    topic: "news",
    searchDepth: "advanced",
    days: 7,
  });
}

export function searchHeadToHead(homeTeam: string, awayTeam: string) {
  return searchWeb(
    `${homeTeam} vs ${awayTeam} head to head geçmiş maçlar istatistikler aralarındaki son maçlar`,
    {
      maxResults: 8,
      topic: "general",
      searchDepth: "advanced",
      days: 730,
    }
  );
}

export function searchTeamForm(teamName: string) {
  return searchWeb(`${teamName} son 5 maç sonuçları form durumu puan durumu gol istatistikleri ${SEASON_TAG}`, {
    maxResults: 7,
    topic: "general",
    searchDepth: "advanced",
    days: 30,
  });
}

export function searchTeamComments(teamName: string) {
  return searchWeb(`${teamName} maç analizi uzman yorumları güçlü zayıf yönler performans değerlendirme ${SEASON_TAG}`, {
    maxResults: 6,
    topic: "general",
    searchDepth: "advanced",
    days: 14,
  });
}

export function searchCoachTactics(teamName: string) {
  return searchWeb(
    `${teamName} teknik direktör taktik diziliş sistem oyun planı basın toplantısı ${SEASON_TAG}`,
    {
      maxResults: 6,
      topic: "news",
      searchDepth: "advanced",
      days: 14,
    }
  );
}

export function searchSocialMediaBuzz(teamName: string) {
  return searchWeb(
    `${teamName} taraftar yorumları sosyal medya gündem moral atmosfer maç öncesi ${SEASON_TAG}`,
    {
      maxResults: 5,
      topic: "news",
      searchDepth: "advanced",
      days: 7,
    }
  );
}

export function searchStarPlayers(teamName: string) {
  return searchWeb(
    `${teamName} en skorer formda oyuncular gol asist kilit futbolcular istatistik ${SEASON_TAG}`,
    {
      maxResults: 6,
      topic: "general",
      searchDepth: "advanced",
      days: 21,
    }
  );
}

export function searchTransferAndSquad(teamName: string) {
  return searchWeb(
    `${teamName} kadro derinliği transfer yeni oyuncular eksikler yedek kulübesi ${SEASON_TAG}`,
    {
      maxResults: 5,
      topic: "news",
      searchDepth: "advanced",
      days: 21,
    }
  );
}

// ============ ACCURACY-BOOSTING QUANTITATIVE & MATCHUP SEARCHES ============

/**
 * Expected Goals (xG), xGA, shot quality, big chances & underlying metrics
 * to detect lucky/unlucky streaks that fool casual analysts.
 */
export function searchExpectedGoals(teamName: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  return searchWeb(
    `${teamName}${leagueQuery} xG expected goals gol beklentisi şut isabeti gol ortalaması ileri istatistik ${currentYear}`,
    {
      maxResults: 7,
      topic: "general",
      searchDepth: "advanced",
      days: 45,
    }
  );
}

/**
 * True Home vs True Away split performance (points per game, goals scored/conceded home vs away).
 */
export function searchHomeAwaySplit(homeTeam: string, awayTeam: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  return searchWeb(
    `${homeTeam} iç saha performansı evinde istatistik ${awayTeam} deplasman performansı dış saha karnesi${leagueQuery} ${currentYear}`,
    {
      maxResults: 7,
      topic: "general",
      searchDepth: "advanced",
      days: 45,
    }
  );
}

/**
 * Fixture congestion, rest days, midweek European/cup matches, travel fatigue & rotation risk.
 */
export function searchFixtureFatigue(homeTeam: string, awayTeam: string) {
  return searchWeb(
    `${homeTeam} ${awayTeam} fikstür maç takvimi hafta içi maçı yorgunluk rotasyon dinlenme süresi ${SEASON_TAG}`,
    {
      maxResults: 6,
      topic: "news",
      searchDepth: "advanced",
      days: 10,
    }
  );
}

/**
 * Probable starting XIs, key positional battles, and set-piece (corner/free-kick/penalty) efficiency.
 */
export function searchLineupMatchup(homeTeam: string, awayTeam: string) {
  return searchWeb(
    `${homeTeam} ${awayTeam} muhtemel 11 ilk 11 kadrolar duran top korner taktik eşleşme ${SEASON_TAG}`,
    {
      maxResults: 7,
      topic: "news",
      searchDepth: "advanced",
      days: 7,
    }
  );
}

/**
 * Sharp odds, implied probabilities, opening vs current line movements & market consensus.
 */
export function searchBettingOdds(homeTeam: string, awayTeam: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  return searchWeb(
    `${homeTeam} vs ${awayTeam}${leagueQuery} iddaa oranları betting odds prediction oran değişimi favori ${currentYear}`,
    {
      maxResults: 7,
      topic: "general",
      searchDepth: "advanced",
      days: 7,
    }
  );
}

export function searchWeatherAndVenue(homeTeam: string, matchDate?: string) {
  const dateQuery = matchDate ? ` ${matchDate}` : "";
  return searchWeb(
    `${homeTeam} stadyum hava durumu zemin saha koşulları maç günü${dateQuery} ${currentYear}`,
    {
      maxResults: 5,
      topic: "news",
      searchDepth: "advanced",
      days: 7,
    }
  );
}

export function searchMotivationFactors(homeTeam: string, awayTeam: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  return searchWeb(
    `${homeTeam} ${awayTeam}${leagueQuery} puan durumu hedef şampiyonluk küme düşme Avrupa motivasyon ${SEASON_TAG}`,
    {
      maxResults: 6,
      topic: "news",
      searchDepth: "advanced",
      days: 14,
    }
  );
}

export function searchRefereeInfo(homeTeam: string, awayTeam: string) {
  return searchWeb(
    `${homeTeam} ${awayTeam} maçın hakemi kim hakem istatistikleri kart penaltı ortalaması ${SEASON_TAG}`,
    {
      maxResults: 5,
      topic: "news",
      searchDepth: "advanced",
      days: 7,
    }
  );
}

// ============ GÜNCEL GELİŞME TAKİBİ & SÜRPRİZ KEŞFİ (EK AJAN ARAMALARI) ============

/** Bugünün tarihi (Türkiye saati) — ajanların "en yeni" bilgiyi ayırt edebilmesi için. */
export function todayLabel(): string {
  return new Date().toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
}

/** Sonuçları yayın tarihine göre en yeniden eskiye sıralar (tarihi olmayanlar sona). */
export function sortByRecency(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    const ta = a.publishedDate ? Date.parse(a.publishedDate) : NaN;
    const tb = b.publishedDate ? Date.parse(b.publishedDate) : NaN;
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return tb - ta;
  });
}

/** Son 48 saatin takım gelişmeleri (sakatlık, kadro, açıklama, kriz) — en yeniden eskiye. */
export async function searchLatestDevelopments(teamName: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  const res = await searchWeb(
    `${teamName}${leagueQuery} son dakika bugün açıklama kadro sakatlık antrenman gelişme ${todayLabel()}`,
    { maxResults: 8, topic: "news", searchDepth: "advanced", days: 2 }
  );
  return { ...res, results: sortByRecency(res.results) };
}

/** Maç günü nabzı: açıklanan kadrolar, son dakika eksikler, oran kaymaları, maç saati değişiklikleri. */
export async function searchMatchDayUpdates(homeTeam: string, awayTeam: string, matchDate?: string) {
  const dateQuery = matchDate ? ` ${matchDate}` : "";
  const res = await searchWeb(
    `${homeTeam} ${awayTeam}${dateQuery} maç öncesi son dakika kamp kadrosu ilk 11 açıklandı oran düştü`,
    { maxResults: 8, topic: "news", searchDepth: "advanced", days: 3 }
  );
  return { ...res, results: sortByRecency(res.results) };
}

/** Maça özel sürpriz sinyalleri: underdog/upset yorumları, ters köşe uyarıları, tuzak favori. */
export function searchUpsetSignals(homeTeam: string, awayTeam: string, league?: string) {
  const leagueQuery = league ? ` ${league}` : "";
  return searchWeb(
    `${homeTeam} vs ${awayTeam}${leagueQuery} upset underdog surprise prediction sürpriz tuzak maç ters köşe ${currentYear}`,
    { maxResults: 7, topic: "general", searchDepth: "advanced", days: 7 }
  );
}

/** Belirli bir lig için yaklaşan maç programı (fikstür). */
export function searchUpcomingFixtures(league: string, windowLabel: string) {
  return searchWeb(
    `${league} fixtures ${windowLabel} maç programı fikstür hangi maçlar var ${todayLabel()}`,
    { maxResults: 8, topic: "general", searchDepth: "advanced", days: 4 }
  );
}

/** Lig genelinde "sürpriz olabilecek maçlar" yorumları. */
export function searchLeagueUpsetTips(league: string, windowLabel: string) {
  return searchWeb(
    `${league} ${windowLabel} upset alert surprise picks underdog predictions sürpriz olabilecek maçlar`,
    { maxResults: 7, topic: "news", searchDepth: "advanced", days: 5 }
  );
}

/** Tek bir maç için hızlı sürpriz taraması (önizleme + eksikler + oran). */
export function searchQuickMatchPreview(homeTeam: string, awayTeam: string) {
  return searchWeb(
    `${homeTeam} vs ${awayTeam} preview prediction team news injuries odds maç önü eksikler`,
    { maxResults: 6, topic: "news", searchDepth: "basic", days: 5 }
  );
}
