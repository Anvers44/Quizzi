import { useState } from "react";
import { apiPost } from "../lib/api";
import { saveSession } from "../lib/session";
import { THEME_LABELS } from "../types";
import type { GameMode, GameConfig } from "../types";

interface Props {
  onRoomCreated: (roomCode: string, config: GameConfig) => void;
}

const THEMES = Object.entries(THEME_LABELS);

const MODE_INFO: Record<
  GameMode,
  { label: string; emoji: string; desc: string }
> = {
  classic: {
    emoji: "🎮",
    label: "Classique",
    desc: "Plusieurs manches, gagnant individuel",
  },
  teams: {
    emoji: "🤝",
    label: "Équipes",
    desc: "Rouge vs Bleu — points cumulés par équipe",
  },
  tournament: {
    emoji: "🏆",
    label: "Tournoi",
    desc: "Un joueur éliminé à chaque manche",
  },
};

export default function HostPage({ onRoomCreated }: Props) {
  const [theme, setTheme] = useState("all");
  const [mode, setMode] = useState<GameMode>("classic");
  const [rounds, setRounds] = useState(3);
  const [qpr, setQpr] = useState(5); // questions per round
  const [powers, setPowers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const config: GameConfig = {
        mode,
        theme,
        rounds: mode === "tournament" ? 10 : rounds, // tournament: up to 10 rounds
        questionsPerRound: qpr,
        powersEnabled: powers,
      };
      const { roomCode } = await apiPost<{
        roomCode: string;
        config: GameConfig;
      }>("/api/rooms", config);
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

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center p-5 gap-6 overflow-y-auto">
      <h1 className="text-3xl font-extrabold text-white mt-2">
        Créer une partie 🎯
      </h1>

      {/* ── Thème ── */}
      <section className="w-full max-w-2xl">
        <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Thème des questions
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {THEMES.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl text-sm font-semibold transition ${
                theme === key
                  ? "bg-yellow-400 text-indigo-900 scale-105"
                  : "bg-indigo-700 text-white hover:bg-indigo-600"
              }`}
            >
              <span className="text-2xl">{label.split(" ")[0]}</span>
              <span className="text-xs text-center leading-tight">
                {label.split(" ").slice(1).join(" ")}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Mode de jeu ── */}
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
              <span className="text-xs opacity-70 leading-tight">
                {info.desc}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Config manches / questions ── */}
      <section className="w-full max-w-2xl">
        <h2 className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Configuration
        </h2>
        <div className="bg-indigo-800 rounded-2xl p-4 flex flex-col gap-4">
          {/* Questions par manche */}
          <div className="flex flex-col gap-2">
            <label className="text-indigo-300 text-sm font-semibold">
              Questions par manche
            </label>
            <div className="flex gap-2">
              {[5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setQpr(n)}
                  className={`flex-1 py-2 rounded-xl font-bold transition ${
                    qpr === n
                      ? "bg-yellow-400 text-indigo-900"
                      : "bg-indigo-700 text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre de manches (sauf tournoi) */}
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
                    className={`flex-1 py-2 rounded-xl font-bold transition ${
                      rounds === n
                        ? "bg-yellow-400 text-indigo-900"
                        : "bg-indigo-700 text-white"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "tournament" && (
            <div className="bg-indigo-700/50 rounded-xl px-3 py-2 text-indigo-300 text-sm">
              🏆 Tournoi : 1 joueur éliminé après chaque manche de {qpr}{" "}
              questions, jusqu'au dernier survivant
            </div>
          )}

          {/* Pouvoirs */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">⚡ Pouvoirs</p>
              <p className="text-indigo-400 text-xs">
                Attaque et défense entre joueurs
              </p>
            </div>
            <button
              onClick={() => setPowers(!powers)}
              className={`w-14 h-7 rounded-full transition-all relative ${
                powers ? "bg-yellow-400" : "bg-indigo-600"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                  powers ? "left-7" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {powers && (
            <div className="grid grid-cols-2 gap-1 text-xs">
              {[
                ["💥 Aveugle", "Cache un choix 8s"],
                ["❄️ Gèle", "Bloque 4s"],
                ["🔄 Retourne", "Écran inversé 5s"],
                ["🔀 Mélange", "Choix mélangés"],
                ["🛡️ Bouclier", "Bloque l'attaque"],
                ["✨ Double", "Pts × 2 next"],
                ["🪞 Miroir", "Renvoie l'attaque"],
                ["👻 Fantôme", "Inciblable"],
              ].map(([name, desc]) => (
                <div
                  key={name}
                  className="bg-indigo-700/50 rounded-lg px-2 py-1"
                >
                  <span className="text-white font-semibold">{name}</span>
                  <p className="text-indigo-400">{desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Résumé */}
      <div className="w-full max-w-2xl bg-indigo-800/60 border border-indigo-600 rounded-2xl px-5 py-3 text-sm text-indigo-300">
        <span className="text-white font-bold">Résumé : </span>
        {THEME_LABELS[theme]} · {MODE_INFO[mode].label}
        {mode !== "tournament"
          ? ` · ${rounds} manche${rounds > 1 ? "s" : ""} de ${qpr} questions`
          : ` · ${qpr} questions/manche`}
        {mode !== "tournament" ? ` (${rounds * qpr} questions au total)` : ""}
        {powers ? " · Pouvoirs activés ⚡" : ""}
      </div>

      {error && (
        <p className="text-red-400 bg-red-900/30 px-4 py-2 rounded-lg text-sm">
          {error}
        </p>
      )}

      <button
        onClick={createRoom}
        disabled={loading}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg transition mb-6"
      >
        {loading ? "Création…" : "🚀 Créer la partie"}
      </button>
    </div>
  );
}
