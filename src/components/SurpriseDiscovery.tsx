"use client";

import { useState } from "react";
import AgentDashboard from "@/components/AgentDashboard";
import type { AgentLog } from "@/lib/agents";
import type { DiscoveryResult, DiscoveryWindow } from "@/lib/surpriseDiscovery";

const LEAGUES = [
  "Tümü",
  "Türkiye Süper Lig",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "UEFA Şampiyonlar Ligi",
  "UEFA Avrupa Ligi",
];

const WINDOWS: { id: DiscoveryWindow; label: string }[] = [
  { id: "today", label: "Bugün" },
  { id: "tomorrow", label: "Yarın" },
  { id: "next3", label: "Önümüzdeki 3 gün" },
  { id: "weekend", label: "Bu hafta sonu" },
];

export default function SurpriseDiscovery({
  onAnalyze,
  disabled,
}: {
  onAnalyze: (homeTeam: string, awayTeam: string, league: string, matchDate: string) => void;
  disabled?: boolean;
}) {
  const [league, setLeague] = useState("Tümü");
  const [windowId, setWindowId] = useState<DiscoveryWindow>("next3");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const start = async () => {
    setRunning(true);
    setLogs([]);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/discover-surprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league, window: windowId }),
      });
      const reader = res.body?.getReader();
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
          if (!line.startsWith("data: ")) continue;
          let data;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (data.type === "log") setLogs((p) => [...p, data.log]);
          else if (data.type === "complete") setResult(data.result);
          else if (data.type === "error") throw new Error(data.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setRunning(false);
    }
  };

  const candidates = result?.candidates || [];
  const surprises = candidates.filter((c) => c.isSurpriseCandidate);
  const visible = showAll ? candidates : surprises;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-orange-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">⚡</span>
          <h2 className="text-white font-bold text-xl">Sürpriz Maç Keşfi</h2>
        </div>
        <p className="text-slate-400 text-sm mb-5">
          🗓️ Fikstür Tarayıcı, 📣 Sürpriz Radar ve 🔍 Sürpriz Puanlama ajanları yaklaşan maçları tarar;
          sürpriz çıkabilecek maçları senin için bulur.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-slate-400 text-sm font-medium block mb-2">🏆 Lig</label>
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
            >
              {LEAGUES.map((l) => (
                <option key={l} value={l}>
                  {l === "Tümü" ? "Tümü (6 büyük lig)" : l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-sm font-medium block mb-2">📅 Zaman</label>
            <select
              value={windowId}
              onChange={(e) => setWindowId(e.target.value as DiscoveryWindow)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
            >
              {WINDOWS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={start}
            disabled={running}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-600 to-pink-600 disabled:opacity-50"
          >
            {running ? "⟳ Taranıyor..." : "🔎 Sürprizleri Bul"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {(running || logs.length > 0) && (
        <AgentDashboard logs={logs} isRunning={running} homeTeam="Sürpriz" awayTeam="Keşfi" />
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-white font-semibold">
              {surprises.length > 0
                ? `⚡ ${surprises.length} sürpriz adayı maç (${candidates.length} maç tarandı)`
                : `✅ ${candidates.length} maç tarandı — güçlü sürpriz sinyali yok`}
            </div>
            {candidates.length > surprises.length && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
              >
                {showAll ? "Sadece sürpriz adayları" : "Tüm taranan maçları göster"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visible.map((c) => (
              <div
                key={`${c.homeTeam}-${c.awayTeam}`}
                className={`rounded-2xl p-5 border ${
                  c.isSurpriseCandidate
                    ? "bg-orange-950/25 border-orange-500/40"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-bold">
                      {c.homeTeam} <span className="text-slate-500">vs</span> {c.awayTeam}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {c.league}
                      {c.date ? ` • ${c.date}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Sürpriz Puanı</div>
                    <div
                      className={`font-bold text-lg ${
                        c.surpriseScore >= 65
                          ? "text-pink-400"
                          : c.surpriseScore >= 45
                          ? "text-orange-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {c.surpriseScore}/100
                    </div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-orange-500 to-pink-500"
                    style={{ width: `${c.surpriseScore}%` }}
                  />
                </div>
                <div className="mt-3 text-sm space-y-1">
                  <div className="text-slate-300">
                    🏆 Beklenen: <span className="text-white">{c.expectedResult}</span>
                  </div>
                  {c.isSurpriseCandidate ? (
                    <div className="text-orange-300 font-semibold">
                      ⚡ Sürpriz sonucum: {c.surpriseResult}
                      {c.surpriseScoreline ? ` (${c.surpriseScoreline})` : ""}
                    </div>
                  ) : (
                    <div className="text-emerald-300">✅ Sürpriz beklentisi yok — net maç</div>
                  )}
                </div>
                {c.reasons.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {c.reasons.map((r, i) => (
                      <li key={i} className="text-slate-400 text-xs">
                        • {r}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  disabled={disabled}
                  onClick={() => onAnalyze(c.homeTeam, c.awayTeam, c.league, c.date)}
                  className="mt-4 w-full py-2 rounded-xl text-sm font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white disabled:opacity-50"
                >
                  🎯 Bu maçı tam ajan analizinden geçir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
