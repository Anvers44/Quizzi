import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import type {
  RoomStatePayload,
  PublicPlayer,
  QuestionPayload,
  RevealPayload,
  FinishedPayload,
} from "../socket-events";

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
  finished: FinishedPayload | null;
  paused: boolean;
  pausedTimeLeft: number;
  liveAnswers: Record<string, number>;
  leave: () => void;
  startGame: () => void;
  nextQuestion: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  stopGame: () => void;
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
  const [finished, setFinished] = useState<FinishedPayload | null>(null);
  const [paused, setPaused] = useState(false);
  const [pausedTimeLeft, setPausedTimeLeft] = useState(0);
  const [liveAnswers, setLiveAnswers] = useState<Record<string, number>>({});

  // FIX: ref pour éviter le double-join si socket déjà connecté + event 'connect' déclenché
  const joinedRef = useRef(false);

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
  const stopGame = useCallback(() => {
    if (!roomCode) return;
    getSocket().emit("host:stop", { roomCode });
  }, [roomCode]);

  useEffect(() => {
    const socket = getSocket();
    joinedRef.current = false; // reset à chaque montage

    function joinRoom() {
      if (joinedRef.current) return; // évite le double-join
      joinedRef.current = true;
      if (role === "host") {
        socket.emit("host:join", { roomCode });
      } else if (playerId && sessionToken) {
        socket.emit("player:join", { roomCode, playerId, sessionToken });
      }
    }

    function onConnect() {
      setConnected(true);
      setError("");
      joinRoom();
    }

    function onDisconnect() {
      setConnected(false);
      joinedRef.current = false; // permet un re-join après reconnexion
    }

    function onRoomState(p: RoomStatePayload) {
      setState(p);
      if (p.status === "paused") setPaused(true);
    }

    function onPlayerJoined(player: PublicPlayer) {
      setState((prev) => {
        if (!prev) return prev;
        if (prev.players.find((p) => p.id === player.id)) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
    }

    function onPlayerDisconnected({ playerId: pid }: { playerId: string }) {
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
    }

    function onPlayerReconnected({ playerId: pid }: { playerId: string }) {
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
    }

    function onPlayerAnswered({
      playerId: pid,
      choiceIndex,
    }: {
      playerId: string;
      choiceIndex: number;
    }) {
      setLiveAnswers((prev) => ({ ...prev, [pid]: choiceIndex }));
    }

    function onRoomClosed() {
      setRoomClosed(true);
    }

    function onPlayerKicked({ playerId: pid }: { playerId: string }) {
      if (pid === playerId) setKicked(true);
      else
        setState((prev) =>
          prev
            ? { ...prev, players: prev.players.filter((p) => p.id !== pid) }
            : prev,
        );
    }

    function onQuestionStart(payload: QuestionPayload) {
      setQuestion(payload);
      setReveal(null);
      setPaused(false);
      setLiveAnswers({});
      setState((prev) =>
        prev
          ? { ...prev, status: "playing", currentQuestionIndex: payload.index }
          : prev,
      );
    }

    function onQuestionReveal(payload: RevealPayload) {
      setReveal(payload);
      setPaused(false);
      setState((prev) =>
        prev ? { ...prev, status: "revealing", players: payload.scores } : prev,
      );
    }

    function onGamePaused({ timeLeft }: { timeLeft: number }) {
      setPaused(true);
      setPausedTimeLeft(timeLeft);
      setState((prev) => (prev ? { ...prev, status: "paused" } : prev));
    }

    function onGameResumed({ startedAt }: { startedAt: number }) {
      setPaused(false);
      setQuestion((prev) => (prev ? { ...prev, startedAt } : prev));
      setState((prev) => (prev ? { ...prev, status: "playing" } : prev));
    }

    function onGameFinished(payload: FinishedPayload) {
      setFinished(payload);
      setState((prev) =>
        prev ? { ...prev, status: "finished", players: payload.scores } : prev,
      );
    }

    function onError({ message }: { message: string }) {
      setError(message);
    }

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
    socket.on("game:paused", onGamePaused);
    socket.on("game:resumed", onGameResumed);
    socket.on("game:finished", onGameFinished);
    socket.on("error", onError);

    // FIX principal : join immédiat si déjà connecté, sinon on attend 'connect'
    if (socket.connected) {
      setConnected(true);
      joinRoom();
    } else {
      socket.connect();
    }

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
      socket.off("game:paused", onGamePaused);
      socket.off("game:resumed", onGameResumed);
      socket.off("game:finished", onGameFinished);
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
    finished,
    paused,
    pausedTimeLeft,
    liveAnswers,
    leave,
    startGame,
    nextQuestion,
    pauseGame,
    resumeGame,
    stopGame,
  };
}
