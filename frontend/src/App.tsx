import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import HostPage from "./pages/HostPage";
import HostLobby from "./pages/HostLobby";
import HostGame from "./pages/HostGame";
import JoinPage from "./pages/JoinPage";
import PlayerScreen from "./pages/PlayerScreen";
import SettingsPage from "./pages/SettingPage";
import StatsPage from "./pages/StatsPage";
import { loadSession, saveSession, clearSession } from "./lib/session";
import { apiGet } from "./lib/api";
import type { GameConfig, Avatar } from "./types";

type Screen =
  | "home"
  | "host-create"
  | "host-lobby"
  | "host-game"
  | "join"
  | "player"
  | "stats"
  | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [roomCode, setRoomCode] = useState("");
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("fox");

  // ── Restore session on mount ───────────────────────────────
  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    if (session.role === "host") {
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
      // specialtyTheme is already stored in localStorage via saveSession below
      // PlayerScreen reads it directly from localStorage
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────
  function handleRoomCreated(code: string, config: GameConfig) {
    setRoomCode(code);
    setGameConfig(config);
    setScreen("host-lobby");
  }

  // JoinPage appelle cette fonction avec specialtyTheme inclus
  function handlePlayerJoined(
    code: string,
    info: {
      playerId: string;
      sessionToken: string;
      pseudo: string;
      avatar: Avatar;
      specialtyTheme?: string | null;
    },
  ) {
    setRoomCode(code);
    setPlayerId(info.playerId);
    setSessionToken(info.sessionToken);
    setPseudo(info.pseudo);
    setAvatar(info.avatar);

    // ← C'est ici qu'on sauvegarde tout, y compris specialtyTheme
    saveSession({
      roomCode: code,
      playerId: info.playerId,
      sessionToken: info.sessionToken,
      role: "player",
      pseudo: info.pseudo,
      avatar: info.avatar,
      specialtyTheme: info.specialtyTheme ?? null,
    });

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

  if (screen === "settings") {
    return <SettingsPage onBack={() => setScreen("home")} />;
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
      onSettings={() => setScreen("settings")}
    />
  );
}
