import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import HostPage from "./pages/HostPage";
import HostLobby from "./pages/HostLobby";
import HostGame from "./pages/HostGame";
import JoinPage from "./pages/JoinPage";
import PlayerLobby from "./pages/PlayerLobby";
import PlayerGame from "./pages/PlayerGame";
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
  | "player-lobby"
  | "player-game";

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

  useEffect(() => {
    async function restore() {
      const session = loadSession();
      if (!session) {
        setScreen("home");
        return;
      }

      if (session.role === "host") {
        setRoomCode(session.roomCode);
        setScreen("host-lobby");
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
        if (res.status === "lobby") setScreen("player-lobby");
        else setScreen("player-game");
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
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
        <p className="text-indigo-300 text-lg animate-pulse">Chargement…</p>
      </div>
    );
  }
  if (screen === "home") {
    return (
      <HomePage
        onHost={() => setScreen("host-create")}
        onPlayer={() => setScreen("join")}
      />
    );
  }
  if (screen === "host-create") {
    return (
      <HostPage
        onRoomCreated={(code) => {
          setRoomCode(code);
          setScreen("host-lobby");
        }}
      />
    );
  }
  if (screen === "host-lobby") {
    return (
      <HostLobby
        roomCode={roomCode}
        onLeave={goHome}
        onStart={() => setScreen("host-game")}
      />
    );
  }
  if (screen === "host-game") {
    return <HostGame roomCode={roomCode} onLeave={goHome} />;
  }
  if (screen === "join") {
    return (
      <JoinPage
        onJoined={(code, info) => {
          setRoomCode(code);
          setPlayerInfo(info);
          setScreen("player-lobby");
        }}
      />
    );
  }
  if (screen === "player-lobby" && playerInfo) {
    return (
      <PlayerLobby
        roomCode={roomCode}
        playerId={playerInfo.playerId}
        sessionToken={playerInfo.sessionToken}
        pseudo={playerInfo.pseudo}
        avatar={playerInfo.avatar}
        onLeave={goHome}
        onRoomClosed={goHome}
        onGameStart={() => setScreen("player-game")}
      />
    );
  }
  if (screen === "player-game" && playerInfo) {
    return (
      <PlayerGame
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
