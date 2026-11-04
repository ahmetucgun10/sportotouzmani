"use client";

import { useState } from "react";

interface MatchFormProps {
  onSubmit: (
    homeTeam: string,
    awayTeam: string,
    league: string,
    matchDate: string
  ) => void;
  isLoading: boolean;
}

const POPULAR_LEAGUES = [
  "Türkiye Süper Lig",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "UEFA Şampiyonlar Ligi",
  "UEFA Avrupa Ligi",
  "Dünya Kupası",
];

const POPULAR_TEAMS: Record<string, string[]> = {
  "Türkiye Süper Lig": [
    "Galatasaray",
    "Fenerbahçe",
    "Beşiktaş",
    "Trabzonspor",
    "Başakşehir",
    "Sivasspor",
    "Kayserispor",
    "Konyaspor",
    "Alanyaspor",
    "Antalyaspor",
  ],
  "Premier League": [
    "Manchester City",
    "Arsenal",
    "Liverpool",
    "Chelsea",
    "Manchester United",
    "Tottenham",
    "Newcastle",
    "Aston Villa",
  ],
  "La Liga": [
    "Real Madrid",
    "Barcelona",
    "Atletico Madrid",
    "Sevilla",
    "Real Sociedad",
    "Villarreal",
    "Athletic Bilbao",
  ],
  Bundesliga: [
    "Bayern Munich",
    "Borussia Dortmund",
    "RB Leipzig",
    "Bayer Leverkusen",
    "Eintracht Frankfurt",
  ],
  "Serie A": ["Juventus", "Inter Milan", "AC Milan", "Napoli", "Roma", "Lazio", "Atalanta"],
};

export default function MatchForm({ onSubmit, isLoading }: MatchFormProps) {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [league, setLeague] = useState("Türkiye Süper Lig");
  const [matchDate, setMatchDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState<"home" | "away" | null>(null);

  const teamSuggestions = POPULAR_TEAMS[league] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeTeam && awayTeam) {
      onSubmit(homeTeam, awayTeam, league, matchDate);
    }
  };

  const swapTeams = () => {
    setHomeTeam(awayTeam);
    setAwayTeam(homeTeam);
  };

  const filteredHomeSuggestions = teamSuggestions.filter(
    (t) => t.toLowerCase().includes(homeTeam.toLowerCase()) && t !== homeTeam
  );
  const filteredAwaySuggestions = teamSuggestions.filter(
    (t) => t.toLowerCase().includes(awayTeam.toLowerCase()) && t !== awayTeam
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">⚽</span>
        <h2 className="text-white font-bold text-xl">Maç Analizi Başlat</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* League Selection */}
        <div>
          <label className="text-slate-400 text-sm font-medium block mb-2">🏆 Lig / Turnuva</label>
          <select
            value={league}
            onChange={(e) => {
              setLeague(e.target.value);
              setHomeTeam("");
              setAwayTeam("");
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {POPULAR_LEAGUES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
            <option value="Diğer">Diğer / Manuel Giriş</option>
          </select>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-start">
          {/* Home Team */}
          <div className="relative">
            <label className="text-slate-400 text-sm font-medium block mb-2">
              🏠 Ev Sahibi Takım
            </label>
            <input
              type="text"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              onFocus={() => setShowSuggestions("home")}
              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
              placeholder="Örn: Galatasaray"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
            {showSuggestions === "home" && filteredHomeSuggestions.length > 0 && homeTeam && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                {filteredHomeSuggestions.slice(0, 5).map((team) => (
                  <button
                    key={team}
                    type="button"
                    onMouseDown={() => setHomeTeam(team)}
                    className="w-full text-left px-4 py-2 text-white text-sm hover:bg-indigo-600/30 transition-colors"
                  >
                    {team}
                  </button>
                ))}
              </div>
            )}
            {showSuggestions === "home" && !homeTeam && teamSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                {teamSuggestions.slice(0, 6).map((team) => (
                  <button
                    key={team}
                    type="button"
                    onMouseDown={() => setHomeTeam(team)}
                    className="w-full text-left px-4 py-2 text-white text-sm hover:bg-indigo-600/30 transition-colors"
                  >
                    {team}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex items-end pb-[3px]">
            <button
              type="button"
              onClick={swapTeams}
              className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-indigo-600 text-white transition-all flex items-center justify-center text-lg mt-6"
              title="Takımları değiştir"
            >
              ⇄
            </button>
          </div>

          {/* Away Team */}
          <div className="relative">
            <label className="text-slate-400 text-sm font-medium block mb-2">
              ✈️ Deplasman Takımı
            </label>
            <input
              type="text"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              onFocus={() => setShowSuggestions("away")}
              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
              placeholder="Örn: Fenerbahçe"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
            {showSuggestions === "away" && filteredAwaySuggestions.length > 0 && awayTeam && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                {filteredAwaySuggestions.slice(0, 5).map((team) => (
                  <button
                    key={team}
                    type="button"
                    onMouseDown={() => setAwayTeam(team)}
                    className="w-full text-left px-4 py-2 text-white text-sm hover:bg-indigo-600/30 transition-colors"
                  >
                    {team}
                  </button>
                ))}
              </div>
            )}
            {showSuggestions === "away" && !awayTeam && teamSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                {teamSuggestions.slice(0, 6).map((team) => (
                  <button
                    key={team}
                    type="button"
                    onMouseDown={() => setAwayTeam(team)}
                    className="w-full text-left px-4 py-2 text-white text-sm hover:bg-indigo-600/30 transition-colors"
                  >
                    {team}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Match Date */}
        <div>
          <label className="text-slate-400 text-sm font-medium block mb-2">
            📅 Maç Tarihi (isteğe bağlı)
          </label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Preview */}
        {homeTeam && awayTeam && (
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-4">
            <div className="text-center">
              <div className="text-slate-400 text-xs mb-2">{league}</div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-white font-bold text-lg">{homeTeam}</span>
                <span className="text-indigo-400 font-bold text-xl">VS</span>
                <span className="text-white font-bold text-lg">{awayTeam}</span>
              </div>
              {matchDate && (
                <div className="text-slate-400 text-xs mt-1">
                  📅{" "}
                  {new Date(matchDate).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !homeTeam || !awayTeam}
          className="w-full py-4 rounded-xl font-bold text-white text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed
            bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 
            shadow-lg hover:shadow-indigo-500/30 active:scale-[0.99]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin">⚙️</span>
              Ajan Ordusu Analiz Ediyor...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🚀 Ajan Ordusunu Başlat
            </span>
          )}
        </button>

        {/* API Warning */}
        <p className="text-center text-slate-600 text-xs">
          💡 Gerçek analiz için{" "}
          <code className="bg-slate-800 px-1 rounded text-slate-400">OPENAI_API_KEY</code> ve{" "}
          <code className="bg-slate-800 px-1 rounded text-slate-400">TAVILY_API_KEY</code> gereklidir
        </p>
      </form>
    </div>
  );
}
