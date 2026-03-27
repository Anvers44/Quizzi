import { useEffect, useState, useCallback } from "react";
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
  leave: () => void;
  startGame: () => void;
  nextQuestion: () => void;
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

  const leave = useCallback(() => {
    const socket = getSocket();
    if (role === "host") socket.emit("host:leave", { roomCode });
    else if (playerId && sessionToken)
      socket.emit("player:leave", { roomCode, playerId, sessionToken });
  }, [role, roomCode, playerId, sessionToken]);

  const startGame = useCallback(() => {
    getSocket().emit("host:start", { roomCode });
  }, [roomCode]);
  const nextQuestion = useCallback(() => {
    getSocket().emit("host:next", { roomCode });
  }, [roomCode]);

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      setError("");
      if (role === "host") socket.emit("host:join", { roomCode });
      else if (playerId && sessionToken)
        socket.emit("player:join", { roomCode, playerId, sessionToken });
    }

    function onDisconnect() {
      setConnected(false);
    }
    function onRoomState(payload: RoomStatePayload) {
      setState(payload);
    }
    function onPlayerJoined(player: PublicPlayer) {
      setState((prev) => {
        if (!prev) return prev;
        if (prev.players.find((p) => p.id === player.id)) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
    }
    function onPlayerDisconnected({ playerId: pid }: { playerId: string }) {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === pid ? { ...p, connected: false } : p,
          ),
        };
      });
    }
    function onPlayerReconnected({ playerId: pid }: { playerId: string }) {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === pid ? { ...p, connected: true } : p,
          ),
        };
      });
    }
    function onRoomClosed() {
      setRoomClosed(true);
    }
    function onPlayerKicked({ playerId: pid }: { playerId: string }) {
      if (pid === playerId) setKicked(true);
      else
        setState((prev) => {
          if (!prev) return prev;
          return { ...prev, players: prev.players.filter((p) => p.id !== pid) };
        });
    }
    function onQuestionStart(payload: QuestionPayload) {
      setQuestion(payload);
      setReveal(null);
      setState((prev) =>
        prev
          ? { ...prev, status: "playing", currentQuestionIndex: payload.index }
          : prev,
      );
    }
    function onQuestionReveal(payload: RevealPayload) {
      setReveal(payload);
      setState((prev) =>
        prev ? { ...prev, status: "revealing", players: payload.scores } : prev,
      );
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
    socket.on("room:closed", onRoomClosed);
    socket.on("player:kicked", onPlayerKicked);
    socket.on("question:start", onQuestionStart);
    socket.on("question:reveal", onQuestionReveal);
    socket.on("game:finished", onGameFinished);
    socket.on("error", onError);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoomState);
      socket.off("player:joined", onPlayerJoined);
      socket.off("player:disconnected", onPlayerDisconnected);
      socket.off("player:reconnected", onPlayerReconnected);
      socket.off("room:closed", onRoomClosed);
      socket.off("player:kicked", onPlayerKicked);
      socket.off("question:start", onQuestionStart);
      socket.off("question:reveal", onQuestionReveal);
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
    leave,
    startGame,
    nextQuestion,
  };
}
