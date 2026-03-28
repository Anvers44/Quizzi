import { loadProfile } from "../lib/profile";
import { AVATAR_EMOJI } from "../types";

interface Props {
  onHost: () => void;
  onJoin: () => void;
  onStats: () => void;
}

export default function HomePage({ onHost, onJoin, onStats }: Props) {
  const profile = loadProfile();

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6">
      {/* Logo / titre */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-6xl">🧠</div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Quiz Battle
        </h1>
        <p className="text-indigo-300 text-sm">Multijoueur · Temps réel</p>
      </div>

      {/* Profil mini si dispo */}
      {profile && (
        <div className="flex items-center gap-3 bg-indigo-800/60 border border-indigo-600 rounded-2xl px-4 py-3">
          <span className="text-3xl">{AVATAR_EMOJI[profile.avatar]}</span>
          <div>
            <p className="text-white font-bold">{profile.pseudo}</p>
            <p className="text-indigo-400 text-xs">
              {profile.gamesPlayed} partie{profile.gamesPlayed !== 1 ? "s" : ""}{" "}
              · {profile.wins} victoire{profile.wins !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Boutons principaux */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onHost}
          className="bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-300 text-indigo-900 font-bold text-xl px-8 py-4 rounded-2xl shadow-lg transition"
        >
          🎯 Créer une partie
        </button>

        <button
          onClick={onJoin}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-500 text-white font-bold text-xl px-8 py-4 rounded-2xl shadow-lg transition"
        >
          📱 Rejoindre
        </button>

        <button
          onClick={onStats}
          className="bg-indigo-800 hover:bg-indigo-700 active:bg-indigo-700 text-indigo-200 font-bold text-lg px-8 py-3 rounded-2xl transition border border-indigo-600"
        >
          📊 Mes stats
        </button>
      </div>

      <p className="text-indigo-600 text-xs mt-2">
        Tous les thèmes · Pouvoirs · Équipes · Tournoi
      </p>
    </div>
  );
}
