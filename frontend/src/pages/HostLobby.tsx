import { useRoom } from "../hooks/useRoom";
import { AVATAR_EMOJI } from "../types";
import { clearSession } from "../lib/session";
import type { GameConfig, TeamId } from "../types";
import { getSocket } from "../lib/socket";

interface Props {
  roomCode: string;
  config: GameConfig;
  onLeave: () => void;
  onStart: () => void;
}

const TEAM_COLORS: Record<TeamId, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
};
const TEAM_LIGHT: Record<TeamId, string> = {
  red: "bg-red-500/20 border-red-500 text-red-300",
  blue: "bg-blue-500/20 border-blue-500 text-blue-300",
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
  const players = state?.players ?? [];

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

  const isTeams = config.mode === "teams";
  const redPlayers = players.filter((p) => p.teamId === "red");
  const bluePlayers = players.filter((p) => p.teamId === "blue");

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-start gap-4 p-5 overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center pt-1">
        <div
          className={`text-xs px-3 py-1 rounded-full font-semibold ${connected ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
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

      {/* Code */}
      <div className="bg-white rounded-3xl px-10 py-6 flex flex-col items-center gap-1 shadow-2xl">
        <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">
          Code de la partie
        </p>
        <p className="text-5xl font-extrabold text-indigo-900 tracking-widest">
          {roomCode}
        </p>
        <p className="text-indigo-400 text-xs">
          {config.mode === "classic"
            ? `${config.rounds} manche${config.rounds > 1 ? "s" : ""} · ${config.questionsPerRound} q/manche`
            : config.mode === "teams"
              ? `Équipes · ${config.questionsPerRound} q/manche`
              : `Tournoi · ${config.questionsPerRound} q/manche`}
          {config.powersEnabled ? " · ⚡ Pouvoirs" : ""}
        </p>
      </div>

      {/* Players count */}
      <p className="text-indigo-200 text-base">
        {players.length === 0
          ? "En attente de joueurs…"
          : `${players.length} joueur${players.length > 1 ? "s" : ""} connecté${players.length > 1 ? "s" : ""}`}
      </p>

      {/* Teams view */}
      {isTeams && players.length > 0 && (
        <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div
              key={tid}
              className={`rounded-2xl p-3 border ${TEAM_LIGHT[tid]}`}
            >
              <p className="font-bold text-sm mb-2">
                {tid === "red" ? "🔴 Équipe Rouge" : "🔵 Équipe Bleue"}
                <span className="ml-1 opacity-70">
                  ({tid === "red" ? redPlayers : bluePlayers}.length)
                </span>
              </p>
              <div className="flex flex-col gap-2">
                {(tid === "red" ? redPlayers : bluePlayers).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-white/10 rounded-xl px-2 py-1"
                  >
                    <span className="text-xl">{AVATAR_EMOJI[p.avatar]}</span>
                    <span className="text-white font-semibold text-sm flex-1">
                      {p.pseudo}
                    </span>
                    <button
                      onClick={() => swapTeam(p.id, p.teamId as TeamId)}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg transition"
                    >
                      ⇄
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Classic player grid */}
      {!isTeams && players.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition ${p.connected ? "bg-indigo-700" : "bg-indigo-900 opacity-40"}`}
            >
              <span className="text-3xl">{AVATAR_EMOJI[p.avatar]}</span>
              <span className="text-white font-semibold text-sm">
                {p.pseudo}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Start button */}
      {players.length > 0 && (
        <button
          onClick={handleStart}
          className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg transition mt-2"
        >
          🚀 Démarrer la partie
        </button>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
