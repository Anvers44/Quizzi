import { useState, useEffect } from "react";
import { apiPost, apiGet } from "../lib/api";
import { saveSession } from "../lib/session";
import { loadProfile, saveProfile } from "../lib/profile";
import { AVATARS, AVATAR_EMOJI } from "../types";
import type { Avatar, GameConfig } from "../types";

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
  onBack: () => void;
}

interface RoomInfo {
  roomCode: string;
  playerCount: number;
  config: GameConfig;
}

export default function JoinPage({ onJoined, onBack }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("fox");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setPseudo(profile.pseudo);
      setAvatar(profile.avatar);
      setHasProfile(true);
    }
  }, []);

  useEffect(() => {
    apiGet<{ rooms: RoomInfo[] }>("/api/rooms/list")
      .then((d) => setRooms(d.rooms))
      .catch(() => {});
  }, []);

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
      const existing = loadProfile();
      saveProfile({
        pseudo: pseudo.trim(),
        avatar,
        gamesPlayed: existing?.gamesPlayed ?? 0,
        wins: existing?.wins ?? 0,
        totalScore: existing?.totalScore ?? 0,
      });
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

  const MODE_EMOJI: Record<string, string> = {
    classic: "🎮",
    teams: "🤝",
    tournament: "🏆",
  };

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-start gap-4 p-5 overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-xs flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-white font-semibold text-sm transition"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-extrabold text-white">Rejoindre 📱</h1>
        <div className="w-12" />
      </div>

      {/* Bienvenue retour */}
      {hasProfile && (
        <div className="w-full max-w-xs bg-indigo-700/60 border border-indigo-500 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-3xl">{AVATAR_EMOJI[avatar]}</span>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">
              Bon retour, {pseudo} !
            </span>
            <span className="text-indigo-300 text-xs">
              Tu peux changer ton avatar ci-dessous
            </span>
          </div>
        </div>
      )}

      {/* Parties disponibles */}
      {rooms.length > 0 && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
            Parties disponibles
          </p>
          {rooms.map((r) => (
            <button
              key={r.roomCode}
              onClick={() => setRoomCode(r.roomCode)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${
                roomCode === r.roomCode
                  ? "bg-yellow-400 text-indigo-900"
                  : "bg-indigo-700 text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{MODE_EMOJI[r.config?.mode] ?? ""}</span>
                <span className="text-lg tracking-widest">{r.roomCode}</span>
              </div>
              <span className="text-sm opacity-70">
                {r.playerCount} joueur{r.playerCount > 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Code */}
      <div className="w-full max-w-xs flex flex-col gap-1">
        <label className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
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

      {/* Pseudo */}
      <div className="w-full max-w-xs flex flex-col gap-1">
        <label className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
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

      {/* Avatar */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <label className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
          Avatar
        </label>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-3xl p-2 rounded-xl transition ${avatar === a ? "bg-yellow-400 scale-110" : "bg-indigo-800"}`}
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
        className="bg-yellow-400 active:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-xl px-10 py-4 rounded-2xl shadow-lg w-full max-w-xs mb-4"
      >
        {loading ? "Connexion…" : "Rejoindre"}
      </button>
    </div>
  );
}
