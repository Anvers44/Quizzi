import { useState } from "react";
import { apiPost } from "../lib/api";
import { saveSession } from "../lib/session";
import {
  THEME_LABELS,
  DIFFICULTY_LABELS,
  TEAM_META,
  ALL_TEAM_IDS,
} from "../types";
import type { GameMode, GameConfig, Difficulty } from "../types";

interface Props {
  onRoomCreated: (roomCode: string, config: GameConfig) => void;
  onBack: () => void;
}

const THEMES = Object.entries(THEME_LABELS);
const DIFFICULTIES: Array<Difficulty | "all"> = [
  "all",
  "easy",
  "medium",
  "hard",
];
const MODE_INFO: Record<
  GameMode,
  { emoji: string; label: string; desc: string }
> = {
  classic: {
    emoji: "🎮",
    label: "Classique",
    desc: "Gagnant individuel, plusieurs manches",
  },
  teams: {
    emoji: "🤝",
    label: "Équipes",
    desc: "Équipes de couleur — points cumulés",
  },
  tournament: { emoji: "🏆", label: "Tournoi", desc: "Un éliminé par manche" },
};

export default function HostPage({ onRoomCreated, onBack }: Props) {
  const [selectedThemes, setSelectedThemes] = useState<string[]>(["all"]);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [mode, setMode] = useState<GameMode>("classic");
  const [rounds, setRounds] = useState(3);
  const [qpr, setQpr] = useState(5);
  const [powers, setPowers] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleTheme(key: string) {
    if (key === "all") {
      setSelectedThemes(["all"]);
      return;
    }
    setSelectedThemes((prev) => {
      const w = prev.filter((t) => t !== "all");
      if (w.includes(key)) {
        const n = w.filter((t) => t !== key);
        return n.length === 0 ? ["all"] : n;
      }
      return [...w, key];
    });
  }

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const config: GameConfig = {
        mode,
        themes: selectedThemes,
        difficulty,
        rounds: mode === "tournament" ? 10 : rounds,
        questionsPerRound: qpr,
        powersEnabled: powers,
        teamCount: mode === "teams" ? teamCount : 2,
      };
      const { roomCode } = await apiPost<{ roomCode: string }>(
        "/api/rooms",
        config,
      );
      saveSession({
        roomCode,
        playerId: "host",
        sessionToken: "host",
        role: "host",
      });
      onRoomCreated(roomCode, config);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const teamIds = ALL_TEAM_IDS.slice(0, teamCount);

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center p-5 gap-5 overflow-y-auto">
      <div className="w-full max-w-2xl flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-white font-semibold text-sm transition"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-extrabold text-white">
          Créer une partie 🎯
        </h1>
        <div className="w-16" />
      </div>

      {/* Thèmes */}
      <section className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
            Thèmes
          </h2>
          <span className="text-indigo-400 text-xs">
            {selectedThemes.includes("all")
              ? "Tous"
              : `${selectedThemes.length} sélectionné${selectedThemes.length > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          <button
            onClick={() => toggleTheme("all")}
            className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl text-xs font-semibold transition col-span-2 sm:col-span-1 ${
              selectedThemes.includes("all")
                ? "bg-yellow-400 text-indigo-900"
                : "bg-indigo-700 text-white"
            }`}
          >
            <span className="text-2xl">🎲</span>
            <span>Tous</span>
          </button>
          {THEMES.map(([key, label]) => {
            const [emoji, ...words] = label.split(" ");
            const isSel =
              selectedThemes.includes(key) && !selectedThemes.includes("all");
            return (
              <button
                key={key}
                onClick={() => toggleTheme(key)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl text-xs font-semibold transition relative ${
                  isSel
                    ? "bg-yellow-400 text-indigo-900"
                    : "bg-indigo-700 text-white hover:bg-indigo-600"
                }`}
              >
                {isSel && (
                  <span className="absolute top-1 right-1 text-xs">✓</span>
                )}
                <span className="text-2xl">{emoji}</span>
                <span className="text-center leading-tight">
                  {words.join(" ")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Difficulté */}
      <section className="w-full max-w-2xl">
        <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Difficulté
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`py-3 rounded-2xl font-bold text-sm transition ${difficulty === d ? "bg-yellow-400 text-indigo-900" : "bg-indigo-700 text-white hover:bg-indigo-600"}`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </section>

      {/* Mode */}
      <section className="w-full max-w-2xl">
        <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Mode de jeu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            Object.entries(MODE_INFO) as [
              GameMode,
              (typeof MODE_INFO)[GameMode],
            ][]
          ).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex flex-col items-start gap-1 px-4 py-4 rounded-2xl transition text-left ${
                mode === key
                  ? "bg-yellow-400 text-indigo-900"
                  : "bg-indigo-700 text-white hover:bg-indigo-600"
              }`}
            >
              <span className="text-2xl">{info.emoji}</span>
              <span className="font-bold">{info.label}</span>
              <span className="text-xs opacity-70">{info.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Config */}
      <section className="w-full max-w-2xl">
        <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Configuration
        </h2>
        <div className="bg-indigo-800 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-indigo-300 text-sm font-semibold">
              Questions par manche
            </label>
            <div className="flex gap-2">
              {[5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setQpr(n)}
                  className={`flex-1 py-2 rounded-xl font-bold transition ${qpr === n ? "bg-yellow-400 text-indigo-900" : "bg-indigo-700 text-white"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {mode !== "tournament" && (
            <div className="flex flex-col gap-2">
              <label className="text-indigo-300 text-sm font-semibold">
                Nombre de manches
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRounds(n)}
                    className={`flex-1 py-2 rounded-xl font-bold transition ${rounds === n ? "bg-yellow-400 text-indigo-900" : "bg-indigo-700 text-white"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams count — only for teams mode */}
          {mode === "teams" && (
            <div className="flex flex-col gap-2">
              <label className="text-indigo-300 text-sm font-semibold">
                Nombre d'équipes (2 à 6)
              </label>
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTeamCount(n)}
                    className={`flex-1 min-w-10 py-2 rounded-xl font-bold transition ${teamCount === n ? "bg-yellow-400 text-indigo-900" : "bg-indigo-700 text-white"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {/* Preview teams */}
              <div className="flex flex-wrap gap-2 mt-1">
                {teamIds.map((id) => (
                  <span
                    key={id}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${TEAM_META[id].light} ${TEAM_META[id].text} border ${TEAM_META[id].border}`}
                  >
                    {TEAM_META[id].emoji} Équipe {TEAM_META[id].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mode === "tournament" && (
            <div className="bg-indigo-700/50 rounded-xl px-3 py-2 text-indigo-300 text-sm">
              🏆 1 joueur éliminé par manche jusqu'au dernier survivant
            </div>
          )}

          {/* Pouvoirs */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">⚡ Pouvoirs</p>
              <p className="text-indigo-400 text-xs">
                Utilisables entre les questions
              </p>
            </div>
            <button
              onClick={() => setPowers(!powers)}
              className={`w-14 h-7 rounded-full transition-all relative ${powers ? "bg-yellow-400" : "bg-indigo-600"}`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${powers ? "left-7" : "left-0.5"}`}
              />
            </button>
          </div>
        </div>
      </section>

      {error && (
        <p className="text-red-400 bg-red-900/30 px-4 py-2 rounded-lg text-sm">
          {error}
        </p>
      )}

      <button
        onClick={createRoom}
        disabled={loading}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg transition mb-6 active:scale-95"
      >
        {loading ? "Création…" : "🚀 Créer la partie"}
      </button>
    </div>
  );
}
