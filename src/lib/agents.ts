import {
  searchSportsNews,
  searchTeamInjuries,
  searchHeadToHead,
  searchTeamForm,
  searchTeamComments,
  searchBettingOdds,
  searchWeatherAndVenue,
  searchCoachTactics,
  searchSocialMediaBuzz,
  searchMotivationFactors,
  searchStarPlayers,
  searchTransferAndSquad,
  searchRefereeInfo,
  searchExpectedGoals,
  searchHomeAwaySplit,
  searchFixtureFatigue,
  searchLineupMatchup,
  SearchResult,
} from "./tavily";
import { analyzeWithAI } from "./openai";
import { getOpenAIApiKey, getTavilyApiKey } from "./env";

/**
 * Full production mode requires both API keys. If either is missing we throw a
 * clear, actionable configuration error instead of falling back to sample data.
 */
export function assertConfigured(): void {
  const missing: string[] = [];
  if (!getOpenAIApiKey()) missing.push("OPENAI_API_KEY");
  if (!getTavilyApiKey()) missing.push("TAVILY_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Kurulum eksik: ${missing.join(
        " ve "
      )} tanımlanmalı. Lütfen .env dosyanıza (veya Vercel ortam değişkenlerine) ekleyin.`
    );
  }
}

export interface AgentLog {
  agentName: string;
  agentEmoji: string;
  step: string;
  content: string;
  sources: SearchResult[];
  status: "running" | "done" | "error";
  timestamp: string;
}

export interface TeamAnalysis {
  teamName: string;
  injuries: string;
  suspensions: string;
  recentForm: string;
  xgStats: string;
  news: string;
  comments: string;
  tactics: string;
  starPlayers: string;
  transfers: string;
  socialBuzz: string;
  overallRating: string;
}

export interface MatchContext {
  homeAwaySplit: string;
  fixtureFatigue: string;
  lineupMatchup: string;
  odds: string;
  weather: string;
  motivation: string;
  referee: string;
  headToHead: string;
  quantModel: string;
  devilsAdvocate: string;
}

export interface MatchAnalysisResult {
  homeTeamAnalysis: TeamAnalysis;
  awayTeamAnalysis: TeamAnalysis;
  matchContext: MatchContext;
  headToHead: string;
  finalPrediction: string;
  logs: AgentLog[];
}

type LogCallback = (log: AgentLog) => void;

/**
 * Run async tasks with a concurrency limit so 25+ parallel web+AI tasks do not
 * trip OpenAI/Tavily rate limits.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

type SearchFn = () => Promise<{ results: SearchResult[]; answer?: string }>;

async function runAgent(opts: {
  agentName: string;
  agentEmoji: string;
  runningStep: string;
  doneStep: string;
  search: SearchFn;
  systemPrompt: string;
  buildUserPrompt: (results: SearchResult[], answer?: string) => string;
  onLog: LogCallback;
}): Promise<{ content: string; sources: SearchResult[] }> {
  const { agentName, agentEmoji, runningStep, doneStep, search, systemPrompt, buildUserPrompt, onLog } =
    opts;

  onLog({
    agentName,
    agentEmoji,
    step: runningStep,
    content: "",
    sources: [],
    status: "running",
    timestamp: new Date().toISOString(),
  });

  try {
    const { results, answer } = await search();
    const content = await analyzeWithAI(systemPrompt, buildUserPrompt(results, answer), {
      maxTokens: 1100,
      temperature: 0.25,
    });

    onLog({
      agentName,
      agentEmoji,
      step: doneStep,
      content,
      sources: results,
      status: "done",
      timestamp: new Date().toISOString(),
    });

    return { content, sources: results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onLog({
      agentName,
      agentEmoji,
      step: `${agentName} - Hata: ${message}`,
      content: `Bu ajan güncel veriyi alırken bir sorunla karşılaştı: ${message}`,
      sources: [],
      status: "error",
      timestamp: new Date().toISOString(),
    });
    return { content: `Veri alınamadı: ${message}`, sources: [] };
  }
}

function sourcesToText(results: SearchResult[], answer?: string): string {
  const body = results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}${r.publishedDate ? ` (${r.publishedDate})` : ""}\n${r.content}`
    )
    .join("\n\n");
  return `${answer ? `📌 Web Özeti: ${answer}\n\n` : ""}${body}`;
}

const BASE_PERSONA =
  "Sen veri odaklı elit bir futbol analistisisin. SADECE verilen güncel web araştırma sonuçlarına dayan, uydurma yapma. Popüler takım yanlılığına düşme; somut rakamlara, eksiklerin ilk 11'deki gerçek ağırlığına ve objektif sinyallere odaklan. Her zaman Türkçe, net ve maddeler halinde yanıt ver.";

// =====================================================
// 1. TEAM-LEVEL RESEARCH AGENTS
// =====================================================

export function runInjuryAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Sakatlık & Ceza Ajanı",
    agentEmoji: "🏥",
    runningStep: `${teamName} güncel sakatlık ve ceza listesi taranıyor...`,
    doneStep: `${teamName} - Sakatlık & ceza analizi tamamlandı`,
    search: () => searchTeamInjuries(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} takımının EN GÜNCEL sakat, cezalı ve şüpheli oyuncularını çıkar. Her eksik oyuncunun as (ilk 11) oyuncu mu yoksa yedek mi olduğunu ve yokluğunun takımı 10 üzerinden ne kadar zayıflatacağını (Etki Skoru: X/10) belirt.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runFormAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Form Analiz Ajanı",
    agentEmoji: "📊",
    runningStep: `${teamName} son maç formu ve rakiplerin zorluk derecesi inceleniyor...`,
    doneStep: `${teamName} - Form analizi tamamlandı`,
    search: () => searchTeamForm(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} takımının son 5 maç performansını, lig sıralamasını, gol ortalamasını ve ÖZELLİKLE oynadığı rakiplerin güç seviyesini (güçlü rakiplere karşı mı kazandı, zayıflara mı takıldı?) analiz et.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runXgStatsAgent(
  teamName: string,
  league: string | undefined,
  onLog: LogCallback
) {
  return runAgent({
    agentName: "xG & İleri İstatistik Ajanı",
    agentEmoji: "📈",
    runningStep: `${teamName} gol beklentisi (xG), şut kalitesi ve ileri metrikleri hesaplanıyor...`,
    doneStep: `${teamName} - xG & ileri istatistik analizi tamamlandı`,
    search: () => searchExpectedGoals(teamName, league),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} takımının ileri istatistiklerini ve şans faktörünü analiz et: maç başı gol beklentisi (xG), kalesinde gördüğü pozisyon kalitesi (xGA), şut isabeti, pozisyon üretme gücü. Takım son haftalarda hak ettiğinden fazla mı puan topladı (şanslı mıydı) yoksa şanssız mıydı? Net belirt.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runNewsAgent(teamName: string, league: string | undefined, onLog: LogCallback) {
  return runAgent({
    agentName: "Güncel Haberler Ajanı",
    agentEmoji: "📰",
    runningStep: `${teamName} son dakika kulüp ve kamp haberleri taranıyor...`,
    doneStep: `${teamName} - Haber analizi tamamlandı`,
    search: () => searchSportsNews(teamName, league),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} hakkındaki EN SON haberleri özetle: teknik heyet krizi/uyumu, maaş/yönetim sorunları, kamp haberleri ve maça doğrudan etki edecek somut gelişmeler.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runCommentsAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Uzman Yorum Ajanı",
    agentEmoji: "💬",
    runningStep: `${teamName} hakkında analist ve uzman görüşleri toplanıyor...`,
    doneStep: `${teamName} - Uzman yorum analizi tamamlandı`,
    search: () => searchTeamComments(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} hakkındaki uzman analizlerini sentezle: takımın en belirgin güçlü yönü, en kırılgan zaafı ve mevcut form/kadro gücü. SONUNDA mutlaka "Genel Performans Notu: X/10" formatında objektif bir not ver.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runTacticsAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Teknik Direktör & Taktik Ajanı",
    agentEmoji: "👔",
    runningStep: `${teamName} diziliş, pres şiddeti ve oyun planı inceleniyor...`,
    doneStep: `${teamName} - Taktik analizi tamamlandı`,
    search: () => searchCoachTactics(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} teknik direktörünün oyun sistemini analiz et: formasyon, geriden oyun kurma vs geçiş hücumu, savunma çizgisi yüksekliği ve skor öne geçtiğinde veya geriye düştüğünde nasıl reaksiyon verdiği.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runStarPlayerAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Yıldız Oyuncu Ajanı",
    agentEmoji: "⭐",
    runningStep: `${teamName} skorer ve kilit oyuncularının son haftalardaki formu inceleniyor...`,
    doneStep: `${teamName} - Yıldız oyuncu analizi tamamlandı`,
    search: () => searchStarPlayers(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} takımında maçı tek başına çözebilecek kilit oyuncuların (forvet, oyun kurucu, kaleci) güncel form durumunu, gol/asist katkısını ve sahada olup olmayacağını değerlendir.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runTransferAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Transfer & Kadro Derinliği Ajanı",
    agentEmoji: "🔁",
    runningStep: `${teamName} yedek kulübesi gücü ve kadro derinliği inceleniyor...`,
    doneStep: `${teamName} - Kadro derinliği analizi tamamlandı`,
    search: () => searchTransferAndSquad(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} kadro kalitesini, yedek kulübesinden hamle gücünü (60. dakikadan sonra oyuna girebilecek isimler) ve yeni oyuncuların uyum durumunu değerlendir.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runSocialAgent(teamName: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Sosyal Medya & Baskı Ajanı",
    agentEmoji: "📱",
    runningStep: `${teamName} üzerindeki taraftar desteği/baskısı ölçülüyor...`,
    doneStep: `${teamName} - Taraftar & psikoloji analizi tamamlandı`,
    search: () => searchSocialMediaBuzz(teamName),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${teamName} camiasındaki psikolojik havayı ölç: özgüven mi var, yoksa puan kaybı korkusu/protesto baskısı mı? Bu durum sahadaki oyuncuları olumlu mu yoksa stres yaratarak olumsuz mu etkiler?\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

// =====================================================
// 2. ACCURACY-BOOSTING MATCH CONTEXT & SPLIT AGENTS
// =====================================================

export function runHomeAwaySplitAgent(
  homeTeam: string,
  awayTeam: string,
  league: string | undefined,
  onLog: LogCallback
) {
  return runAgent({
    agentName: "İç / Dış Saha Split Uzmanı",
    agentEmoji: "🏟️",
    runningStep: `${homeTeam} iç saha vs ${awayTeam} deplasman karnesi karşılaştırılıyor...`,
    doneStep: `İç saha / deplasman split analizi tamamlandı`,
    search: () => searchHomeAwaySplit(homeTeam, awayTeam, league),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `Genel puan durumunu bir kenara bırak ve SADECE iç/dış saha ayrımına odaklan:\n1) ${homeTeam} kendi evinde maç başı kaç puan ve gol üretiyor, ne kadar gol yiyor?\n2) ${awayTeam} deplasmanda nasıl oynuyor (deplasman fobisi var mı, yoksa kontratakla tehlikeli mi)?\n3) İç saha avantajı bu eşleşmede ne kadar belirleyici?\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runFixtureFatigueAgent(
  homeTeam: string,
  awayTeam: string,
  onLog: LogCallback
) {
  return runAgent({
    agentName: "Fikstür Yorgunluğu & Rotasyon Ajanı",
    agentEmoji: "⏱️",
    runningStep: `Dinlenme günleri, kupa/Avrupa yorgunluğu ve rotasyon riski hesaplanıyor...`,
    doneStep: `Fikstür yorgunluğu & rotasyon analizi tamamlandı`,
    search: () => searchFixtureFatigue(homeTeam, awayTeam),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${homeTeam} ve ${awayTeam} takımlarının fiziksel tazelik ve fikstür sıkışıklığını karşılaştır:\n- Hafta içi Avrupa kupası veya yerel kupa maçı oynayan, seyahat eden taraf var mı?\n- İki takımın son maçından bu yana kaç gün dinlenme farkı var?\n- Bir sonraki hafta çok kritik bir maç nedeniyle bu maçta rotasyon (yedek ağırlıklı çıkma) ihtimali var mı?\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runLineupMatchupAgent(
  homeTeam: string,
  awayTeam: string,
  onLog: LogCallback
) {
  return runAgent({
    agentName: "Muhtemel 11 & Duran Top Ajanı",
    agentEmoji: "🧩",
    runningStep: `Muhtemel ilk 11'ler, mevki eşleşmeleri ve duran top etkinliği inceleniyor...`,
    doneStep: `Muhtemel 11 & taktik eşleşme analizi tamamlandı`,
    search: () => searchLineupMatchup(homeTeam, awayTeam),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${homeTeam} vs ${awayTeam} maçının sahadaki taktik eşleşmesini analiz et:\n- Beklenen muhtemel 11'ler ve kritik mevki eşleşmeleri (ör. hızlı kanat vs ağır bek).\n- Duran top (korner, frikik, hava topu) konusunda hangi takım üstün, hangisi zaaf yaşıyor?\n- Oyun tarzları birbirine nasıl etki eder (kilitlenen düşük tempolu maç mı, açık gollü maç mı)?\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runH2HAgent(homeTeam: string, awayTeam: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Tarihsel H2H Ajanı",
    agentEmoji: "⚔️",
    runningStep: `${homeTeam} vs ${awayTeam} son yıllardaki karşılaşma paternleri inceleniyor...`,
    doneStep: `${homeTeam} vs ${awayTeam} - H2H analizi tamamlandı`,
    search: () => searchHeadToHead(homeTeam, awayTeam),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${homeTeam} ile ${awayTeam} arasındaki yakın dönem (özellikle son 3-5 maç) karşılaşmalarını analiz et: psikolojik üstünlük, gol ortalaması, karşılıklı gol (KG) eğilimi ve bu stadyumdaki son sonuçlar.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runOddsAgent(
  homeTeam: string,
  awayTeam: string,
  league: string | undefined,
  onLog: LogCallback
) {
  return runAgent({
    agentName: "Keskin Oran & Piyasa Hareketleri Ajanı",
    agentEmoji: "📉",
    runningStep: `${homeTeam} vs ${awayTeam} piyasa oranları, ima edilen olasılıklar ve oran düşüşleri taranıyor...`,
    doneStep: `Keskin oran & piyasa analizi tamamlandı`,
    search: () => searchBettingOdds(homeTeam, awayTeam, league),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${homeTeam} vs ${awayTeam} maçı için piyasa oranlarını ve oran hareketlerini analiz et:\n- Piyasa hangi takımı ne kadar favori görüyor (oranlardan ima edilen yaklaşık % olasılıklar)?\n- Oranlarda dikkat çekici bir düşüş/yükseliş veya "tuzak favori" sinyali var mı?\n- Alt/Üst (2.5 gol) ve KG beklentisi piyasa tarafından nasıl fiyatlanmış?\n(Not: Tamamen istatistiksel olasılık okuması yap.)\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runWeatherAgent(homeTeam: string, matchDate: string | undefined, onLog: LogCallback) {
  return runAgent({
    agentName: "Hava Durumu & Saha Zemin Ajanı",
    agentEmoji: "🌦️",
    runningStep: `Maç günü hava durumu, rüzgar/yağış ve zemin etkisi kontrol ediliyor...`,
    doneStep: `Hava durumu & zemin analizi tamamlandı`,
    search: () => searchWeatherAndVenue(homeTeam, matchDate),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${homeTeam} stadyumundaki hava ve zemin koşullarını değerlendir: şiddetli yağış, soğuk/sıcak veya bozuk zemin var mı? Bu durum pas yapan teknik takımı bozar mı ve gol sayısını düşürür mü?\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runMotivationAgent(
  homeTeam: string,
  awayTeam: string,
  league: string | undefined,
  onLog: LogCallback
) {
  return runAgent({
    agentName: "Motivasyon & Hedef Ajanı",
    agentEmoji: "🔥",
    runningStep: `İki takımın ligdeki puan ihtiyacı ve maç motivasyonu karşılaştırılıyor...`,
    doneStep: `Motivasyon & hedef analizi tamamlandı`,
    search: () => searchMotivationFactors(homeTeam, awayTeam, league),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `${homeTeam} vs ${awayTeam} maçında hangi takımın puana DAHA ÇOK ihtiyacı var? (Şampiyonluk, Avrupa potası, küme düşme hattı, iddiasız orta sıra rahatlığı veya beraberliğin iki takıma da yetmesi durumu). Somut olarak değerlendir.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

export function runRefereeAgent(homeTeam: string, awayTeam: string, onLog: LogCallback) {
  return runAgent({
    agentName: "Hakem & Disiplin Ajanı",
    agentEmoji: "🟨",
    runningStep: `Maçın hakemi, kart/penaltı istatistikleri ve oyun temposuna etkisi inceleniyor...`,
    doneStep: `Hakem & disiplin analizi tamamlandı`,
    search: () => searchRefereeInfo(homeTeam, awayTeam),
    systemPrompt: BASE_PERSONA,
    buildUserPrompt: (results, answer) =>
      `Maçın hakemi açıklandıysa hakemin maç başı kart/penaltı ortalamasını, oyunu sık durdurup durdurmadığını ve ev sahibi baskısından etkilenme eğilimini değerlendir. Henüz açıklanmadıysa bunu kısaca belirt.\n\n${sourcesToText(results, answer)}`,
    onLog,
  });
}

// =====================================================
// 3. ACCURACY VERIFICATION & CALIBRATION COMMITTEE
//    (Kantitatif Poisson Modelcisi + Şeytanın Avukatı + Ensemble Komutan)
// =====================================================

function condense(text: string, maxChars = 550): string {
  if (!text) return "Veri bulunamadı.";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars).trim() + "…";
}

function buildCompactDossier(
  home: TeamAnalysis,
  away: TeamAnalysis,
  ctx: Omit<MatchContext, "quantModel" | "devilsAdvocate">
): string {
  return `[EV SAHİBİ: ${home.teamName} | Uzman Notu: ${home.overallRating}]
• Sakatlık/Ceza: ${condense(home.injuries, 450)}
• Form: ${condense(home.recentForm, 450)}
• xG & İleri İstatistik: ${condense(home.xgStats, 450)}
• Taktik & Yıldızlar: ${condense(home.tactics, 320)} | ${condense(home.starPlayers, 320)}
• Kadro & Nabız: ${condense(home.transfers, 260)} | ${condense(home.socialBuzz, 260)}

[DEPLASMAN: ${away.teamName} | Uzman Notu: ${away.overallRating}]
• Sakatlık/Ceza: ${condense(away.injuries, 450)}
• Form: ${condense(away.recentForm, 450)}
• xG & İleri İstatistik: ${condense(away.xgStats, 450)}
• Taktik & Yıldızlar: ${condense(away.tactics, 320)} | ${condense(away.starPlayers, 320)}
• Kadro & Nabız: ${condense(away.transfers, 260)} | ${condense(away.socialBuzz, 260)}

[KARŞILAŞTIRMALI MAÇ FAKTÖRLERİ]
• İç/Dış Saha Split: ${condense(ctx.homeAwaySplit, 480)}
• Fikstür Yorgunluğu & Rotasyon: ${condense(ctx.fixtureFatigue, 420)}
• Muhtemel 11 & Duran Top Eşleşmesi: ${condense(ctx.lineupMatchup, 450)}
• Piyasa Oranları & Hareketler: ${condense(ctx.odds, 450)}
• Motivasyon & Hedef: ${condense(ctx.motivation, 380)}
• Tarihsel H2H: ${condense(ctx.headToHead, 380)}
• Hava/Zemin & Hakem: ${condense(ctx.weather, 250)} | ${condense(ctx.referee, 250)}`;
}

/**
 * Stage 2A: Quantitative & Poisson Goal Model Agent
 * Translates form, xG, home/away splits, injuries & odds into mathematical expected goals (λ)
 * and calibrated probability distributions (%1, %X, %2, %BTTS, %Over2.5).
 */
export async function runQuantPoissonAgent(
  homeTeam: string,
  awayTeam: string,
  dossier: string,
  onLog: LogCallback
): Promise<string> {
  onLog({
    agentName: "Kantitatif & Poisson Model Ajanı",
    agentEmoji: "📐",
    step: `${homeTeam} vs ${awayTeam} beklenen gol (λ) ve Poisson olasılık dağılımı hesaplanıyor...`,
    content: "",
    sources: [],
    status: "running",
    timestamp: new Date().toISOString(),
  });

  try {
    const content = await analyzeWithAI(
      "Sen kıdemli bir spor ekonometristi ve Poisson/xG olasılık modelleyicisisin. Duygusal yorum yapmazsın; form, xG, iç/dış saha karnesi, önemli sakatlık kesintileri, yorgunluk ve piyasa oranlarını birleştirerek matematiksel olarak tutarlı olasılıklar hesaplar ve Türkçe sunarsın. Ev/Beraberlik/Deplasman yüzdelerinin toplamı TAM %100 olmalıdır.",
      `Aşağıdaki saha verilerini kullanarak ${homeTeam} (Ev) vs ${awayTeam} (Dep) maçı için kantitatif gol beklentisi ve olasılık modeli kur:

${dossier}

Şu başlıklarla net hesaplama sun:
1. **Düzeltilmiş Gol Beklentisi (λ):** ${homeTeam} λ_ev = X.XX gol | ${awayTeam} λ_dep = Y.YY gol (sakatlık, yorgunluk ve iç/dış saha düzeltmesi uygulanmış)
2. **Maç Sonucu Olasılık Dağılımı (Toplam %100):**
   - Ev Sahibi (${homeTeam}) Kazanır: %XX
   - Beraberlik: %XX
   - Deplasman (${awayTeam}) Kazanır: %XX
3. **Gol Piyasası Olasılıkları:**
   - 2.5 Gol Üst: %XX | 2.5 Gol Alt: %XX
   - Karşılıklı Gol (KG Var): %XX
4. **En Olası 3 Kesin Skor:** (yüzdeleriyle birlikte)
5. **Matematiksel Değer (Value) Sinyali:** Piyasa oranlarına kıyasla hangi seçenek matematiksel olarak daha değerli?`,
      { maxTokens: 1100, temperature: 0.15 }
    );

    onLog({
      agentName: "Kantitatif & Poisson Model Ajanı",
      agentEmoji: "📐",
      step: `Poisson gol beklentisi ve olasılık dağılımı hesaplandı`,
      content,
      sources: [],
      status: "done",
      timestamp: new Date().toISOString(),
    });
    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onLog({
      agentName: "Kantitatif & Poisson Model Ajanı",
      agentEmoji: "📐",
      step: `Kantitatif model hatası: ${msg}`,
      content: `Kantitatif hesaplama yapılamadı: ${msg}`,
      sources: [],
      status: "error",
      timestamp: new Date().toISOString(),
    });
    return `Kantitatif model verisi alınamadı: ${msg}`;
  }
}

/**
 * Stage 2B: Devil's Advocate & Bias Auditor Agent
 * Actively hunts for traps, overhyped favorites, xG regression risks, hidden fatigue,
 * and conflicting agent reports to prevent false-confident predictions.
 */
export async function runDevilsAdvocateAgent(
  homeTeam: string,
  awayTeam: string,
  dossier: string,
  onLog: LogCallback
): Promise<string> {
  onLog({
    agentName: "Şeytanın Avukatı & Tuzak Denetçisi",
    agentEmoji: "⚖️",
    step: `Popüler takım yanlılığı, çelişkili veriler ve sürpriz/tuzak riskleri denetleniyor...`,
    content: "",
    sources: [],
    status: "running",
    timestamp: new Date().toISOString(),
  });

  try {
    const content = await analyzeWithAI(
      "Sen keskin gözlü bir 'Şeytanın Avukatı' (Devil's Advocate) ve risk denetçisisin. Görevin çoğunluğun yanıldığı noktaları yakalamak, büyük isim algısına kapılmayı önlemek ve tahmin isabet oranını düşüren tuzakları deşifre etmektir. Her zaman Türkçe ve somut kanıtlarla konuş.",
      `Aşağıdaki saha raporlarını eleştirel gözle denetle (${homeTeam} vs ${awayTeam}):

${dossier}

Şu 4 kritik soruyu acımasızca yanıtla:
1. **Yanıltıcı Form / İsim Tuzağı:** Kağıt üzerinde favori görünen takım aslında neden puan kaybedebilir? (xG gerilemesi, kilit eksik, yorgunluk, kapanan savunmayı açamama vb.)
2. **Sürpriz / Beraberlik Senaryosu:** Zayıf görünen tarafın veya beraberliğin şansı sanılandan yüksek mi? Nasıl bir senaryoda maç kilitlenir veya ters köşe olur?
3. **Veri Çelişkileri & Belirsizlikler:** Ajan raporları arasında çelişen veya belirsiz kalan kritik bir risk var mı?
4. **Tuzak Risk Seviyesi:** DÜŞÜK / ORTA / YÜKSEK — Tahmin Komutanı'na net uyarı notu (ör. "Direkt galibiyet riskli, çifte şans / gol tercihi daha güvenli" veya "Favori gerçekten çok net, sürpriz ihtimali düşük").`,
      { maxTokens: 1100, temperature: 0.3 }
    );

    onLog({
      agentName: "Şeytanın Avukatı & Tuzak Denetçisi",
      agentEmoji: "⚖️",
      step: `Yanlılık ve tuzak denetimi tamamlandı`,
      content,
      sources: [],
      status: "done",
      timestamp: new Date().toISOString(),
    });
    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onLog({
      agentName: "Şeytanın Avukatı & Tuzak Denetçisi",
      agentEmoji: "⚖️",
      step: `Denetim hatası: ${msg}`,
      content: `Denetim yapılamadı: ${msg}`,
      sources: [],
      status: "error",
      timestamp: new Date().toISOString(),
    });
    return `Şeytanın avukatı raporu alınamadı: ${msg}`;
  }
}

function parseRatingNum(rating: string): number {
  const m = rating.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : 5;
}

/**
 * Stage 3: Prediction Commander (Ensemble Synthesis & Probability Calibration)
 */
export async function runPredictionCommanderAgent(
  homeTeam: string,
  awayTeam: string,
  home: TeamAnalysis,
  away: TeamAnalysis,
  ctx: MatchContext,
  dossier: string,
  onLog: LogCallback
): Promise<string> {
  onLog({
    agentName: "Tahmin Komutanı",
    agentEmoji: "🎯",
    step: `18 ajan + Poisson Modeli + Şeytanın Avukatı sentezlenerek kalibre edilmiş final karar üretiliyor...`,
    content: "",
    sources: [],
    status: "running",
    timestamp: new Date().toISOString(),
  });

  const prompt = `${homeTeam} (Ev Sahibi) vs ${awayTeam} (Deplasman) maçı için 18 uzman ajanın verilerini, Kantitatif Poisson Olasılık Modelini ve Şeytanın Avukatı'nın risk denetimini sentezleyerek EN YÜKSEK İSABET ORANLI nihai tahmini üret.

═══ 1) ÖZET SAHA VERİLERİ ═══
${dossier}

═══ 2) KANTİTATİF & POISSON MODEL ÇIKTISI ═══
${condense(ctx.quantModel, 950)}

═══ 3) ŞEYTANIN AVUKATI & RİSK DENETİMİ ═══
${condense(ctx.devilsAdvocate, 950)}

═══ AĞIRLIKLI KARAR KURALLARIN ═══
- Ağırlıklandırma: %30 xG & İç/Dış Saha Split | %25 As Kadro Eksikleri & Yorgunluk | %20 Taktik Eşleşme & Form | %15 Keskin Piyasa Oranları | %10 Motivasyon & H2H.
- Popüler isme değil veriye güven! Eğer Şeytanın Avukatı ciddi bir tuzak/yorgunluk yakaladıysa veya iki takım birbirine çok yakınsa bunu olasılıklara yansıt.
- Aşağıdaki başlıkların TAMAMINI Türkçe, net ve eksiksiz doldur:

**AJAN ORDUSU KONSENSÜS & OLASILIK TABLOSU**
• 🏠 ${homeTeam} Kazanır (MS 1): %XX
• 🤝 Beraberlik (MS X): %XX
• ✈️ ${awayTeam} Kazanır (MS 2): %XX
• ⚽ Gol Beklentisi: [2.5 ÜST %XX / 2.5 ALT %XX] | [KG VAR %XX / KG YOK %XX]

**GENEL DEĞERLENDİRME & KANTİTATİF SENTEZ**
[Saha verileri, xG, iç/dış saha karnesi ve yorgunluk faktörlerinin net özeti]

**AVANTAJ ANALİZİ & TAKTİK EŞLEŞME**
[Hangi takım sahada neden ve nasıl üstünlük kurar?]

**ŞEYTANIN AVUKATI UYARISI & RİSK FAKTÖRLERİ**
[Favoriyi bekleyen en büyük tehlike ve maçın kırılma noktası]

**TAHMİN SONUCU**
🏆 Ana Tahmin (Kazanan / Sonuç): [${homeTeam} Kazanır / ${awayTeam} Kazanır / Beraberlik]
🛡️ En Yüksek İsabetli (Güvenli) Tercih: [Örn: ${homeTeam} Yenilmez (1X), KG Var, 1.5 Üst vb. — isabet oranı en yüksek seçenek]
⚽ Tahmini Skor: [Örn: 2-1] (Alternatif Skor: [Örn: 1-1])

**DOĞRULUK & GÜVEN ENDEKSİ**
• Ana Tahmin Güven Oranı: %XX
• Güvenli Tercih İsabet Beklentisi: %XX
• Gerekçe: [1-2 cümlelik net matematiksel gerekçe]`;

  const commanderSystem =
    "Sen dünyanın en yüksek isabet oranına sahip Ensemble Spor Analiz Başkomutanısın. Saha istihbaratını, Poisson istatistik modelini ve Şeytanın Avukatı denetimini birleştirerek kalibre edilmiş, tutarlı ve eksiksiz tahminler üretirsin. Her zaman Türkçe yanıt ver, hiçbir başlığı atlama ve asla cevabı yarıda kesme.";

  let prediction = "";
  try {
    prediction = await analyzeWithAI(commanderSystem, prompt, {
      model: "gpt-4o-mini",
      maxTokens: 2800,
      temperature: 0.25,
    });
  } catch (err) {
    console.error("Commander primary attempt failed:", err);
  }

  // Fallback if primary attempt failed or was unexpectedly short
  if (!prediction || prediction.trim().length < 100) {
    onLog({
      agentName: "Tahmin Komutanı",
      agentEmoji: "🎯",
      step: `İlk sentez yetersiz kaldı — çekirdek model verileriyle yeniden hesaplanıyor...`,
      content: "",
      sources: [],
      status: "running",
      timestamp: new Date().toISOString(),
    });

    const leanPrompt = `${homeTeam} (Ev) vs ${awayTeam} (Deplasman) maçı final tahmini:
Poisson Modeli: ${condense(ctx.quantModel, 600)}
Şeytanın Avukatı: ${condense(ctx.devilsAdvocate, 500)}
İç/Dış Saha Split: ${condense(ctx.homeAwaySplit, 350)}

Şu başlıkların hepsini Türkçe ve net doldur:
**AJAN ORDUSU KONSENSÜS & OLASILIK TABLOSU** (MS1 % / MSX % / MS2 %)
**GENEL DEĞERLENDİRME & KANTİTATİF SENTEZ**
**ŞEYTANIN AVUKATI UYARISI & RİSK FAKTÖRLERİ**
**TAHMİN SONUCU** (🏆 Ana Tahmin, 🛡️ En Yüksek İsabetli Tercih, ⚽ Tahmini Skor)
**DOĞRULUK & GÜVEN ENDEKSİ**`;

    try {
      prediction = await analyzeWithAI(commanderSystem, leanPrompt, {
        model: "gpt-4o-mini",
        maxTokens: 1600,
        temperature: 0.3,
      });
    } catch (err) {
      console.error("Commander fallback attempt failed:", err);
    }
  }

  const finalText =
    prediction && prediction.trim().length >= 40
      ? prediction.trim()
      : `**GENEL DEĞERLENDİRME & KANTİTATİF SENTEZ**\n${condense(ctx.quantModel, 500)}\n\n**TAHMİN SONUCU**\n🏆 Ana Tahmin: ${
          parseRatingNum(home.overallRating) >= parseRatingNum(away.overallRating)
            ? `${homeTeam} (Ev sahibi avantajıyla bir adım önde)`
            : `${awayTeam} (Form ve performans notuyla önde)`
        }\n🛡️ En Yüksek İsabetli (Güvenli) Tercih: ${
          parseRatingNum(home.overallRating) >= parseRatingNum(away.overallRating)
            ? `${homeTeam} Yenilmez (1X)`
            : `${awayTeam} Yenilmez (X2)`
        }`;

  onLog({
    agentName: "Tahmin Komutanı",
    agentEmoji: "🎯",
    step: `${homeTeam} vs ${awayTeam} - Ensemble & kalibre edilmiş final tahmin hazır`,
    content: finalText,
    sources: [],
    status: "done",
    timestamp: new Date().toISOString(),
  });

  return finalText;
}

// =====================================================
// MAIN MULTI-STAGE ORCHESTRATION PIPELINE
// =====================================================

function extractRating(text: string): string {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*\/\s*10/);
  return m ? `${m[1]}/10` : "N/A";
}

export async function runFullMatchAnalysis(
  homeTeam: string,
  awayTeam: string,
  league: string | undefined,
  onLog: LogCallback,
  matchDate?: string
): Promise<MatchAnalysisResult> {
  const allLogs: AgentLog[] = [];
  const logCollector: LogCallback = (log) => {
    allLogs.push(log);
    onLog(log);
  };

  assertConfigured();

  logCollector({
    agentName: "Orkestrasyon Ajanı",
    agentEmoji: "🤖",
    step: `3 Katmanlı Doğruluk Motoru başlatıldı! ${homeTeam} vs ${awayTeam} için 18 uzman ajan devrede...`,
    content: `🌐 CANLI ENSEMBLE MODU — 3 Katmanlı Doğruluk & Kalibrasyon Mimarisi (OpenAI + Tavily)\n\n1️⃣ Katman — Takım & İleri İstatistik Ajanları (x2 Takım):\n• 📈 xG & İleri İstatistik (Gol beklentisi & şans analizi)\n• 🏥 Sakatlık & Ceza (As kadro etki skoru)\n• 📊 Form & Rakip Zorluk Derecesi\n• 👔 Teknik Direktör & Taktik Sistem\n• ⭐ Yıldız Oyuncu Formu\n• 🔁 Kadro Derinliği & Hamle Gücü\n• 📰 Son Dakika Haberler | 📱 Psikolojik Baskı | 💬 Uzman Notu\n\n2️⃣ Katman — Maç Dinamikleri & Keskin Piyasa Ajanları:\n• 🏟️ İç Saha / Deplasman Split Uzmanı\n• ⏱️ Fikstür Yorgunluğu & Rotasyon Riski\n• 🧩 Muhtemel 11 & Duran Top Eşleşmesi\n• 📉 Keskin Oran & Piyasa Hareketleri\n• 🔥 Motivasyon & Puan İhtiyacı | ⚔️ H2H | 🌦️ Zemin | 🟨 Hakem\n\n3️⃣ Katman — Çapraz Doğrulama & Olasılık Kalibrasyon Komitesi:\n• 📐 Kantitatif & Poisson Gol Modelcisi\n• ⚖️ Şeytanın Avukatı & Tuzak Denetçisi\n• 🎯 Tahmin Komutanı (Ağırlıklı Ensemble Karar Merkezi)`,
    sources: [],
    status: "done",
    timestamp: new Date().toISOString(),
  });

  // STAGE 1: Gather fresh intelligence across 26 specialized tasks (concurrency = 6)
  const [
    hInjury,
    aInjury,
    hForm,
    aForm,
    hXg,
    aXg,
    hNews,
    aNews,
    hComments,
    aComments,
    hTactics,
    aTactics,
    hStar,
    aStar,
    hTransfer,
    aTransfer,
    hSocial,
    aSocial,
    homeAwaySplit,
    fixtureFatigue,
    lineupMatchup,
    h2h,
    odds,
    weather,
    motivation,
    referee,
  ] = await runWithConcurrency(
    [
      () => runInjuryAgent(homeTeam, logCollector),
      () => runInjuryAgent(awayTeam, logCollector),
      () => runFormAgent(homeTeam, logCollector),
      () => runFormAgent(awayTeam, logCollector),
      () => runXgStatsAgent(homeTeam, league, logCollector),
      () => runXgStatsAgent(awayTeam, league, logCollector),
      () => runNewsAgent(homeTeam, league, logCollector),
      () => runNewsAgent(awayTeam, league, logCollector),
      () => runCommentsAgent(homeTeam, logCollector),
      () => runCommentsAgent(awayTeam, logCollector),
      () => runTacticsAgent(homeTeam, logCollector),
      () => runTacticsAgent(awayTeam, logCollector),
      () => runStarPlayerAgent(homeTeam, logCollector),
      () => runStarPlayerAgent(awayTeam, logCollector),
      () => runTransferAgent(homeTeam, logCollector),
      () => runTransferAgent(awayTeam, logCollector),
      () => runSocialAgent(homeTeam, logCollector),
      () => runSocialAgent(awayTeam, logCollector),
      () => runHomeAwaySplitAgent(homeTeam, awayTeam, league, logCollector),
      () => runFixtureFatigueAgent(homeTeam, awayTeam, logCollector),
      () => runLineupMatchupAgent(homeTeam, awayTeam, logCollector),
      () => runH2HAgent(homeTeam, awayTeam, logCollector),
      () => runOddsAgent(homeTeam, awayTeam, league, logCollector),
      () => runWeatherAgent(homeTeam, matchDate, logCollector),
      () => runMotivationAgent(homeTeam, awayTeam, league, logCollector),
      () => runRefereeAgent(homeTeam, awayTeam, logCollector),
    ],
    6
  );

  const homeTeamAnalysis: TeamAnalysis = {
    teamName: homeTeam,
    injuries: hInjury.content,
    suspensions: "",
    recentForm: hForm.content,
    xgStats: hXg.content,
    news: hNews.content,
    comments: hComments.content,
    tactics: hTactics.content,
    starPlayers: hStar.content,
    transfers: hTransfer.content,
    socialBuzz: hSocial.content,
    overallRating: extractRating(hComments.content),
  };

  const awayTeamAnalysis: TeamAnalysis = {
    teamName: awayTeam,
    injuries: aInjury.content,
    suspensions: "",
    recentForm: aForm.content,
    xgStats: aXg.content,
    news: aNews.content,
    comments: aComments.content,
    tactics: aTactics.content,
    starPlayers: aStar.content,
    transfers: aTransfer.content,
    socialBuzz: aSocial.content,
    overallRating: extractRating(aComments.content),
  };

  const baseContext = {
    homeAwaySplit: homeAwaySplit.content,
    fixtureFatigue: fixtureFatigue.content,
    lineupMatchup: lineupMatchup.content,
    odds: odds.content,
    weather: weather.content,
    motivation: motivation.content,
    referee: referee.content,
    headToHead: h2h.content,
  };

  const dossier = buildCompactDossier(homeTeamAnalysis, awayTeamAnalysis, baseContext);

  // STAGE 2: Run Quantitative Poisson Model & Devil's Advocate in parallel!
  const [quantModel, devilsAdvocate] = await Promise.all([
    runQuantPoissonAgent(homeTeam, awayTeam, dossier, logCollector),
    runDevilsAdvocateAgent(homeTeam, awayTeam, dossier, logCollector),
  ]);

  const matchContext: MatchContext = {
    ...baseContext,
    quantModel,
    devilsAdvocate,
  };

  // STAGE 3: Ensemble Commander Calibration & Final Decision
  const finalPrediction = await runPredictionCommanderAgent(
    homeTeam,
    awayTeam,
    homeTeamAnalysis,
    awayTeamAnalysis,
    matchContext,
    dossier,
    logCollector
  );

  return {
    homeTeamAnalysis,
    awayTeamAnalysis,
    matchContext,
    headToHead: h2h.content,
    finalPrediction,
    logs: allLogs,
  };
}
