"use client";

import { useState, useEffect } from "react";

interface AnalysisRecord {
  id: number;
  homeTeam: string;
  awayTeam: string;
  league: string | null;
  matchDate: string | null;
  status: string;
  finalPrediction: string | null;
  createdAt: string;
  agentLogs: unknown[];
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: { bg: "bg-green-500/20 text-green-400 border-green-500/30", label: "✓ Tamamlandı" },
    running: { bg: "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse", label: "⟳ Çalışıyor" },
    error: { bg: "bg-red-500/20 text-red-400 border-red-500/30", label: "✗ Hata" },
    pending: { bg: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: "○ Bekliyor" },
  };
  const c = config[status as keyof typeof config] || config.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default function HistoryPanel() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [noDatabase, setNoDatabase] = useState(false);

  const fetchAnalyses = async () => {
    try {
      const res = await fetch("/api/analyze");
      const data = await res.json();
      setNoDatabase(!!data.noDatabase);
      setAnalyses((data.analyses || []).reverse());
    } catch {
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const handleView = async (id: number) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedAnalysis(null);
      return;
    }
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/analyses/${id}`);
      const data = await res.json();
      setSelectedAnalysis(data.analysis);
    } catch {
      setSelectedAnalysis(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu analizi silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedAnalysis(null);
      }
    } catch {
      alert("Silme işlemi başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p className="text-slate-400">Analizler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-2xl">📋 Geçmiş Analizler</h2>
        <button
          onClick={fetchAnalyses}
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          🔄 Yenile
        </button>
      </div>

      {noDatabase ? (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🗄️</div>
          <h3 className="text-white font-bold text-xl mb-2">Veritabanı Bağlı Değil</h3>
          <p className="text-slate-400 max-w-lg mx-auto">
            Bu ortamda kalıcı veritabanı yapılandırılmamış. Analizler yine de tam olarak çalışıyor,
            ancak kaydedilmiyor. Geçmişi saklamak için ortam değişkeni olarak{" "}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 text-xs">
              DATABASE_URL
            </code>{" "}
            (örn. Neon veya Supabase) ekleyin.
          </p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-white font-bold text-xl mb-2">Henüz Analiz Yok</h3>
          <p className="text-slate-400">İlk maç analizinizi yapmak için "Maç Analizi" sekmesine gidin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <div key={analysis.id} className="space-y-0">
              <div className="bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Match Info */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    #{analysis.id}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-semibold">{analysis.homeTeam}</span>
                      <span className="text-indigo-400 font-bold text-xs">VS</span>
                      <span className="text-white font-semibold">{analysis.awayTeam}</span>
                      <StatusBadge status={analysis.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {analysis.league && <span>🏆 {analysis.league}</span>}
                      {analysis.matchDate && <span>📅 {analysis.matchDate}</span>}
                      <span>
                        🕐{" "}
                        {new Date(analysis.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleView(analysis.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedId === analysis.id
                          ? "bg-indigo-600 text-white"
                          : "bg-white/10 text-slate-300 hover:bg-white/20"
                      }`}
                    >
                      {selectedId === analysis.id ? "▲ Gizle" : "▼ Görüntüle"}
                    </button>
                    <button
                      onClick={() => handleDelete(analysis.id)}
                      disabled={deletingId === analysis.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/30 text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50"
                    >
                      {deletingId === analysis.id ? "..." : "🗑️"}
                    </button>
                  </div>
                </div>

                {/* Expanded View */}
                {selectedId === analysis.id && (
                  <div className="border-t border-white/10 p-4 space-y-4">
                    {loadingDetail ? (
                      <div className="text-center py-4 text-slate-400">
                        <span className="animate-spin inline-block mr-2">⚙️</span>
                        Yükleniyor...
                      </div>
                    ) : selectedAnalysis ? (
                      <>
                        {/* Final Prediction */}
                        {selectedAnalysis.finalPrediction && (
                          <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-xl p-4">
                            <div className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2">
                              <span>🎯</span> Tahmin Komutanı Kararı
                            </div>
                            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                              {selectedAnalysis.finalPrediction}
                            </div>
                          </div>
                        )}

                        {/* Agent Logs Summary */}
                        {Array.isArray(selectedAnalysis.agentLogs) &&
                          selectedAnalysis.agentLogs.length > 0 && (
                            <div>
                              <div className="text-slate-400 text-xs font-medium mb-2">
                                🤖 Ajan Kayıtları ({selectedAnalysis.agentLogs.length} adım)
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(selectedAnalysis.agentLogs as Array<{
                                  agentEmoji: string;
                                  agentName: string;
                                  step: string;
                                  status: string;
                                  timestamp: string;
                                }>).map((log, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2"
                                  >
                                    <span>{log.agentEmoji}</span>
                                    <span className="font-medium text-slate-300">
                                      {log.agentName}
                                    </span>
                                    <span className="text-slate-600">—</span>
                                    <span className="truncate">{log.step}</span>
                                    <span
                                      className={`ml-auto flex-shrink-0 ${
                                        log.status === "done" ? "text-green-400" : "text-blue-400"
                                      }`}
                                    >
                                      {log.status === "done" ? "✓" : "⟳"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm text-center">Detay yüklenemedi.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
