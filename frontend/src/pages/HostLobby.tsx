import { useState } from "react";
import { useRoom } from "../hooks/useRoom";
import { AVATAR_EMOJI, TEAM_META, ALL_TEAM_IDS } from "../types";
import { clearSession } from "../lib/session";
import type { GameConfig } from "../types";
import type { PublicPlayer } from "../socket-events";
import { getSocket } from "../lib/socket";

interface Props {
  roomCode: string;
  config: GameConfig;
  onLeave: () => void;
  onStart: () => void;
}

export default function HostLobby({
  roomCode,
  config,
  onLeave,
  onStart,
}: Props) {
  const { state, connected, error, leave, startGame } = useRoom({
    role: "host",
    roomCode,
  });
  const [shuffling, setShuffling] = useState(false);
  const players: PublicPlayer[] = state?.players ?? [];

  const teamIds = ALL_TEAM_IDS.slice(0, config.teamCount || 2);
  const isTeams = config.mode === "teams";

  function handleLeave() {
    leave();
    clearSession();
    onLeave();
  }
  function handleStart() {
    startGame();
    onStart();
  }

  function swapTeam(playerId: string, currentTeam: string | undefined) {
    const idx = currentTeam ? teamIds.indexOf(currentTeam as any) : -1;
    const newTid = teamIds[(idx + 1) % teamIds.length];
    getSocket().emit("host:assign_teams", {
      roomCode,
      assignments: { [playerId]: newTid },
    });
  }

  function shuffleTeams() {
    if (!players.length) return;
    setShuffling(true);
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const assignments: Record<string, string> = {};
    shuffled.forEach((p, i) => {
      assignments[p.id] = teamIds[i % teamIds.length];
    });
    getSocket().emit("host:assign_teams", { roomCode, assignments });
    setTimeout(() => setShuffling(false), 600);
  }

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-start gap-4 p-5 overflow-y-auto">
      <div className="w-full max-w-2xl flex justify-between items-center pt-1">
        <div
          className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
            connected
              ? "bg-green-500/20 text-green-300"
              : "bg-red-500/20 text-red-300 animate-pulse"
          }`}
        >
          {connected ? "● Connecté" : "○ Reconnexion…"}
        </div>
        <button
          onClick={handleLeave}
          className="text-sm text-indigo-400 hover:text-red-400 transition font-semibold"
        >
          ✕ Fermer
        </button>
      </div>

      <div className="bg-white rounded-3xl px-10 py-6 flex flex-col items-center gap-1 shadow-2xl">
        <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">
          Code de la partie
        </p>
        <p className="text-5xl font-extrabold text-indigo-900 tracking-widest">
          {roomCode}
        </p>
        <p className="text-indigo-400 text-xs text-center">
          {config.mode === "classic"
            ? `Classique · ${config.rounds} manche${config.rounds > 1 ? "s" : ""} · ${config.questionsPerRound} q/manche`
            : config.mode === "teams"
              ? `${teamIds.length} équipes · ${config.questionsPerRound} q/manche`
              : `Tournoi · ${config.questionsPerRound} q/manche`}
          {config.powersEnabled ? " · ⚡" : ""}
        </p>
      </div>

      <p className="text-indigo-200 text-base">
        {players.length === 0
          ? "En attente de joueurs…"
          : `${players.length} joueur${players.length > 1 ? "s" : ""} connecté${players.length > 1 ? "s" : ""}`}
      </p>

      {/* Teams view */}
      {isTeams && players.length > 0 && (
        <>
          <button
            onClick={shuffleTeams}
            className={`flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold px-5 py-2 rounded-xl transition-all ${shuffling ? "scale-95 opacity-70" : ""}`}
          >
            <span className={`text-lg ${shuffling ? "animate-spin" : ""}`}>
              🔀
            </span>
            Mélanger les équipes
          </button>
          <div
            className={`w-full max-w-2xl grid gap-3`}
            style={{
              gridTemplateColumns: `repeat(${Math.min(teamIds.length, 3)},1fr)`,
            }}
          >
            {teamIds.map((tid) => {
              const teamPlayers = players.filter((p) => p.teamId === tid);
              const meta = TEAM_META[tid];
              return (
                <div
                  key={tid}
                  className={`rounded-2xl p-3 ${meta.light} border ${meta.border}`}
                >
                  <p className={`font-bold text-sm mb-2 ${meta.text}`}>
                    {meta.emoji} Éq. {meta.label}{" "}
                    <span className="opacity-70">({teamPlayers.length})</span>
                  </p>
                  <div className="flex flex-col gap-2 min-h-8">
                    {teamPlayers.map((p: PublicPlayer) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 bg-white/10 rounded-xl px-2 py-1"
                      >
                        <span className="text-xl">
                          {AVATAR_EMOJI[p.avatar as any]}
                        </span>
                        <span className="text-white font-semibold text-sm flex-1 truncate">
                          {p.pseudo}
                        </span>
                        <button
                          onClick={() => swapTeam(p.id, p.teamId)}
                          title="Changer d'équipe"
                          className="text-xs bg-white/20 hover:bg-white/40 text-white px-2 py-0.5 rounded-lg transition shrink-0"
                        >
                          ⇄
                        </button>
                      </div>
                    ))}
                    {teamPlayers.length === 0 && (
                      <p className="text-xs opacity-40 text-center py-3">
                        Vide
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Classic / tournament */}
      {!isTeams && players.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
          {players.map((p: PublicPlayer) => (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all ${p.connected ? "bg-indigo-700" : "bg-indigo-900 opacity-40"}`}
            >
              <span className="text-3xl">{AVATAR_EMOJI[p.avatar as any]}</span>
              <span className="text-white font-semibold text-sm">
                {p.pseudo}
              </span>
              {!p.connected && (
                <span className="text-indigo-500 text-xs">hors ligne</span>
              )}
            </div>
          ))}
        </div>
      )}

      {players.length > 0 && (
        <button
          onClick={handleStart}
          className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg transition-all mt-2"
        >
          🚀 Démarrer la partie
        </button>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
