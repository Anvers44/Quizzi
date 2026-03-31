import { useState, useEffect } from "react";
import { apiGet } from "../lib/api";
import { loadAuth } from "../lib/auth";
import { THEME_LABELS } from "../types";

interface Props {
  onBack: () => void;
}

type GameMode = "all" | "classic" | "teams" | "tournament";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  games_played: number;
  wins: number;
  best_score: number;
  avg_score: number;
  total_score: number;
}

interface UserStats {
  general: {
    games_played: number;
    wins: number;
    best_score: number;
    avg_score: number;
    total_score: number;
  } | null;
  byMode: Array<{
    mode: string;
    games: number;
    wins: number;
    best: number;
    avg: number;
  }>;
  byTheme: Array<{
    theme: string;
    attempts: number;
    correct_count: number;
    accuracy_pct: number;
    avg_time: number;
    avg_time_correct: number;
    avg_pts: number;
  }>;
  bestTheme: { theme: string; accuracy_pct: number; avg_time: number } | null;
  worstTheme: { theme: string; accuracy_pct: number } | null;
  timing: {
    avg_time_all: number;
    avg_time_correct: number;
    avg_time_wrong: number;
  } | null;
  totals: { total_answers: number; total_correct: number } | null;
}

const MODE_LABELS: Record<string, string> = {
  all: "🌍 Tous",
  classic: "🎮 Classique",
  teams: "🤝 Équipes",
  tournament: "🏆 Tournoi",
};
const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage({ onBack }: Props) {
  const [mode, setMode] = useState<GameMode>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<UserStats | null>(null);
  const [tab, setTab] = useState<"board" | "stats">("board");
  const [loading, setLoading] = useState(false);
  const auth = loadAuth();

  useEffect(() => {
    setLoading(true);
    apiGet<{ entries: LeaderboardEntry[] }>(`/api/leaderboard?mode=${mode}`)
      .then((d) => setEntries(d.leaderboard ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => {
    if (!auth?.userId || tab !== "stats") return;
    apiGet<UserStats>(`/api/leaderboard/stats/${auth.userId}`)
      .then(setMyStats)
      .catch(() => {});
  }, [tab, auth?.userId]);

  const myRank =
    auth && entries?.length
      ? entries.findIndex((e) => e.user_id === auth.userId) + 1
      : 0;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-white font-semibold text-sm"
        >
          ← Retour
        </button>
        <h1 className="text-xl font-extrabold text-white">🏆 Classement</h1>
        <div className="w-16" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-2">
        {(
          [
            ["board", "📊 Classement"],
            ["stats", "📈 Mes stats"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={t === "stats" && !auth}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${
              tab === t
                ? "bg-yellow-400 text-indigo-900"
                : "bg-indigo-800 text-indigo-300 disabled:opacity-40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!auth && tab === "stats" && (
        <p className="text-center text-indigo-400 text-sm px-4 py-2">
          Connecte-toi pour voir tes stats détaillées
        </p>
      )}

      {/* ── Leaderboard tab ── */}
      {tab === "board" && (
        <>
          {/* Mode filter */}
          <div className="flex gap-1 px-4 mb-2 overflow-x-auto">
            {(Object.entries(MODE_LABELS) as [GameMode, string][]).map(
              ([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    mode === m
                      ? "bg-yellow-400 text-indigo-900"
                      : "bg-indigo-800 text-white"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {myRank > 0 && (
            <div className="mx-4 mb-2 bg-yellow-400/20 border border-yellow-400 rounded-xl px-4 py-2 text-sm text-yellow-300 font-semibold text-center">
              Ta position : #{myRank}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <p className="text-indigo-400 text-center py-8 animate-pulse">
                Chargement…
              </p>
            ) : entries.length === 0 ? (
              <p className="text-indigo-500 text-center py-8">
                Aucune donnée pour ce mode
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {entries.map((e, i) => (
                  <div
                    key={e.user_id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                      e.user_id === auth?.userId
                        ? "bg-yellow-400/20 border border-yellow-400"
                        : "bg-indigo-800"
                    }`}
                  >
                    <span className="text-2xl w-8 text-center">
                      {MEDALS[i] ?? (
                        <span className="text-indigo-400 font-bold text-sm">
                          #{i + 1}
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">
                        {e.username}
                      </p>
                      <p className="text-indigo-400 text-xs">
                        {e.games_played} partie{e.games_played !== 1 ? "s" : ""}{" "}
                        · {e.wins} 🏆 · moy. {e.avg_score?.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-yellow-400 font-extrabold text-lg">
                      {e.total_score?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── My stats tab ── */}
      {tab === "stats" && auth && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
          {!myStats ? (
            <p className="text-indigo-400 text-center py-8 animate-pulse">
              Chargement…
            </p>
          ) : (
            <>
              {/* General */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Parties",
                    value: myStats.general?.games_played ?? 0,
                    color: "text-white",
                    emoji: "🎮",
                  },
                  {
                    label: "Victoires",
                    value: myStats.general?.wins ?? 0,
                    color: "text-yellow-400",
                    emoji: "🏆",
                  },
                  {
                    label: "Score max",
                    value: (myStats.general?.best_score ?? 0).toLocaleString(),
                    color: "text-green-400",
                    emoji: "⭐",
                  },
                  {
                    label: "Moy/partie",
                    value: (myStats.general?.avg_score ?? 0).toLocaleString(),
                    color: "text-blue-300",
                    emoji: "📊",
                  },
                ].map(({ label, value, color, emoji }) => (
                  <div
                    key={label}
                    className="bg-indigo-800 rounded-2xl p-3 flex flex-col gap-1"
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className={`${color} font-extrabold text-xl`}>
                      {value}
                    </span>
                    <span className="text-indigo-400 text-xs">{label}</span>
                  </div>
                ))}
              </div>

              {/* Timing */}
              {myStats.timing && (
                <div className="bg-indigo-800 rounded-2xl p-4">
                  <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold mb-3">
                    ⏱ Temps de réponse moyen
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-white font-bold">
                        {myStats.timing.avg_time_all}s
                      </p>
                      <p className="text-indigo-400 text-xs">Global</p>
                    </div>
                    <div>
                      <p className="text-green-300 font-bold">
                        {myStats.timing.avg_time_correct}s
                      </p>
                      <p className="text-indigo-400 text-xs">Si correct</p>
                    </div>
                    <div>
                      <p className="text-red-300 font-bold">
                        {myStats.timing.avg_time_wrong}s
                      </p>
                      <p className="text-indigo-400 text-xs">Si faux</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Best / worst theme */}
              {(myStats.bestTheme || myStats.worstTheme) && (
                <div className="grid grid-cols-2 gap-2">
                  {myStats.bestTheme && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3">
                      <p className="text-green-300 text-xs font-semibold mb-1">
                        🌟 Meilleur thème
                      </p>
                      <p className="text-white font-bold text-sm">
                        {THEME_LABELS[myStats.bestTheme.theme] ??
                          myStats.bestTheme.theme}
                      </p>
                      <p className="text-green-400 text-lg font-extrabold">
                        {myStats.bestTheme.accuracy_pct}%
                      </p>
                      <p className="text-indigo-400 text-xs">
                        précision · {myStats.bestTheme.avg_time}s moy.
                      </p>
                    </div>
                  )}
                  {myStats.worstTheme && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
                      <p className="text-red-300 text-xs font-semibold mb-1">
                        😅 À améliorer
                      </p>
                      <p className="text-white font-bold text-sm">
                        {THEME_LABELS[myStats.worstTheme.theme] ??
                          myStats.worstTheme.theme}
                      </p>
                      <p className="text-red-400 text-lg font-extrabold">
                        {myStats.worstTheme.accuracy_pct}%
                      </p>
                      <p className="text-indigo-400 text-xs">précision</p>
                    </div>
                  )}
                </div>
              )}

              {/* Per-theme table */}
              {myStats.byTheme.length > 0 && (
                <div className="bg-indigo-800 rounded-2xl p-4">
                  <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold mb-3">
                    📚 Par thème
                  </p>
                  <div className="flex flex-col gap-2">
                    {myStats.byTheme.map((t) => (
                      <div key={t.theme} className="flex items-center gap-2">
                        <span className="text-sm w-24 text-white truncate">
                          {THEME_LABELS[t.theme] ?? t.theme}
                        </span>
                        <div className="flex-1 bg-indigo-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              t.accuracy_pct >= 70
                                ? "bg-green-400"
                                : t.accuracy_pct >= 40
                                  ? "bg-yellow-400"
                                  : "bg-red-400"
                            }`}
                            style={{ width: `${t.accuracy_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-indigo-300 w-10 text-right">
                          {t.accuracy_pct}%
                        </span>
                        <span className="text-xs text-indigo-500 w-8 text-right">
                          {t.avg_time}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-mode */}
              {myStats.byMode.length > 0 && (
                <div className="bg-indigo-800 rounded-2xl p-4">
                  <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold mb-3">
                    🎮 Par mode
                  </p>
                  {myStats.byMode.map((m) => (
                    <div
                      key={m.mode}
                      className="flex justify-between items-center py-1.5 border-b border-indigo-700 last:border-0"
                    >
                      <span className="text-white text-sm">
                        {MODE_LABELS[m.mode] ?? m.mode}
                      </span>
                      <span className="text-indigo-300 text-xs">
                        {m.games} parties · {m.wins} 🏆 · max{" "}
                        {m.best?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
