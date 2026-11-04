"use client";

import { useState, useCallback, useEffect } from "react";
import MatchForm from "@/components/MatchForm";
import AgentDashboard from "@/components/AgentDashboard";
import AnalysisResult from "@/components/AnalysisResult";
import HistoryPanel from "@/components/HistoryPanel";
import { AgentLog } from "@/lib/agents";

export interface TeamAnalysisData {
  teamName: string;
  injuries: string;
  suspensions: string;
  recentForm: string;
  xgStats?: string;
  news: string;
  comments: string;
  tactics: string;
  starPlayers: string;
  transfers: string;
  socialBuzz: string;
  overallRating: string;
}

export interface MatchContextData {
  homeAwaySplit?: string;
  fixtureFatigue?: string;
  lineupMatchup?: string;
  odds: string;
  weather: string;
  motivation: string;
  referee: string;
  headToHead: string;
  quantModel?: string;
  devilsAdvocate?: string;
}

export interface AnalysisData {
  homeTeamAnalysis: TeamAnalysisData;
  awayTeamAnalysis: TeamAnalysisData;
  matchContext?: MatchContextData;
  headToHead: string;
  finalPrediction: string;
}

export default function HomePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [currentMatch, setCurrentMatch] = useState<{
    homeTeam: string;
    awayTeam: string;
    league?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"analyze" | "history">("analyze");
  const [error, setError] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<{
    openai: boolean;
    tavily: boolean;
    setupComplete?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/check-keys")
      .then((r) => r.json())
      .then((data) => setApiKeys(data))
      .catch(() => {});
  }, []);

  const handleStartAnalysis = useCallback(
    async (homeTeam: string, awayTeam: string, league: string, matchDate: string) => {
      setIsAnalyzing(true);
      setLogs([]);
      setAnalysisResult(null);
      setError(null);
      setCurrentMatch({ homeTeam, awayTeam, league });

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeTeam, awayTeam, league, matchDate }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Analiz başlatılamadı");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Stream alınamadı");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "init") {
                  setAnalysisId(data.analysisId);
                } else if (data.type === "log") {
                  setLogs((prev) => [...prev, data.log]);
                } else if (data.type === "complete") {
                  setAnalysisResult(data.result);
                  setIsAnalyzing(false);
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (parseErr) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
        setIsAnalyzing(false);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg">
              ⚽
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">SportAgent AI</h1>
              <p className="text-slate-400 text-xs">Çoklu Ajan Spor Analiz Platformu</p>
            </div>
          </div>
          <nav className="flex gap-1 items-center">
            <button
              onClick={() => setActiveTab("analyze")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "analyze"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              🎯 Maç Analizi
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "history"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              📋 Geçmiş Analizler
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "history" ? (
          <HistoryPanel />
        ) : (
          <div className="space-y-6">
            {/* Hero Banner */}
            {!isAnalyzing && !analysisResult && logs.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-sm mb-4">
                  <span className="animate-pulse">●</span> 18 Uzman Ajan • 3 Katmanlı Doğruluk Motoru
                </div>
                <h2 className="text-4xl font-bold text-white mb-3">
                  Yüksek İsabetli{" "}
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                    Ensemble Spor Analizi
                  </span>
                </h2>
                <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                  Saha ajanları, <strong>xG istatistikleri</strong>, <strong>iç/dış saha split</strong>,{" "}
                  <strong>fikstür yorgunluğu</strong>, <strong>Poisson olasılık modeli</strong> ve{" "}
                  <strong>Şeytanın Avukatı</strong> çapraz doğrulamasıyla yanılma payını minimuma indirir.
                </p>

                {/* API Key Status */}
                {apiKeys && (
                  <div className="flex justify-center gap-3 mt-5 flex-wrap">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
                        apiKeys.openai
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      <span>{apiKeys.openai ? "✓" : "✗"}</span>
                      OpenAI API {apiKeys.openai ? "Bağlı" : "Eksik"}
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
                        apiKeys.tavily
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      <span>{apiKeys.tavily ? "✓" : "✗"}</span>
                      Tavily API {apiKeys.tavily ? "Bağlı" : "Eksik"}
                    </div>
                    {(!apiKeys.openai || !apiKeys.tavily) && (
                      <div className="w-full text-center text-slate-600 text-xs mt-1">
                        .env dosyasına{" "}
                        <code className="bg-slate-800 px-1 rounded text-slate-400">
                          OPENAI_API_KEY
                        </code>{" "}
                        ve{" "}
                        <code className="bg-slate-800 px-1 rounded text-slate-400">
                          TAVILY_API_KEY
                        </code>{" "}
                        ekleyin
                      </div>
                    )}
                  </div>
                )}

          {/* Agent Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-8 max-w-6xl mx-auto">
                  {[
                    { emoji: "📈", name: "xG & Metrik", desc: "Gol Beklentisi" },
                    { emoji: "🏟️", name: "İç/Dış Split", desc: "Saha Karnesi" },
                    { emoji: "⏱️", name: "Yorgunluk", desc: "Fikstür & Rotasyon" },
                    { emoji: "🧩", name: "Muhtemel 11", desc: "Duran Top & Eşleşme" },
                    { emoji: "📉", name: "Keskin Oran", desc: "Piyasa Hareketi" },
                    { emoji: "🏥", name: "Sakatlık", desc: "As Kadro Etkisi" },
                    { emoji: "📊", name: "Form", desc: "Rakip Zorluğu" },
                    { emoji: "👔", name: "Taktik", desc: "Diziliş & Sistem" },
                    { emoji: "⭐", name: "Yıldızlar", desc: "Skorer Formu" },
                    { emoji: "🔁", name: "Derinlik", desc: "Hamle Gücü" },
                    { emoji: "📰", name: "Son Dakika", desc: "Kamp Haberleri" },
                    { emoji: "📱", name: "Psikoloji", desc: "Baskı & Nabız" },
                    { emoji: "🔥", name: "Motivasyon", desc: "Puan İhtiyacı" },
                    { emoji: "⚔️", name: "H2H", desc: "Yakın Tarih" },
                    { emoji: "🟨", name: "Hakem/Zemin", desc: "Kart & Hava" },
                    { emoji: "📐", name: "Poisson Model", desc: "Matematiksel % Olasılık" },
                    { emoji: "⚖️", name: "Şeytanın Avukatı", desc: "Tuzak & Yanılgı Denetçisi" },
                    { emoji: "🎯", name: "Ensemble Komutan", desc: "Kalibre Final Karar" },
                  ].map((agent) => (
                    <div
                      key={agent.name}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-center hover:bg-white/10 transition-all"
                    >
                      <div className="text-2xl mb-1">{agent.emoji}</div>
                      <div className="text-white text-xs font-semibold">{agent.name}</div>
                      <div className="text-slate-500 text-xs">{agent.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Required Banner */}
            {apiKeys && (!apiKeys.openai || !apiKeys.tavily) && (
              <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-5 flex items-start gap-3">
                <div className="text-2xl">🔒</div>
                <div className="flex-1">
                  <div className="text-red-400 font-semibold text-base mb-2">
                    Kurulum Gerekli — Canlı Mod İçin API Anahtarları Eksik
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    Sistem <strong className="text-white">tam kurulum (canlı) modunda</strong>{" "}
                    çalışacak şekilde ayarlandı. Ajan ordusunun gerçek internet araştırması yapması
                    ve AI analizleri üretmesi için aşağıdaki anahtarların tanımlı olması gerekir:
                  </p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={apiKeys.openai ? "text-green-400" : "text-red-400"}>
                        {apiKeys.openai ? "✓" : "✗"}
                      </span>
                      <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 text-xs">
                        OPENAI_API_KEY
                      </code>
                      <span className="text-slate-500 text-xs">
                        — AI analizleri (platform.openai.com/api-keys)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={apiKeys.tavily ? "text-green-400" : "text-red-400"}>
                        {apiKeys.tavily ? "✓" : "✗"}
                      </span>
                      <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 text-xs">
                        TAVILY_API_KEY
                      </code>
                      <span className="text-slate-500 text-xs">
                        — İnternet araştırması (app.tavily.com)
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Bu değişkenleri{" "}
                    <code className="bg-slate-800 px-1 rounded text-slate-300">.env</code> dosyanıza
                    (yerel) veya Vercel → <em>Project Settings → Environment Variables</em> bölümüne
                    ekleyip yeniden başlatın/deploy edin.
                  </p>
                </div>
              </div>
            )}

            {/* Live Mode Active Banner */}
            {apiKeys && apiKeys.openai && apiKeys.tavily && (
              <div className="bg-green-950/30 border border-green-500/40 rounded-2xl p-4 flex items-start gap-3">
                <div className="text-2xl">🌐</div>
                <div className="flex-1">
                  <div className="text-green-400 font-semibold text-sm mb-1">
                    Canlı Mod Aktif — Tam Kurulum Tamamlandı
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    <strong className="text-green-300">18 uzman ajan (3 katmanlı doğruluk motoru)</strong>{" "}
                    gerçek zamanlı internet araştırması yapıyor; <strong>xG</strong>,{" "}
                    <strong>iç/dış saha split</strong>, <strong>fikstür yorgunluğu</strong>,{" "}
                    <strong>muhtemel 11</strong>, <strong>keskin oranlar</strong>,{" "}
                    <strong>Poisson Olasılık Modeli</strong> ve <strong>Şeytanın Avukatı</strong>{" "}
                    denetimiyle kalibre edilmiş en yüksek isabetli tahmini üretiyor.
                  </p>
                </div>
              </div>
            )}

            {/* Match Form */}
            <MatchForm onSubmit={handleStartAnalysis} isLoading={isAnalyzing} />

            {/* Error */}
            {error && (
              <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-4 text-red-400">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <span>⚠️</span> Hata Oluştu
                </div>
                <p className="text-sm">{error}</p>
                <p className="text-xs text-red-500 mt-2">
                  Not: Gerçek analiz için .env dosyasına OPENAI_API_KEY ve TAVILY_API_KEY
                  eklenmelidir.
                </p>
              </div>
            )}

            {/* Agent Dashboard - Live logs */}
            {(isAnalyzing || logs.length > 0) && (
              <AgentDashboard
                logs={logs}
                isRunning={isAnalyzing}
                homeTeam={currentMatch?.homeTeam || ""}
                awayTeam={currentMatch?.awayTeam || ""}
              />
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <AnalysisResult
                result={analysisResult}
                homeTeam={currentMatch?.homeTeam || ""}
                awayTeam={currentMatch?.awayTeam || ""}
                league={currentMatch?.league}
                analysisId={analysisId}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-6 text-center text-slate-600 text-sm">
        <p>SportAgent AI — Yapay Zeka Destekli Spor Analiz Platformu</p>
        <p className="text-xs mt-1">
          Bu platform bilgi amaçlıdır. Bahis tavsiyesi içermez.
        </p>
      </footer>
    </div>
  );
}
