import { useEffect, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import type {
  RoomStatePayload,
  PublicPlayer,
  QuestionPayload,
  RevealPayload,
  RoundEndPayload,
  FinishedPayload,
  PowerEffectPayload,
  Team,
} from "../socket-events";
import type { TeamId, PowerType } from "../types";

interface UseRoomOptions {
  role: "host" | "player";
  roomCode: string;
  playerId?: string;
  sessionToken?: string;
}

export interface RoomHookState {
  state: RoomStatePayload | null;
  connected: boolean;
  error: string;
  roomClosed: boolean;
  kicked: boolean;
  question: QuestionPayload | null;
  reveal: RevealPayload | null;
  roundEnd: RoundEndPayload | null;
  finished: FinishedPayload | null;
  paused: boolean;
  pausedTimeLeft: number;
  liveAnswers: Record<string, number>;
  myPower: PowerType | null;
  powerEffect: PowerEffectPayload | null;
  powerBlocked: { byShield: boolean; mirrorSent: boolean } | null;
  teams: Record<TeamId, Team>;
  leave: () => void;
  startGame: () => void;
  nextQuestion: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  stopGame: () => void;
  usePower: (targetPlayerId: string) => void;
  clearPowerEffect: () => void;
}

export function useRoom({
  role,
  roomCode,
  playerId,
  sessionToken,
}: UseRoomOptions): RoomHookState {
  const [state, setState] = useState<RoomStatePayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [roomClosed, setRoomClosed] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [roundEnd, setRoundEnd] = useState<RoundEndPayload | null>(null);
  const [finished, setFinished] = useState<FinishedPayload | null>(null);
  const [paused, setPaused] = useState(false);
  const [pausedTimeLeft, setPausedTimeLeft] = useState(0);
  const [liveAnswers, setLiveAnswers] = useState<Record<string, number>>({});
  const [myPower, setMyPower] = useState<PowerType | null>(null);
  const [powerEffect, setPowerEffect] = useState<PowerEffectPayload | null>(
    null,
  );
  const [powerBlocked, setPowerBlocked] = useState<{
    byShield: boolean;
    mirrorSent: boolean;
  } | null>(null);
  const [teams, setTeams] = useState<Record<TeamId, Team>>({
    red: { id: "red", name: "Équipe Rouge", score: 0 },
    blue: { id: "blue", name: "Équipe Bleue", score: 0 },
  });

  const leave = useCallback(() => {
    const s = getSocket();
    if (role === "host") s.emit("host:leave", { roomCode });
    else if (playerId && sessionToken)
      s.emit("player:leave", { roomCode, playerId, sessionToken });
  }, [role, roomCode, playerId, sessionToken]);

  const startGame = useCallback(
    () => getSocket().emit("host:start", { roomCode }),
    [roomCode],
  );
  const nextQuestion = useCallback(
    () => getSocket().emit("host:next", { roomCode }),
    [roomCode],
  );
  const pauseGame = useCallback(
    () => getSocket().emit("host:pause", { roomCode }),
    [roomCode],
  );
  const resumeGame = useCallback(
    () => getSocket().emit("host:resume", { roomCode }),
    [roomCode],
  );
  const stopGame = useCallback(
    () => getSocket().emit("host:stop", { roomCode }),
    [roomCode],
  );
  const clearPowerEffect = useCallback(() => setPowerEffect(null), []);

  const usePower = useCallback(
    (targetPlayerId: string) => {
      if (!playerId || !sessionToken) return;
      getSocket().emit("player:use_power", {
        roomCode,
        playerId,
        sessionToken,
        targetPlayerId,
      });
      setMyPower(null);
    },
    [roomCode, playerId, sessionToken],
  );

  useEffect(() => {
    const socket = getSocket();

    function joinRoom() {
      if (role === "host") socket.emit("host:join", { roomCode });
      else if (playerId && sessionToken)
        socket.emit("player:join", { roomCode, playerId, sessionToken });
    }

    const onConnect = () => {
      setConnected(true);
      setError("");
      joinRoom();
    };
    const onDisconnect = () => setConnected(false);

    const onRoomState = (p: RoomStatePayload) => {
      setState(p);
      setTeams(p.teams);
      if (p.status === "paused") setPaused(true);
    };

    const onPlayerJoined = (player: PublicPlayer) => {
      setState((prev) => {
        if (!prev || prev.players.find((p) => p.id === player.id)) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
    };

    const onPlayerDisconnected = ({ playerId: pid }: { playerId: string }) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.id === pid ? { ...p, connected: false } : p,
              ),
            }
          : prev,
      );
    };

    const onPlayerReconnected = ({ playerId: pid }: { playerId: string }) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.id === pid ? { ...p, connected: true } : p,
              ),
            }
          : prev,
      );
    };

    const onPlayerAnswered = ({
      playerId: pid,
      choiceIndex,
    }: {
      playerId: string;
      choiceIndex: number;
    }) => {
      setLiveAnswers((prev) => ({ ...prev, [pid]: choiceIndex }));
    };

    const onRoomClosed = () => setRoomClosed(true);
    const onPlayerKicked = ({ playerId: pid }: { playerId: string }) => {
      if (pid === playerId) setKicked(true);
      else
        setState((prev) =>
          prev
            ? { ...prev, players: prev.players.filter((p) => p.id !== pid) }
            : prev,
        );
    };

    const onQuestionStart = (payload: QuestionPayload) => {
      setQuestion(payload);
      setReveal(null);
      setRoundEnd(null);
      setPaused(false);
      setLiveAnswers({});
      setState((prev) =>
        prev
          ? { ...prev, status: "playing", currentQuestionIndex: payload.index }
          : prev,
      );
    };

    const onQuestionReveal = (payload: RevealPayload) => {
      setReveal(payload);
      setTeams(payload.teams);
      setState((prev) =>
        prev
          ? {
              ...prev,
              status: "revealing",
              players: payload.scores,
              teams: payload.teams,
            }
          : prev,
      );
    };

    const onRoundEnd = (payload: RoundEndPayload) => {
      setRoundEnd(payload);
      setTeams(payload.teams);
      setState((prev) =>
        prev
          ? {
              ...prev,
              status: "round_end",
              players: payload.scores,
              teams: payload.teams,
            }
          : prev,
      );
    };

    const onGamePaused = ({ timeLeft }: { timeLeft: number }) => {
      setPaused(true);
      setPausedTimeLeft(timeLeft);
      setState((prev) => (prev ? { ...prev, status: "paused" } : prev));
    };
    const onGameResumed = ({ startedAt }: { startedAt: number }) => {
      setPaused(false);
      setQuestion((prev) => (prev ? { ...prev, startedAt } : prev));
      setState((prev) => (prev ? { ...prev, status: "playing" } : prev));
    };

    const onGameFinished = (payload: FinishedPayload) => {
      setFinished(payload);
      if (payload.teams) setTeams(payload.teams);
      setState((prev) =>
        prev ? { ...prev, status: "finished", players: payload.scores } : prev,
      );
    };

    const onTeamUpdate = ({ teams: t }: { teams: Record<TeamId, Team> }) => {
      setTeams(t);
    };

    const onPowerAssigned = ({ power }: { power: PowerType }) => {
      setMyPower(power);
    };

    const onPowerEffect = (payload: PowerEffectPayload) => {
      // Only apply if this player is the target
      if (payload.targetPlayerId === playerId) {
        setPowerEffect(payload);
        setTimeout(() => setPowerEffect(null), 6500);
      }
    };

    const onPowerBlocked = (d: { byShield: boolean; mirrorSent: boolean }) => {
      setPowerBlocked(d);
      setTimeout(() => setPowerBlocked(null), 3000);
    };

    const onError = ({ message }: { message: string }) => setError(message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onRoomState);
    socket.on("player:joined", onPlayerJoined);
    socket.on("player:disconnected", onPlayerDisconnected);
    socket.on("player:reconnected", onPlayerReconnected);
    socket.on("player:answered", onPlayerAnswered);
    socket.on("room:closed", onRoomClosed);
    socket.on("player:kicked", onPlayerKicked);
    socket.on("question:start", onQuestionStart);
    socket.on("question:reveal", onQuestionReveal);
    socket.on("game:round_end", onRoundEnd);
    socket.on("game:paused", onGamePaused);
    socket.on("game:resumed", onGameResumed);
    socket.on("game:finished", onGameFinished);
    socket.on("team:update", onTeamUpdate);
    socket.on("power:assigned", onPowerAssigned);
    socket.on("power:effect", onPowerEffect);
    socket.on("power:blocked", onPowerBlocked);
    socket.on("error", onError);

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    } else socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoomState);
      socket.off("player:joined", onPlayerJoined);
      socket.off("player:disconnected", onPlayerDisconnected);
      socket.off("player:reconnected", onPlayerReconnected);
      socket.off("player:answered", onPlayerAnswered);
      socket.off("room:closed", onRoomClosed);
      socket.off("player:kicked", onPlayerKicked);
      socket.off("question:start", onQuestionStart);
      socket.off("question:reveal", onQuestionReveal);
      socket.off("game:round_end", onRoundEnd);
      socket.off("game:paused", onGamePaused);
      socket.off("game:resumed", onGameResumed);
      socket.off("game:finished", onGameFinished);
      socket.off("team:update", onTeamUpdate);
      socket.off("power:assigned", onPowerAssigned);
      socket.off("power:effect", onPowerEffect);
      socket.off("power:blocked", onPowerBlocked);
      socket.off("error", onError);
    };
  }, [role, roomCode, playerId, sessionToken]);

  return {
    state,
    connected,
    error,
    roomClosed,
    kicked,
    question,
    reveal,
    roundEnd,
    finished,
    paused,
    pausedTimeLeft,
    liveAnswers,
    myPower,
    powerEffect,
    powerBlocked,
    teams,
    leave,
    startGame,
    nextQuestion,
    pauseGame,
    resumeGame,
    stopGame,
    usePower,
    clearPowerEffect,
  };
}
