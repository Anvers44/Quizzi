import { useState } from "react";
import { loadProfile, saveProfile } from "../lib/profile";
import { AVATAR_EMOJI, AVATARS } from "../types";
import type { Avatar } from "../types";

interface Props {
  onBack: () => void;
}

export default function StatsPage({ onBack }: Props) {
  const [profile, setProfile] = useState(loadProfile);
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<Avatar>(profile?.avatar ?? "fox");
  const [pseudo, setPseudo] = useState(profile?.pseudo ?? "");
  const [confirmReset, setConfirmReset] = useState(false);

  // ── Pas de profil ─────────────────────────────────────────
  if (!profile) {
    return (
      <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-7xl animate-bounce">📊</div>
        <h1 className="text-2xl font-extrabold text-white text-center">
          Pas encore de stats
        </h1>
        <p className="text-indigo-300 text-center max-w-xs">
          Rejoins une partie pour commencer à accumuler des stats !
        </p>
        <button
          onClick={onBack}
          className="bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-600 text-white font-bold px-8 py-3 rounded-2xl transition"
        >
          ← Retour
        </button>
      </div>
    );
  }

  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.wins / profile.gamesPlayed) * 100)
      : 0;
  const avgScore =
    profile.gamesPlayed > 0
      ? Math.round(profile.totalScore / profile.gamesPlayed)
      : 0;

  function saveEdits() {
    const updated = {
      ...profile!,
      pseudo: pseudo.trim() || profile!.pseudo,
      avatar,
    };
    saveProfile(updated);
    setProfile(updated);
    setEditing(false);
  }

  function resetStats() {
    const updated = { ...profile!, gamesPlayed: 0, wins: 0, totalScore: 0 };
    saveProfile(updated);
    setProfile(updated);
    setConfirmReset(false);
  }

  const badges = [
    { cond: profile.gamesPlayed >= 1, emoji: "🎮", label: "Première partie" },
    { cond: profile.wins >= 1, emoji: "🏆", label: "1ère victoire" },
    { cond: profile.wins >= 5, emoji: "🌟", label: "5 victoires" },
    { cond: profile.gamesPlayed >= 10, emoji: "🔥", label: "10 parties" },
    { cond: profile.gamesPlayed >= 50, emoji: "💎", label: "50 parties" },
    { cond: winRate >= 50, emoji: "⚡", label: "50% win rate" },
    { cond: profile.totalScore >= 10000, emoji: "💰", label: "10 000 pts" },
  ];

  const milestones = [1, 5, 10, 25, 50, 100];
  const nextMs = milestones.find((m) => m > profile.gamesPlayed);
  const msPct = nextMs ? Math.round((profile.gamesPlayed / nextMs) * 100) : 100;

  return (
    <div className="min-h-[100dvh] bg-indigo-900 flex flex-col items-center p-5 gap-5 overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-white font-semibold text-sm transition"
        >
          ← Retour
        </button>
        <h1 className="text-xl font-extrabold text-white">Mes Stats</h1>
        <button
          onClick={() => {
            setEditing(!editing);
            setAvatar(profile.avatar);
            setPseudo(profile.pseudo);
          }}
          className="text-indigo-400 hover:text-white font-semibold text-sm transition"
        >
          {editing ? "Annuler" : "✏️ Modifier"}
        </button>
      </div>

      {/* Profil card */}
      <div className="w-full max-w-sm bg-indigo-800 rounded-3xl p-5 flex flex-col items-center gap-3">
        <div className="text-6xl">{AVATAR_EMOJI[avatar]}</div>
        {editing ? (
          <div className="w-full flex flex-col gap-3">
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={20}
              className="bg-indigo-700 text-white text-center font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Ton pseudo"
            />
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-3xl p-2 rounded-xl transition-all ${avatar === a ? "bg-yellow-400 scale-110" : "bg-indigo-700 hover:bg-indigo-600"}`}
                >
                  {AVATAR_EMOJI[a]}
                </button>
              ))}
            </div>
            <button
              onClick={saveEdits}
              className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold rounded-xl py-2 transition"
            >
              Sauvegarder
            </button>
          </div>
        ) : (
          <h2 className="text-2xl font-extrabold text-white">
            {profile.pseudo}
          </h2>
        )}
      </div>

      {/* Stats grille */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        {[
          {
            label: "Parties jouées",
            value: profile.gamesPlayed,
            color: "text-white",
            emoji: "🎮",
          },
          {
            label: "Victoires",
            value: profile.wins,
            color: "text-yellow-400",
            emoji: "🏆",
          },
          {
            label: "Ratio wins",
            value: `${winRate}%`,
            color: "text-green-400",
            emoji: "📈",
          },
          {
            label: "Score moyen",
            value: avgScore.toLocaleString(),
            color: "text-blue-300",
            emoji: "⭐",
          },
        ].map(({ label, value, color, emoji }) => (
          <div
            key={label}
            className="bg-indigo-800 rounded-2xl p-4 flex flex-col gap-1"
          >
            <span className="text-2xl">{emoji}</span>
            <span className={`${color} font-extrabold text-2xl`}>{value}</span>
            <span className="text-indigo-400 text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Score total */}
      <div className="w-full max-w-sm bg-gradient-to-r from-purple-700 to-indigo-700 rounded-2xl p-5 flex items-center gap-4">
        <span className="text-4xl">🎯</span>
        <div>
          <p className="text-indigo-300 text-xs uppercase tracking-widest">
            Score total cumulé
          </p>
          <p className="text-white font-extrabold text-3xl">
            {profile.totalScore.toLocaleString()} pts
          </p>
        </div>
      </div>

      {/* Progression */}
      {profile.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-indigo-800 rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
            Progression
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-indigo-400">
              <span>Taux de victoire</span>
              <span className="text-white font-semibold">{winRate}%</span>
            </div>
            <div className="w-full bg-indigo-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-700"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
          {nextMs && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-indigo-400">
                <span>Prochain objectif : {nextMs} parties</span>
                <span className="text-white font-semibold">
                  {profile.gamesPlayed}/{nextMs}
                </span>
              </div>
              <div className="w-full bg-indigo-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-400 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${msPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
          Badges
        </p>
        <div className="flex flex-wrap gap-2">
          {badges.map(({ cond, emoji, label }) => (
            <div
              key={label}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                cond
                  ? "bg-yellow-400/20 border border-yellow-400 text-yellow-300"
                  : "bg-indigo-800 text-indigo-600 border border-transparent"
              }`}
            >
              <span className={cond ? "" : "grayscale opacity-30"}>
                {emoji}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="w-full max-w-sm pb-6">
        {confirmReset ? (
          <div className="flex flex-col gap-2 bg-red-900/30 border border-red-500 rounded-2xl p-4">
            <p className="text-red-300 text-sm text-center font-semibold">
              Supprimer toutes mes stats ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 bg-indigo-700 text-white font-bold py-2 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={resetStats}
                className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl"
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full text-red-400 hover:text-red-300 text-sm font-semibold transition py-2"
          >
            Réinitialiser les stats
          </button>
        )}
      </div>
    </div>
  );
}
