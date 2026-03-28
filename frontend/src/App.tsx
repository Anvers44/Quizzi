import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import HostPage from "./pages/HostPage";
import HostLobby from "./pages/HostLobby";
import HostGame from "./pages/HostGame";
import JoinPage from "./pages/JoinPage";
import PlayerScreen from "./pages/PlayerScreen";
import StatsPage from "./pages/StatsPage";
import { loadSession, clearSession } from "./lib/session";
import { apiGet } from "./lib/api";
import type { GameConfig, Avatar } from "./types";

type Screen =
  | "home"
  | "host-create"
  | "host-lobby"
  | "host-game"
  | "join"
  | "player"
  | "stats";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [roomCode, setRoomCode] = useState("");
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("fox");

  // Restore session on mount
  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    if (session.role === "host") {
      // Verify room still exists before restoring
      apiGet(`/api/rooms/${session.roomCode}`)
        .then((data: any) => {
          setRoomCode(session.roomCode);
          if (data.config) setGameConfig(data.config);
          if (data.status === "lobby") setScreen("host-lobby");
          else if (data.status !== "finished") setScreen("host-game");
          else clearSession();
        })
        .catch(() => clearSession());
    } else if (session.role === "player") {
      setRoomCode(session.roomCode);
      setPlayerId(session.playerId ?? "");
      setSessionToken(session.sessionToken ?? "");
      setPseudo(session.pseudo ?? "");
      setAvatar((session.avatar as Avatar) ?? "fox");
      setScreen("player");
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────
  function handleRoomCreated(code: string, config: GameConfig) {
    setRoomCode(code);
    setGameConfig(config);
    setScreen("host-lobby");
  }

  function handlePlayerJoined(
    code: string,
    info: {
      playerId: string;
      sessionToken: string;
      pseudo: string;
      avatar: Avatar;
    },
  ) {
    setRoomCode(code);
    setPlayerId(info.playerId);
    setSessionToken(info.sessionToken);
    setPseudo(info.pseudo);
    setAvatar(info.avatar);
    setScreen("player");
  }

  function goHome() {
    clearSession();
    setScreen("home");
    setRoomCode("");
    setGameConfig(null);
    setPlayerId("");
    setSessionToken("");
  }

  // ── Render ─────────────────────────────────────────────────
  if (screen === "stats") {
    return <StatsPage onBack={() => setScreen("home")} />;
  }

  if (screen === "host-create") {
    return (
      <HostPage
        onBack={() => setScreen("home")}
        onRoomCreated={handleRoomCreated}
      />
    );
  }

  if (screen === "host-lobby" && gameConfig) {
    return (
      <HostLobby
        roomCode={roomCode}
        config={gameConfig}
        onLeave={goHome}
        onStart={() => setScreen("host-game")}
      />
    );
  }

  if (screen === "host-game" && gameConfig) {
    return (
      <HostGame roomCode={roomCode} config={gameConfig} onLeave={goHome} />
    );
  }

  if (screen === "join") {
    return (
      <JoinPage
        onBack={() => setScreen("home")}
        onJoined={handlePlayerJoined}
      />
    );
  }

  if (screen === "player") {
    return (
      <PlayerScreen
        roomCode={roomCode}
        playerId={playerId}
        sessionToken={sessionToken}
        pseudo={pseudo}
        avatar={avatar}
        onLeave={goHome}
        onRoomClosed={goHome}
      />
    );
  }

  // Default: home
  return (
    <HomePage
      onHost={() => setScreen("host-create")}
      onJoin={() => setScreen("join")}
      onStats={() => setScreen("stats")}
    />
  );
}
