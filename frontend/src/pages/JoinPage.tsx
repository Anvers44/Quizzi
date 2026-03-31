import { useState, useEffect } from "react";
import { apiPost, apiGet } from "../lib/api";
import { saveSession } from "../lib/session";
import { loadProfile, saveProfile } from "../lib/profile";
import { AVATARS, AVATAR_EMOJI, THEME_LABELS } from "../types";
import { unlockAudio } from "../lib/sound";
import { getAuthHeader } from "../lib/auth";
import type { Avatar, GameConfig } from "../types";
import type { AuthUser } from "../lib/auth";

interface Props {
  onJoined: (
    roomCode: string,
    info: {
      playerId: string;
      sessionToken: string;
      pseudo: string;
      avatar: Avatar;
      specialtyTheme?: string | null;
    },
  ) => void;
  onBack: () => void;
  authUser: AuthUser | null;
}

interface RoomInfo {
  roomCode: string;
  playerCount: number;
  config: GameConfig;
}
interface RoomDetail {
  players: Record<string, { avatar: string }>;
}

export default function JoinPage({ onJoined, onBack, authUser }: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("fox");
  const [specialtyTheme, setSpecialtyTheme] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [takenAvatars, setTakenAvatars] = useState<string[]>([]);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setPseudo(p.pseudo);
      setAvatar(p.avatar);
      setHasProfile(true);
    }
    // Pre-fill pseudo from account if available and no profile
    else if (authUser && !p) setPseudo(authUser.username);
  }, []);

  useEffect(() => {
    apiGet<{ rooms: RoomInfo[] }>("/api/rooms/list")
      .then((d) => setRooms(d.rooms))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      setTakenAvatars([]);
      return;
    }
    apiGet<RoomDetail>(`/api/rooms/${code}`)
      .then((d) => {
        const taken = Object.values(d.players || {}).map((p) => p.avatar);
        setTakenAvatars(taken);
        if (taken.includes(avatar)) {
          const free = AVATARS.find((a) => !taken.includes(a));
          if (free) setAvatar(free);
        }
      })
      .catch(() => setTakenAvatars([]));
  }, [roomCode]);

  async function handleJoin() {
    setError("");
    unlockAudio();
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Le code doit faire 6 lettres");
      return;
    }
    if (!pseudo.trim()) {
      setError("Entre ton pseudo");
      return;
    }
    if (takenAvatars.includes(avatar)) {
      setError("Cet avatar est déjà pris — choisis-en un autre");
      return;
    }
    setLoading(true);
    try {
      // Include auth header if logged in (backend links account to player)
      const res = await fetch(
        `${(await import("../config")).config.apiUrl}/api/rooms/${code}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({
            pseudo: pseudo.trim(),
            avatar,
            specialtyTheme: specialtyTheme === "none" ? null : specialtyTheme,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }));
        throw new Error(err.error ?? "Erreur inconnue");
      }
      const data = await res.json();
      const existing = loadProfile();
      saveProfile({
        pseudo: pseudo.trim(),
        avatar,
        gamesPlayed: existing?.gamesPlayed ?? 0,
        wins: existing?.wins ?? 0,
        totalScore: existing?.totalScore ?? 0,
      });
      onJoined(data.roomCode, {
        playerId: data.playerId,
        sessionToken: data.sessionToken,
        pseudo: pseudo.trim(),
        avatar,
        specialtyTheme: specialtyTheme === "none" ? null : specialtyTheme,
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
  const themeEntries = Object.entries(THEME_LABELS);

  return (
    <div
      className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-start gap-4 p-5 overflow-y-auto"
      onTouchStart={unlockAudio}
      onClick={unlockAudio}
    >
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

      {/* Account badge */}
      {authUser && (
        <div className="w-full max-w-xs bg-green-500/10 border border-green-400/40 rounded-2xl px-4 py-2 flex items-center gap-2">
          <span className="text-green-300 text-sm">
            ✅ Connecté en tant que <strong>{authUser.username}</strong>
          </span>
        </div>
      )}

      {!authUser && (
        <div className="w-full max-w-xs bg-indigo-700/40 border border-indigo-600 rounded-2xl px-4 py-2 text-xs text-indigo-400 text-center">
          Non connecté — tes stats ne seront pas sauvegardées.
        </div>
      )}

      {hasProfile && (
        <div className="w-full max-w-xs bg-indigo-700/60 border border-indigo-500 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-3xl">{AVATAR_EMOJI[avatar]}</span>
          <div>
            <p className="text-white font-bold text-sm">
              Bon retour, {pseudo} !
            </p>
            <p className="text-indigo-300 text-xs">
              Avatar peut être changé ci-dessous
            </p>
          </div>
        </div>
      )}

      {rooms.length > 0 && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
            Parties disponibles
          </p>
          {rooms.map((r) => (
            <button
              key={r.roomCode}
              onClick={() => setRoomCode(r.roomCode)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${roomCode === r.roomCode ? "bg-yellow-400 text-indigo-900" : "bg-indigo-700 text-white"}`}
            >
              <div className="flex items-center gap-2">
                <span>{MODE_EMOJI[r.config?.mode] ?? ""}</span>
                {r.config?.bluffEnabled && <span title="Bluff activé">🎭</span>}
                <span className="text-lg tracking-widest">{r.roomCode}</span>
              </div>
              <span className="text-sm opacity-70">
                {r.playerCount} joueur{r.playerCount > 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

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

      <div className="w-full max-w-xs flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
            Avatar
          </label>
          {takenAvatars.length > 0 && (
            <span className="text-indigo-500 text-xs">🔒 = déjà pris</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map((a) => {
            const isTaken = takenAvatars.includes(a);
            const isSelected = avatar === a;
            return (
              <button
                key={a}
                onClick={() => !isTaken && setAvatar(a)}
                disabled={isTaken}
                className={`relative text-3xl p-2 rounded-xl transition-all ${isSelected ? "bg-yellow-400 scale-110" : isTaken ? "bg-indigo-900 opacity-40 cursor-not-allowed" : "bg-indigo-800 hover:bg-indigo-700 active:scale-95"}`}
              >
                {AVATAR_EMOJI[a]}
                {isTaken && (
                  <span className="absolute top-0.5 right-0.5 text-xs">🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Specialty theme */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <label className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">
          Thème spécialité{" "}
          <span className="text-indigo-500 font-normal">(optionnel)</span>
        </label>
        <p className="text-indigo-500 text-xs">
          Bonne réponse sur ce thème → +20% · Mauvaise → −100 pts
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSpecialtyTheme("none")}
            className={`py-2 rounded-xl text-sm font-semibold transition ${specialtyTheme === "none" ? "bg-yellow-400 text-indigo-900" : "bg-indigo-800 text-white hover:bg-indigo-700"}`}
          >
            Aucun
          </button>
          {themeEntries.map(([key, label]) => {
            const [emoji, ...words] = label.split(" ");
            return (
              <button
                key={key}
                onClick={() => setSpecialtyTheme(key)}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs font-semibold transition ${specialtyTheme === key ? "bg-yellow-400 text-indigo-900" : "bg-indigo-800 text-white hover:bg-indigo-700"}`}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-center leading-tight">
                  {words.join(" ")}
                </span>
              </button>
            );
          })}
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
        className="bg-yellow-400 active:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-xl px-10 py-4 rounded-2xl shadow-lg w-full max-w-xs mb-4 transition-all active:scale-95"
      >
        {loading ? "Connexion…" : "Rejoindre"}
      </button>
    </div>
  );
}
