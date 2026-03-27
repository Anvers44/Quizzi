import { useState } from "react";
import { apiPost } from "../lib/api";
import { saveSession } from "../lib/session";
import { AVATARS, AVATAR_EMOJI } from "../types";
import type { Avatar } from "../types";

interface Props {
  onJoined: (
    roomCode: string,
    info: {
      playerId: string;
      sessionToken: string;
      pseudo: string;
      avatar: Avatar;
    },
  ) => void;
}

export default function JoinPage({ onJoined }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("fox");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setError("");
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Le code doit faire 6 lettres");
      return;
    }
    if (!pseudo.trim()) {
      setError("Entre ton pseudo");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost<{
        playerId: string;
        sessionToken: string;
        roomCode: string;
      }>(`/api/rooms/${code}/join`, { pseudo: pseudo.trim(), avatar });
      saveSession({
        roomCode: res.roomCode,
        playerId: res.playerId,
        sessionToken: res.sessionToken,
        role: "player",
        pseudo: pseudo.trim(),
        avatar,
      });
      onJoined(res.roomCode, {
        playerId: res.playerId,
        sessionToken: res.sessionToken,
        pseudo: pseudo.trim(),
        avatar,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-extrabold text-white">Rejoindre 📱</h1>

      <div className="w-full max-w-xs flex flex-col gap-1">
        <label className="text-indigo-300 text-sm font-semibold">
          Code de la partie
        </label>
        <input
          type="text"
          maxLength={6}
          placeholder="ABCDEF"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="bg-indigo-800 text-white text-center text-2xl font-bold tracking-widest rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 placeholder-indigo-500 uppercase"
        />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-1">
        <label className="text-indigo-300 text-sm font-semibold">
          Ton pseudo
        </label>
        <input
          type="text"
          maxLength={20}
          placeholder="Ex: Alice"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="bg-indigo-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 placeholder-indigo-500"
        />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-2">
        <label className="text-indigo-300 text-sm font-semibold">
          Ton avatar
        </label>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-3xl p-2 rounded-xl transition ${
                avatar === a
                  ? "bg-yellow-400 scale-110"
                  : "bg-indigo-800 hover:bg-indigo-700"
              }`}
            >
              {AVATAR_EMOJI[a]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/30 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      <button
        onClick={handleJoin}
        disabled={loading}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-xl px-10 py-4 rounded-2xl shadow-lg transition w-full max-w-xs"
      >
        {loading ? "Connexion…" : "Rejoindre"}
      </button>
    </div>
  );
}
