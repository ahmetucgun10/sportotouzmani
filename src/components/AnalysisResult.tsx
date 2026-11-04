"use client";

import { useState } from "react";
import { AnalysisData } from "@/app/page";

interface AnalysisResultProps {
  result: AnalysisData;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  analysisId: number | null;
}

function TeamSection({
  teamName,
  analysis,
  isHome,
}: {
  teamName: string;
  analysis: AnalysisData["homeTeamAnalysis"];
  isHome: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "xg" | "form" | "injuries" | "tactics" | "star" | "transfers" | "news" | "social" | "comments"
  >("xg");

  const tabs = [
    { id: "xg" as const, label: "📈 xG & Metrik" },
    { id: "form" as const, label: "📊 Form" },
    { id: "injuries" as const, label: "🏥 Sağlık" },
    { id: "tactics" as const, label: "👔 Taktik" },
    { id: "star" as const, label: "⭐ Yıldız" },
    { id: "transfers" as const, label: "🔁 Derinlik" },
    { id: "news" as const, label: "📰 Haber" },
    { id: "social" as const, label: "📱 Psikoloji" },
    { id: "comments" as const, label: "💬 Uzman" },
  ];

  const content = {
    xg: analysis.xgStats || analysis.recentForm,
    form: analysis.recentForm,
    injuries: analysis.suspensions
      ? `${analysis.injuries}\n\nCEZALI OYUNCULAR:\n${analysis.suspensions}`
      : analysis.injuries,
    tactics: analysis.tactics,
    star: analysis.starPlayers,
    transfers: analysis.transfers,
    news: analysis.news,
    social: analysis.socialBuzz,
    comments: analysis.comments,
  };

  return (
    <div
      className={`bg-white/5 border rounded-2xl overflow-hidden ${
        isHome ? "border-indigo-500/30" : "border-purple-500/30"
      }`}
    >
      {/* Team Header */}
      <div
        className={`px-5 py-4 ${
          isHome
            ? "bg-gradient-to-r from-indigo-600/30 to-indigo-900/10"
            : "bg-gradient-to-r from-purple-600/30 to-purple-900/10"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{isHome ? "🏠" : "✈️"}</span>
          <div>
            <h3 className="text-white font-bold text-lg">{teamName}</h3>
            <p className="text-slate-400 text-xs">{isHome ? "Ev Sahibi" : "Deplasman"}</p>
          </div>
          {analysis.overallRating && (
            <div className="ml-auto text-right">
              <div className="text-slate-400 text-xs">Uzman Puanı</div>
              <div className={`font-bold text-sm ${isHome ? "text-indigo-400" : "text-purple-400"}`}>
                {analysis.overallRating}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? isHome
                  ? "text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10"
                  : "text-purple-400 border-b-2 border-purple-400 bg-purple-500/10"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
          {content[activeTab] || "Veri bulunamadı."}
        </div>
      </div>
    </div>
  );
}

function VerificationCommitteeSection({
  context,
}: {
  context?: AnalysisData["matchContext"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quantitative Poisson Model */}
        <div className="bg-fuchsia-950/20 border border-fuchsia-500/40 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-fuchsia-600/25 to-purple-900/20 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2 text-base">
              <span className="text-xl">📐</span> Kantitatif & Poisson Gol Modeli
            </h3>
            <p className="text-fuchsia-300/80 text-xs mt-0.5">
              Beklenen Gol (λ), 1-X-2 Olasılık Dağılımı & Matematiksel Değer (Value)
            </p>
          </div>
          <div className="p-5">
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {context?.quantModel || "Kantitatif model verisi bulunamadı."}
            </div>
          </div>
        </div>

        {/* Devil's Advocate */}
        <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-rose-600/25 to-red-900/20 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2 text-base">
              <span className="text-xl">⚖️</span> Şeytanın Avukatı & Tuzak Denetçisi
            </h3>
            <p className="text-rose-300/80 text-xs mt-0.5">
              Popüler Takım Yanlılığı Kırıcı, Çelişki Tespiti & Sürpriz Risk Analizi
            </p>
          </div>
          <div className="p-5">
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {context?.devilsAdvocate || "Risk denetimi raporu bulunamadı."}
            </div>
          </div>
        </div>
      </div>

      {/* High-impact Accuracy Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            emoji: "🏟️",
            title: "İç / Dış Saha Split Analizi",
            text: context?.homeAwaySplit,
          },
          {
            emoji: "⏱️",
            title: "Fikstür Yorgunluğu & Rotasyon",
            text: context?.fixtureFatigue,
          },
          {
            emoji: "🧩",
            title: "Muhtemel 11 & Duran Top Eşleşmesi",
            text: context?.lineupMatchup,
          },
        ]
          .filter((item) => item.text)
          .map((item) => (
            <div
              key={item.title}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                  <span>{item.emoji}</span> {item.title}
                </h4>
              </div>
              <div className="p-4">
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {item.text}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function MatchContextSection({
  context,
  h2h,
}: {
  context?: AnalysisData["matchContext"];
  h2h: string;
}) {
  const cards = [
    { emoji: "📉", title: "Keskin Oran & Piyasa Hareketleri", text: context?.odds },
    { emoji: "⚔️", title: "Tarihsel Karşılaşmalar (H2H)", text: context?.headToHead || h2h },
    { emoji: "🔥", title: "Motivasyon & Puan İhtiyacı", text: context?.motivation },
    { emoji: "🌦️", title: "Hava Durumu & Saha Zemini", text: context?.weather },
    { emoji: "🟨", title: "Hakem & Disiplin Eğilimi", text: context?.referee },
  ].filter((c) => c.text);

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-3 bg-white/5 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2 text-sm">
              <span className="text-lg">{card.emoji}</span> {card.title}
            </h3>
          </div>
          <div className="p-5">
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {card.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionSection({
  prediction,
  homeTeam,
  awayTeam,
}: {
  prediction: string;
  homeTeam: string;
  awayTeam: string;
}) {
  return (
    <div className="bg-white/5 border border-yellow-500/40 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 bg-gradient-to-r from-yellow-600/20 via-orange-600/15 to-red-600/10 border-b border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
              🎯
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">
                Ensemble Tahmin Komutanı Kararı
              </h3>
              <p className="text-slate-300 text-sm">
                {homeTeam} vs {awayTeam} — 18 Uzman Ajan + Poisson Modeli + Şeytanın Avukatı Kalibrasyonu
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
              📐 Poisson Kalibreli
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
              ⚖️ Tuzak Denetimli
            </span>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              📈 xG Destekli
            </span>
          </div>
        </div>
      </div>

      {/* Prediction Content */}
      <div className="p-5">
        <div className="space-y-3">
          {prediction
            .split(/\n(?=\*\*)/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block, i) => {
              const headingMatch = block.match(/^\*\*(.+?)\*\*/);
              if (headingMatch) {
                const heading = headingMatch[1];
                const body = block.replace(/^\*\*(.+?)\*\*\s*/, "").trim();
                return (
                  <div key={i} className="rounded-xl bg-black/25 border border-white/10 p-4">
                    <div className="text-yellow-400 font-bold text-sm mb-1.5 uppercase tracking-wide">
                      {heading}
                    </div>
                    <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {body || "—"}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {block}
                </div>
              );
            })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-3 bg-black/20 border-t border-white/5">
        <p className="text-slate-500 text-xs text-center">
          ⚠️ İstatistiksel olasılık ve yapay zeka analizidir; kesin kazanç vaat etmez ve bahis tavsiyesi değildir.
        </p>
      </div>
    </div>
  );
}

export default function AnalysisResult({
  result,
  homeTeam,
  awayTeam,
  league,
  analysisId,
}: AnalysisResultProps) {
  const [view, setView] = useState<"prediction" | "committee" | "teams" | "context">("prediction");

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="bg-green-950/30 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600/30 flex items-center justify-center text-xl">
          ✅
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold">
            3 Katmanlı Ensemble Analizi Tamamlandı!
          </div>
          <div className="text-slate-400 text-sm">
            {homeTeam} vs {awayTeam} — {league || "Maç Analizi"}
            {analysisId && (
              <span className="text-slate-600 ml-2"># {analysisId}</span>
            )}
          </div>
        </div>
        <div className="text-green-400 text-2xl">🏆</div>
      </div>

      {/* View Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => setView("prediction")}
          className={`py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
            view === "prediction"
              ? "bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          🎯 Kalibre Tahmin
        </button>
        <button
          onClick={() => setView("committee")}
          className={`py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
            view === "committee"
              ? "bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white shadow-lg"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          📐 Doğruluk Komitesi
        </button>
        <button
          onClick={() => setView("teams")}
          className={`py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
            view === "teams"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          👥 Takım & xG Analizi
        </button>
        <button
          onClick={() => setView("context")}
          className={`py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
            view === "context"
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          🌍 Piyasa & Saha
        </button>
      </div>

      {/* Views */}
      {view === "prediction" && (
        <PredictionSection
          prediction={result.finalPrediction}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      )}

      {view === "committee" && (
        <VerificationCommitteeSection context={result.matchContext} />
      )}

      {view === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamSection
            teamName={homeTeam}
            analysis={result.homeTeamAnalysis}
            isHome={true}
          />
          <TeamSection
            teamName={awayTeam}
            analysis={result.awayTeamAnalysis}
            isHome={false}
          />
        </div>
      )}

      {view === "context" && (
        <MatchContextSection context={result.matchContext} h2h={result.headToHead} />
      )}
    </div>
  );
}
