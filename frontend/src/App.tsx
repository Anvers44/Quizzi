import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import HostPage from "./pages/HostPage";
import HostLobby from "./pages/HostLobby";
import HostGame from "./pages/HostGame";
import JoinPage from "./pages/JoinPage";
import PlayerScreen from "./pages/PlayerScreen";
import { loadSession, clearSession } from "./lib/session";
import { apiPost } from "./lib/api";
import type { Avatar } from "./types";

type Screen =
  | "boot"
  | "home"
  | "host-create"
  | "host-lobby"
  | "host-game"
  | "join"
  | "player";

interface PlayerInfo {
  playerId: string;
  sessionToken: string;
  pseudo: string;
  avatar: Avatar;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [roomCode, setRoomCode] = useState("");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  useEffect(() => {
    async function restore() {
      const session = loadSession();
      if (!session) {
        setScreen("home");
        return;
      }

      if (session.role === "host") {
        setRoomCode(session.roomCode);
        try {
          const room = await apiGet<{ status: string }>(
            `/api/rooms/${session.roomCode}`,
          );
          if (
            room.status === "playing" ||
            room.status === "paused" ||
            room.status === "revealing"
          ) {
            setScreen("host-game");
          } else if (room.status === "finished") {
            clearSession();
            setScreen("home");
          } else {
            setScreen("host-lobby");
          }
        } catch {
          clearSession();
          setScreen("home");
        }
        return;
      }

      try {
        const res = await apiPost<{
          playerId: string;
          sessionToken: string;
          roomCode: string;
          pseudo: string;
          avatar: Avatar;
          status: string;
        }>(`/api/rooms/${session.roomCode}/rejoin`, {
          playerId: session.playerId,
          sessionToken: session.sessionToken,
        });
        setRoomCode(res.roomCode);
        setPlayerInfo({
          playerId: res.playerId,
          sessionToken: res.sessionToken,
          pseudo: res.pseudo,
          avatar: res.avatar,
        });
        setScreen("player");
      } catch {
        clearSession();
        setScreen("home");
      }
    }
    restore();
  }, []);

  function goHome() {
    setRoomCode("");
    setPlayerInfo(null);
    setScreen("home");
  }

  if (screen === "boot") {
    return (
      <div className="h-[100dvh] bg-indigo-900 flex items-center justify-center">
        <p className="text-indigo-300 text-lg animate-pulse">Chargement…</p>
      </div>
    );
  }
  if (screen === "home")
    return (
      <HomePage
        onHost={() => setScreen("host-create")}
        onPlayer={() => setScreen("join")}
      />
    );
  if (screen === "host-create")
    return (
      <HostPage
        onRoomCreated={(code, config) => {
          setRoomCode(code);
          setGameConfig(config);
          setScreen("host-lobby");
        }}
      />
    );
  if (screen === "host-lobby")
    return (
      <HostLobby
        roomCode={roomCode}
        config={gameConfig!}
        onLeave={goHome}
        onStart={() => setScreen("host-game")}
      />
    );
  if (screen === "host-game")
    return (
      <HostGame roomCode={roomCode} config={gameConfig!} onLeave={goHome} />
    );
  if (screen === "join") {
    return (
      <JoinPage
        onJoined={(code, info) => {
          setRoomCode(code);
          setPlayerInfo(info);
          setScreen("player");
        }}
      />
    );
  }
  if (screen === "player" && playerInfo) {
    return (
      <PlayerScreen
        roomCode={roomCode}
        playerId={playerInfo.playerId}
        sessionToken={playerInfo.sessionToken}
        pseudo={playerInfo.pseudo}
        avatar={playerInfo.avatar}
        onLeave={goHome}
        onRoomClosed={goHome}
      />
    );
  }
  return null;
}
