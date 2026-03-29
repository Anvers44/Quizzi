import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import type {
  RoomStatePayload,
  PublicPlayer,
  QuestionPayload,
  RevealPayload,
  RoundEndPayload,
  FinishedPayload,
  PowerEffectPayload,
  TeamPublic,
} from "../socket-events";
import type { AttackPower, DefensePower, PowerType } from "../types";

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
  // Countdown: only fires at round start, counts down to 0
  countdown: number;
  liveAnswers: Record<string, true>;
  attackPower: AttackPower | null;
  defensePower: DefensePower | null;
  attackUsed: boolean;
  defenseUsed: boolean;
  powerEffect: PowerEffectPayload | null;
  powerBlocked: { byShield: boolean; mirrorSent: boolean } | null;
  teams: Record<string, TeamPublic>;
  leave: () => void;
  startGame: () => void;
  nextQuestion: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  stopGame: () => void;
  useAttack: (targetPlayerId: string) => void;
  useDefense: () => void;
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
  const [countdown, setCountdown] = useState(0);
  const [liveAnswers, setLiveAnswers] = useState<Record<string, true>>({});
  const [attackPower, setAttackPower] = useState<AttackPower | null>(null);
  const [defensePower, setDefensePower] = useState<DefensePower | null>(null);
  const [attackUsed, setAttackUsed] = useState(false);
  const [defenseUsed, setDefenseUsed] = useState(false);
  const [powerEffect, setPowerEffect] = useState<PowerEffectPayload | null>(
    null,
  );
  const [powerBlocked, setPowerBlocked] = useState<{
    byShield: boolean;
    mirrorSent: boolean;
  } | null>(null);
  const [teams, setTeams] = useState<Record<string, TeamPublic>>({});
  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown ticker — authoritative server timestamp
  function startCountdown(serverStartedAt: number) {
    if (cdTimer.current) {
      clearInterval(cdTimer.current);
      cdTimer.current = null;
    }
    const tick = () => {
      const remaining = Math.ceil((serverStartedAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdown(0);
        if (cdTimer.current) {
          clearInterval(cdTimer.current);
          cdTimer.current = null;
        }
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    cdTimer.current = setInterval(tick, 100); // 100ms for precision
  }

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

  const useAttack = useCallback(
    (targetPlayerId: string) => {
      if (!playerId || !sessionToken) return;
      getSocket().emit("player:use_attack", {
        roomCode,
        playerId,
        sessionToken,
        targetPlayerId,
      });
      setAttackUsed(true);
    },
    [roomCode, playerId, sessionToken],
  );

  const useDefense = useCallback(() => {
    if (!playerId || !sessionToken) return;
    getSocket().emit("player:use_defense", {
      roomCode,
      playerId,
      sessionToken,
    });
    setDefenseUsed(true);
  }, [roomCode, playerId, sessionToken]);

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
      setState((prev) =>
        prev && !prev.players.find((p) => p.id === player.id)
          ? { ...prev, players: [...prev.players, player] }
          : prev,
      );
    };
    const onPlayerDisc = ({ playerId: pid }: { playerId: string }) => {
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
    const onPlayerRecon = ({ playerId: pid }: { playerId: string }) => {
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
    const onPlayerAnswered = ({ playerId: pid }: { playerId: string }) => {
      setLiveAnswers((prev) => ({ ...prev, [pid]: true }));
      setState((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.id === pid ? { ...p, hasAnswered: true } : p,
              ),
            }
          : prev,
      );
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

      // Countdown only at round start
      if (payload.isRoundStart) {
        startCountdown(payload.startedAt);
      } else {
        setCountdown(0);
      }
    };

    const onReveal = (payload: RevealPayload) => {
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
    const onPaused = ({ timeLeft }: { timeLeft: number }) => {
      setPaused(true);
      setPausedTimeLeft(timeLeft);
      setState((prev) => (prev ? { ...prev, status: "paused" } : prev));
      if (cdTimer.current) {
        clearInterval(cdTimer.current);
        cdTimer.current = null;
      }
      setCountdown(0);
    };
    const onResumed = ({ startedAt }: { startedAt: number }) => {
      setPaused(false);
      setQuestion((prev) => (prev ? { ...prev, startedAt } : prev));
      setState((prev) => (prev ? { ...prev, status: "playing" } : prev));
    };
    const onFinished = (payload: FinishedPayload) => {
      setFinished(payload);
      if (payload.teams) setTeams(payload.teams);
      setState((prev) =>
        prev ? { ...prev, status: "finished", players: payload.scores } : prev,
      );
    };
    const onTeamUpdate = ({
      teams: t,
    }: {
      teams: Record<string, TeamPublic>;
    }) => setTeams(t);

    const onPowersAssigned = ({
      attackPower: ap,
      defensePower: dp,
    }: {
      attackPower: AttackPower;
      defensePower: DefensePower;
    }) => {
      setAttackPower(ap);
      setDefensePower(dp);
      setAttackUsed(false);
      setDefenseUsed(false);
    };
    const onPowerEffect = (payload: PowerEffectPayload) => {
      // Show to target AND to everyone (so they see the notification)
      setPowerEffect(payload);
      setTimeout(() => setPowerEffect(null), 4000);
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
    socket.on("player:disconnected", onPlayerDisc);
    socket.on("player:reconnected", onPlayerRecon);
    socket.on("player:answered", onPlayerAnswered);
    socket.on("room:closed", onRoomClosed);
    socket.on("player:kicked", onPlayerKicked);
    socket.on("question:start", onQuestionStart);
    socket.on("question:reveal", onReveal);
    socket.on("game:round_end", onRoundEnd);
    socket.on("game:paused", onPaused);
    socket.on("game:resumed", onResumed);
    socket.on("game:finished", onFinished);
    socket.on("team:update", onTeamUpdate);
    socket.on("powers:assigned", onPowersAssigned);
    socket.on("power:effect", onPowerEffect);
    socket.on("power:blocked", onPowerBlocked);
    socket.on("error", onError);

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    } else socket.connect();

    return () => {
      if (cdTimer.current) clearInterval(cdTimer.current);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoomState);
      socket.off("player:joined", onPlayerJoined);
      socket.off("player:disconnected", onPlayerDisc);
      socket.off("player:reconnected", onPlayerRecon);
      socket.off("player:answered", onPlayerAnswered);
      socket.off("room:closed", onRoomClosed);
      socket.off("player:kicked", onPlayerKicked);
      socket.off("question:start", onQuestionStart);
      socket.off("question:reveal", onReveal);
      socket.off("game:round_end", onRoundEnd);
      socket.off("game:paused", onPaused);
      socket.off("game:resumed", onResumed);
      socket.off("game:finished", onFinished);
      socket.off("team:update", onTeamUpdate);
      socket.off("powers:assigned", onPowersAssigned);
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
    countdown,
    liveAnswers,
    attackPower,
    defensePower,
    attackUsed,
    defenseUsed,
    powerEffect,
    powerBlocked,
    teams,
    leave,
    startGame,
    nextQuestion,
    pauseGame,
    resumeGame,
    stopGame,
    useAttack,
    useDefense,
    clearPowerEffect,
  };
}
