import { useState } from "react";
import { apiPost } from "../lib/api";
import { saveSession } from "../lib/session";

interface Props {
  onRoomCreated: (roomCode: string) => void;
}

export default function HostPage({ onRoomCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const { roomCode } = await apiPost<{ roomCode: string }>("/api/rooms");
      saveSession({
        roomCode,
        playerId: "host",
        sessionToken: "host",
        role: "host",
      });
      onRoomCreated(roomCode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-5xl font-extrabold text-white tracking-tight">
        Quiz 🎯
      </h1>
      <p className="text-indigo-300 text-lg">
        Mode présentateur — écran principal
      </p>

      <button
        onClick={createRoom}
        disabled={loading}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-xl px-10 py-4 rounded-2xl shadow-lg transition"
      >
        {loading ? "Création…" : "Créer une partie"}
      </button>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/30 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
