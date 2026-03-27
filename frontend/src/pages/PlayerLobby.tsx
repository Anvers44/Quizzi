import { useEffect } from "react";
import { useRoom } from "../hooks/useRoom";
import { AVATAR_EMOJI } from "../types";
import { clearSession } from "../lib/session";
import type { Avatar } from "../types";

interface Props {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  pseudo: string;
  avatar: Avatar;
  onLeave: () => void;
  onRoomClosed: () => void;
  onGameStart: () => void;
}

export default function PlayerLobby({
  roomCode,
  playerId,
  sessionToken,
  pseudo,
  avatar,
  onLeave,
  onRoomClosed,
  onGameStart,
}: Props) {
  const { state, connected, error, roomClosed, kicked, question, leave } =
    useRoom({
      role: "player",
      roomCode,
      playerId,
      sessionToken,
    });

  useEffect(() => {
    if (roomClosed || kicked) {
      clearSession();
      onRoomClosed();
    }
  }, [roomClosed, kicked]);

  useEffect(() => {
    if (question) onGameStart();
  }, [question]);

  function handleLeave() {
    leave();
    clearSession();
    onLeave();
  }

  const players = state?.players ?? [];

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-8 p-6">
      <div className="w-full max-w-sm flex justify-between items-center">
        <div
          className={`text-xs px-3 py-1 rounded-full font-semibold ${connected ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300 animate-pulse"}`}
        >
          {connected ? "● Connecté" : "○ Reconnexion…"}
        </div>
        <button
          onClick={handleLeave}
          className="text-sm text-indigo-400 hover:text-red-400 transition font-semibold"
        >
          ✕ Quitter
        </button>
      </div>

      <div className="text-7xl">{AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-3xl font-extrabold text-white">{pseudo}</h1>

      <div className="bg-indigo-800 rounded-2xl px-8 py-4 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          Partie
        </p>
        <p className="text-2xl font-bold text-white tracking-widest">
          {roomCode}
        </p>
      </div>

      <p className="text-indigo-300 text-lg animate-pulse">
        En attente du début de la partie…
      </p>

      {players.length > 1 && (
        <div className="flex flex-wrap gap-3 justify-center max-w-xs">
          {players
            .filter((p) => p.id !== playerId)
            .map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${p.connected ? "bg-indigo-700" : "opacity-40 bg-indigo-900"}`}
              >
                <span className="text-xl">{AVATAR_EMOJI[p.avatar]}</span>
                <span className="text-white text-sm font-semibold">
                  {p.pseudo}
                </span>
              </div>
            ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
