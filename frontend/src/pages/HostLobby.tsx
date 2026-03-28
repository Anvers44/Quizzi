import { useState } from "react";
import { useRoom } from "../hooks/useRoom";
import { AVATAR_EMOJI } from "../types";
import { clearSession } from "../lib/session";
import type { GameConfig, TeamId } from "../types";
import type { PublicPlayer } from "../socket-events";
import { getSocket } from "../lib/socket";

interface Props {
  roomCode: string;
  config: GameConfig;
  onLeave: () => void;
  onStart: () => void;
}

const TEAM_STYLE: Record<TeamId, string> = {
  red: "bg-red-500/10 border border-red-500",
  blue: "bg-blue-500/10 border border-blue-500",
};
const TEAM_TEXT: Record<TeamId, string> = {
  red: "text-red-300",
  blue: "text-blue-300",
};

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

  function handleLeave() {
    leave();
    clearSession();
    onLeave();
  }
  function handleStart() {
    startGame();
    onStart();
  }

  function swapTeam(playerId: string, currentTeam: TeamId | undefined) {
    const newTeam: TeamId = currentTeam === "red" ? "blue" : "red";
    getSocket().emit("host:assign_teams", {
      roomCode,
      assignments: { [playerId]: newTeam },
    });
  }

  function shuffleTeams() {
    if (players.length === 0) return;
    setShuffling(true);

    // Shuffle array
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const assignments: Record<string, TeamId> = {};
    shuffled.forEach((p, i) => {
      assignments[p.id] = i < half ? "red" : "blue";
    });

    getSocket().emit("host:assign_teams", { roomCode, assignments });
    setTimeout(() => setShuffling(false), 600);
  }

  const isTeams = config.mode === "teams";
  const redPlayers = players.filter((p) => p.teamId === "red");
  const bluePlayers = players.filter((p) => p.teamId === "blue");

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-start gap-4 p-5 overflow-y-auto">
      {/* Header */}
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
          ✕ Fermer la partie
        </button>
      </div>

      {/* Code room */}
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
              ? `Équipes · ${config.questionsPerRound} q/manche`
              : `Tournoi · ${config.questionsPerRound} q/manche`}
          {config.powersEnabled ? " · ⚡ Pouvoirs" : ""}
        </p>
      </div>

      {/* Compteur */}
      <p className="text-indigo-200 text-base">
        {players.length === 0
          ? "En attente de joueurs…"
          : `${players.length} joueur${players.length > 1 ? "s" : ""} connecté${players.length > 1 ? "s" : ""}`}
      </p>

      {/* Équipes */}
      {isTeams && players.length > 0 && (
        <>
          {/* Bouton Shuffle */}
          <button
            onClick={shuffleTeams}
            className={`flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-600 text-white font-semibold px-5 py-2 rounded-xl transition-all ${
              shuffling ? "scale-95 opacity-70" : ""
            }`}
          >
            <span
              className={`text-lg transition-transform ${shuffling ? "animate-spin" : ""}`}
            >
              🔀
            </span>
            Mélanger les équipes
          </button>

          <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
            {(["red", "blue"] as TeamId[]).map((tid) => {
              const teamPlayers = tid === "red" ? redPlayers : bluePlayers;
              return (
                <div
                  key={tid}
                  className={`rounded-2xl p-3 transition-all ${TEAM_STYLE[tid]}`}
                >
                  <p className={`font-bold text-sm mb-2 ${TEAM_TEXT[tid]}`}>
                    {tid === "red" ? "🔴 Équipe Rouge" : "🔵 Équipe Bleue"}
                    <span className="ml-1 opacity-70">
                      ({teamPlayers.length})
                    </span>
                  </p>
                  <div className="flex flex-col gap-2 min-h-8">
                    {teamPlayers.map((p: PublicPlayer) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 bg-white/10 rounded-xl px-2 py-1 transition-all"
                      >
                        <span className="text-xl">
                          {AVATAR_EMOJI[p.avatar]}
                        </span>
                        <span className="text-white font-semibold text-sm flex-1">
                          {p.pseudo}
                        </span>
                        <button
                          onClick={() => swapTeam(p.id, p.teamId as TeamId)}
                          title="Changer d'équipe"
                          className="text-xs bg-white/20 hover:bg-white/40 text-white px-2 py-0.5 rounded-lg transition"
                        >
                          ⇄
                        </button>
                      </div>
                    ))}
                    {teamPlayers.length === 0 && (
                      <p className="text-xs opacity-40 text-center py-3">
                        Aucun joueur
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Classique / tournoi */}
      {!isTeams && players.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
          {players.map((p: PublicPlayer) => (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all ${
                p.connected ? "bg-indigo-700" : "bg-indigo-900 opacity-40"
              }`}
            >
              <span className="text-3xl">{AVATAR_EMOJI[p.avatar]}</span>
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

      {/* Démarrer */}
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
