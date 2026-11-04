"use client";

import { useState, useEffect, useRef } from "react";
import { AgentLog } from "@/lib/agents";

interface AgentDashboardProps {
  logs: AgentLog[];
  isRunning: boolean;
  homeTeam: string;
  awayTeam: string;
}

const AGENT_COLORS: Record<string, string> = {
  "Orkestrasyon Ajanı": "from-blue-600 to-cyan-600",
  "Sakatlık & Ceza Ajanı": "from-red-600 to-orange-600",
  "Form Analiz Ajanı": "from-green-600 to-emerald-600",
  "xG & İleri İstatistik Ajanı": "from-cyan-500 to-blue-600",
  "Güncel Haberler Ajanı": "from-yellow-600 to-amber-600",
  "Uzman Yorum Ajanı": "from-purple-600 to-pink-600",
  "Teknik Direktör & Taktik Ajanı": "from-slate-500 to-slate-400",
  "Yıldız Oyuncu Ajanı": "from-yellow-500 to-amber-400",
  "Transfer & Kadro Derinliği Ajanı": "from-teal-600 to-cyan-600",
  "Sosyal Medya & Baskı Ajanı": "from-pink-600 to-rose-600",
  "İç / Dış Saha Split Uzmanı": "from-violet-600 to-indigo-600",
  "Fikstür Yorgunluğu & Rotasyon Ajanı": "from-orange-500 to-red-500",
  "Muhtemel 11 & Duran Top Ajanı": "from-lime-600 to-emerald-600",
  "Tarihsel H2H Ajanı": "from-indigo-600 to-blue-600",
  "Keskin Oran & Piyasa Hareketleri Ajanı": "from-emerald-600 to-green-600",
  "Hava Durumu & Saha Zemin Ajanı": "from-sky-600 to-blue-500",
  "Motivasyon & Hedef Ajanı": "from-red-500 to-orange-500",
  "Hakem & Disiplin Ajanı": "from-yellow-500 to-yellow-400",
  "Kantitatif & Poisson Model Ajanı": "from-fuchsia-600 to-purple-600",
  "Şeytanın Avukatı & Tuzak Denetçisi": "from-rose-600 to-red-700",
  "Tahmin Komutanı": "from-amber-500 to-orange-500",
};

const AGENT_BG: Record<string, string> = {
  "Orkestrasyon Ajanı": "bg-blue-950/40 border-blue-500/30",
  "Sakatlık & Ceza Ajanı": "bg-red-950/40 border-red-500/30",
  "Form Analiz Ajanı": "bg-green-950/40 border-green-500/30",
  "xG & İleri İstatistik Ajanı": "bg-cyan-950/40 border-cyan-500/30",
  "Güncel Haberler Ajanı": "bg-yellow-950/40 border-yellow-500/30",
  "Uzman Yorum Ajanı": "bg-purple-950/40 border-purple-500/30",
  "Teknik Direktör & Taktik Ajanı": "bg-slate-900/40 border-slate-500/30",
  "Yıldız Oyuncu Ajanı": "bg-yellow-950/40 border-yellow-500/30",
  "Transfer & Kadro Derinliği Ajanı": "bg-teal-950/40 border-teal-500/30",
  "Sosyal Medya & Baskı Ajanı": "bg-pink-950/40 border-pink-500/30",
  "İç / Dış Saha Split Uzmanı": "bg-violet-950/40 border-violet-500/30",
  "Fikstür Yorgunluğu & Rotasyon Ajanı": "bg-orange-950/40 border-orange-500/30",
  "Muhtemel 11 & Duran Top Ajanı": "bg-emerald-950/40 border-emerald-500/30",
  "Tarihsel H2H Ajanı": "bg-indigo-950/40 border-indigo-500/30",
  "Keskin Oran & Piyasa Hareketleri Ajanı": "bg-emerald-950/40 border-emerald-500/30",
  "Hava Durumu & Saha Zemin Ajanı": "bg-sky-950/40 border-sky-500/30",
  "Motivasyon & Hedef Ajanı": "bg-red-950/40 border-red-500/30",
  "Hakem & Disiplin Ajanı": "bg-yellow-950/40 border-yellow-500/30",
  "Kantitatif & Poisson Model Ajanı": "bg-fuchsia-950/50 border-fuchsia-500/40",
  "Şeytanın Avukatı & Tuzak Denetçisi": "bg-rose-950/50 border-rose-500/40",
  "Tahmin Komutanı": "bg-amber-950/40 border-amber-500/30",
};

function AgentCard({ log, index }: { log: AgentLog; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const bgClass = AGENT_BG[log.agentName] || "bg-slate-900/40 border-slate-500/30";
  const gradClass = AGENT_COLORS[log.agentName] || "from-slate-600 to-slate-500";

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-300 ${bgClass}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Agent Badge */}
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradClass} flex items-center justify-center text-xl flex-shrink-0 shadow-lg`}
        >
          {log.agentEmoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{log.agentName}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                log.status === "done"
                  ? "bg-green-500/20 text-green-400"
                  : log.status === "error"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-blue-500/20 text-blue-400 animate-pulse"
              }`}
            >
              {log.status === "done" ? "✓ Tamamlandı" : log.status === "error" ? "✗ Hata" : "⟳ Çalışıyor"}
            </span>
            <span className="text-slate-600 text-xs ml-auto">
              {new Date(log.timestamp).toLocaleTimeString("tr-TR")}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1 truncate">{log.step}</p>
        </div>

        <span className="text-slate-600 text-xs flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && log.content && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
          {/* Content */}
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-slate-500 text-xs font-medium mb-2 uppercase tracking-wide">
              📋 Ajan Raporu
            </div>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {log.content}
            </div>
          </div>

          {/* Sources */}
          {log.sources && log.sources.length > 0 && (
            <div>
              <div className="text-slate-500 text-xs font-medium mb-2 uppercase tracking-wide">
                🔗 Kaynaklar ({log.sources.length})
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {log.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <span className="text-indigo-400 text-xs mt-0.5 flex-shrink-0">↗</span>
                    <div className="min-w-0">
                      <div className="text-white text-xs font-medium truncate group-hover:text-indigo-300 transition-colors">
                        {source.title}
                      </div>
                      <div className="text-slate-600 text-xs truncate">{source.url}</div>
                      {source.publishedDate && (
                        <div className="text-slate-600 text-xs">
                          📅 {source.publishedDate}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentDashboard({
  logs,
  isRunning,
  homeTeam,
  awayTeam,
}: AgentDashboardProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && isRunning) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [logs, autoScroll, isRunning]);

  const completedAgents = logs.filter((l) => l.status === "done").length;
  const totalSteps = logs.length;
  const progressPct = totalSteps > 0 ? Math.round((completedAgents / totalSteps) * 100) : 0;

  // Get unique active agents
  const activeAgents = Array.from(new Set(logs.map((l) => l.agentName)));

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isRunning ? "bg-blue-500 animate-pulse" : "bg-green-500"
              }`}
            />
            <h3 className="text-white font-bold">
              {isRunning ? "Ajan Ordusu Çalışıyor..." : "Analiz Tamamlandı"}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-lg">{progressPct}%</div>
            <div className="text-slate-500 text-xs">
              {completedAgents}/{totalSteps} adım
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Match Info */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-white font-semibold">{homeTeam}</span>
          <span className="text-indigo-400 font-bold">⚔</span>
          <span className="text-white font-semibold">{awayTeam}</span>
        </div>

        {/* Active Agents */}
        {activeAgents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {activeAgents.map((agentName) => {
              const lastLog = [...logs].reverse().find((l) => l.agentName === agentName);
              const isActive = lastLog?.status === "running";
              return (
                <span
                  key={agentName}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isActive
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse"
                      : "bg-green-500/10 border-green-500/20 text-green-400"
                  }`}
                >
                  {lastLog?.agentEmoji} {agentName}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-bold flex items-center gap-2">
            <span>🔍</span> Ajan Aktiviteleri
          </h3>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
              autoScroll
                ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400"
                : "bg-white/5 border-white/10 text-slate-500"
            }`}
          >
            {autoScroll ? "↓ Otomatik Kaydırma Açık" : "↓ Otomatik Kaydırma Kapalı"}
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <div className="text-4xl mb-3">🤖</div>
              <p>Ajanlar başlatılıyor...</p>
            </div>
          ) : (
            logs.map((log, idx) => <AgentCard key={idx} log={log} index={idx} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
