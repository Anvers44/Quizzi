import { useRoom } from "../hooks/useRoom";
import { AVATAR_EMOJI } from "../types";
import { clearSession } from "../lib/session";

interface Props {
  roomCode: string;
  onLeave: () => void;
  onStart: () => void;
}

export default function HostLobby({ roomCode, onLeave, onStart }: Props) {
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

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-8 p-6">
      <div className="w-full max-w-2xl flex justify-between items-center">
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

      <h1 className="text-3xl font-bold text-white">En attente de joueurs…</h1>

      <div className="bg-white rounded-3xl px-16 py-10 flex flex-col items-center gap-3 shadow-2xl">
        <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest">
          Code de la partie
        </p>
        <p className="text-7xl font-extrabold text-indigo-900 tracking-widest">
          {roomCode}
        </p>
        <p className="text-indigo-400 text-sm">Rejoins depuis ton appareil</p>
      </div>

      <div className="text-indigo-200 text-lg">
        {players.length === 0
          ? "Aucun joueur connecté"
          : `${players.length} joueur${players.length > 1 ? "s" : ""} connecté${players.length > 1 ? "s" : ""}`}
      </div>

      {players.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center max-w-2xl">
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

      {players.length > 0 && (
        <button
          onClick={handleStart}
          className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg transition"
        >
          🚀 Démarrer la partie
        </button>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
