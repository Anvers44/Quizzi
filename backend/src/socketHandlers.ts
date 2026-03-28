import type { Server, Socket } from "socket.io";
import { getRoom, saveRoom, deleteRoom } from "./redis/helpers";
import { ROOM_TTL_SECONDS } from "./redis/keys";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomStatePayload,
  PublicPlayer,
  QuestionPayload,
} from "./socket-events";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const socketMap = new Map<string, { roomCode: string; playerId: string }>();
const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Accès global io pour l'utiliser depuis la route answer
let _io: AppServer;
export function getIo() {
  return _io;
}

function toPublicPlayers(
  players: Record<
    string,
    {
      id: string;
      pseudo: string;
      avatar: any;
      score: number;
      connected: boolean;
    }
  >,
): PublicPlayer[] {
  return Object.values(players).map((p) => ({
    id: p.id,
    pseudo: p.pseudo,
    avatar: p.avatar,
    score: p.score,
    connected: p.connected,
  }));
}

function toRoomState(
  state: NonNullable<Awaited<ReturnType<typeof getRoom>>>,
): RoomStatePayload {
  return {
    roomCode: state.roomCode,
    status: state.status,
    players: toPublicPlayers(state.players),
    currentQuestionIndex: state.currentQuestionIndex,
  };
}

function scheduleRoomExpiry(io: AppServer, roomCode: string) {
  const existing = expiryTimers.get(roomCode);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    expiryTimers.delete(roomCode);
    const reveal = revealTimers.get(roomCode);
    if (reveal) {
      clearTimeout(reveal);
      revealTimers.delete(roomCode);
    }
    await deleteRoom(roomCode);
    io.to(roomCode).emit("room:closed");
    io.socketsLeave(roomCode);
    console.log(`[room] ${roomCode} expired — closed`);
  }, ROOM_TTL_SECONDS * 1000);
  expiryTimers.set(roomCode, timer);
}

export async function triggerReveal(io: AppServer, roomCode: string) {
  const existing = revealTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    revealTimers.delete(roomCode);
  }

  const state = await getRoom(roomCode);
  if (!state || state.status !== "playing") return;

  state.status = "revealing";
  await saveRoom(state);

  const question = state.questions[state.currentQuestionIndex];
  const scores = toPublicPlayers(state.players);

  // Construit la map playerId → choiceIndex pour cette question
  const playerAnswers: Record<string, number> = {};
  for (const player of Object.values(state.players)) {
    const ci = player.answers?.[question.id];
    if (ci !== undefined) playerAnswers[player.id] = ci;
  }

  io.to(roomCode).emit("question:reveal", {
    questionId: question.id,
    correctIndex: question.correctIndex,
    scores,
    playerAnswers,
  });
}

async function startQuestion(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  const question = state.questions[state.currentQuestionIndex];
  if (!question) return;

  state.status = "playing";
  state.questionStartedAt = Date.now();
  state.pausedAt = null;
  state.timeElapsedBeforePause = 0;
  await saveRoom(state);

  const payload: QuestionPayload = {
    id: question.id,
    text: question.text,
    choices: question.choices,
    timeLimit: question.timeLimit,
    index: state.currentQuestionIndex,
    total: state.questions.length,
    startedAt: state.questionStartedAt,
  };
  io.to(roomCode).emit("question:start", payload);

  const timer = setTimeout(
    () => triggerReveal(io, roomCode),
    question.timeLimit * 1000,
  );
  revealTimers.set(roomCode, timer);
}

async function finishGame(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  state.status = "finished";
  await saveRoom(state);
  io.to(roomCode).emit("game:finished", {
    scores: toPublicPlayers(state.players),
  });
}

// Vérifie si tous les joueurs connectés ont répondu → auto-reveal
export async function checkAllAnswered(
  io: AppServer,
  roomCode: string,
  questionId: string,
) {
  const state = await getRoom(roomCode);
  if (!state || state.status !== "playing") return;

  const connected = Object.values(state.players).filter((p) => p.connected);
  if (connected.length === 0) return;

  const allAnswered = connected.every((p) =>
    p.answeredQuestions.includes(questionId),
  );
  if (allAnswered) {
    console.log(`[game] all players answered in ${roomCode} — auto-reveal`);
    await triggerReveal(io, roomCode);
  }
}

export function registerSocketHandlers(io: AppServer) {
  _io = io;

  io.on("connection", (socket: AppSocket) => {
    socket.on("host:join", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) {
        socket.emit("error", { message: "Room introuvable" });
        return;
      }
      state.hostSocketId = socket.id;
      await saveRoom(state);
      socket.join(code);
      socket.emit("room:state", toRoomState(state));
      // Re-envoie la question en cours si le jeu tourne déjà
      if (
        (state.status === "playing" || state.status === "paused") &&
        state.questionStartedAt
      ) {
        const q = state.questions[state.currentQuestionIndex];
        socket.emit("question:start", {
          id: q.id,
          text: q.text,
          choices: q.choices,
          timeLimit: q.timeLimit,
          index: state.currentQuestionIndex,
          total: state.questions.length,
          startedAt: state.questionStartedAt,
        });
      }
      scheduleRoomExpiry(io, code);
    });

    socket.on("player:join", async ({ roomCode, playerId, sessionToken }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) {
        socket.emit("error", { message: "Room introuvable" });
        return;
      }
      const player = state.players[playerId];
      if (!player || player.sessionToken !== sessionToken) {
        socket.emit("error", { message: "Session invalide" });
        // Re-envoie la question en cours si le jeu tourne déjà
        if (
          (state.status === "playing" || state.status === "paused") &&
          state.questionStartedAt
        ) {
          const q = state.questions[state.currentQuestionIndex];
          socket.emit("question:start", {
            id: q.id,
            text: q.text,
            choices: q.choices,
            timeLimit: q.timeLimit,
            index: state.currentQuestionIndex,
            total: state.questions.length,
            startedAt: state.questionStartedAt,
          });
        }
        return;
      }
      const isReconnection = player.connected;
      player.connected = true;
      if (!player.answers) player.answers = {};
      await saveRoom(state);
      socketMap.set(socket.id, { roomCode: code, playerId });
      socket.join(code);
      socket.emit("room:state", toRoomState(state));
      if (isReconnection) {
        io.to(code).emit("player:reconnected", { playerId });
      } else {
        io.to(code).emit("player:joined", {
          id: player.id,
          pseudo: player.pseudo,
          avatar: player.avatar,
          score: player.score,
          connected: true,
        });
      }
    });

    socket.on("host:start", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "lobby") return;
      state.currentQuestionIndex = 0;
      await saveRoom(state);
      await startQuestion(io, code);
    });

    socket.on("host:next", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) return;
      if (state.status === "playing" || state.status === "paused") {
        await triggerReveal(io, code);
        return;
      }
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        await finishGame(io, code);
      } else {
        state.currentQuestionIndex = nextIndex;
        await saveRoom(state);
        await startQuestion(io, code);
      }
    });

    // ── Pause ──────────────────────────────────────────────
    socket.on("host:pause", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "playing") return;

      // Calcule le temps restant
      const elapsed =
        (Date.now() - (state.questionStartedAt ?? Date.now())) / 1000;
      const question = state.questions[state.currentQuestionIndex];
      const timeLeft = Math.max(0, question.timeLimit - elapsed);

      // Annule le timer auto-reveal
      const t = revealTimers.get(code);
      if (t) {
        clearTimeout(t);
        revealTimers.delete(code);
      }

      state.status = "paused";
      state.pausedAt = Date.now();
      state.timeElapsedBeforePause = elapsed;
      await saveRoom(state);

      io.to(code).emit("game:paused", { timeLeft: Math.ceil(timeLeft) });
      console.log(`[game] paused in ${code}, ${Math.ceil(timeLeft)}s left`);
    });

    // ── Resume ─────────────────────────────────────────────
    socket.on("host:resume", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "paused") return;

      const question = state.questions[state.currentQuestionIndex];
      const timeLeft = Math.max(
        0,
        question.timeLimit - state.timeElapsedBeforePause,
      );

      // Recalcule un startedAt fictif pour que les clients recalculent correctement
      const newStartedAt = Date.now() - state.timeElapsedBeforePause * 1000;

      state.status = "playing";
      state.questionStartedAt = newStartedAt;
      state.pausedAt = null;
      await saveRoom(state);

      // Relance le timer auto-reveal
      const timer = setTimeout(() => triggerReveal(io, code), timeLeft * 1000);
      revealTimers.set(code, timer);

      io.to(code).emit("game:resumed", { startedAt: newStartedAt });
      console.log(`[game] resumed in ${code}, ${Math.ceil(timeLeft)}s left`);
    });

    // ── Stop (termine immédiatement) ───────────────────────
    socket.on("host:stop", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const t = revealTimers.get(code);
      if (t) {
        clearTimeout(t);
        revealTimers.delete(code);
      }
      await finishGame(io, code);
      console.log(`[game] stopped by host in ${code}`);
    });

    socket.on("host:leave", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const t = revealTimers.get(code);
      if (t) {
        clearTimeout(t);
        revealTimers.delete(code);
      }
      const e = expiryTimers.get(code);
      if (e) {
        clearTimeout(e);
        expiryTimers.delete(code);
      }
      await deleteRoom(code);
      io.to(code).emit("room:closed");
      io.socketsLeave(code);
    });

    socket.on("player:leave", async ({ roomCode, playerId, sessionToken }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) return;
      const player = state.players[playerId];
      if (!player || player.sessionToken !== sessionToken) return;
      delete state.players[playerId];
      await saveRoom(state);
      socketMap.delete(socket.id);
      socket.leave(code);
      io.to(code).emit("player:kicked", { playerId });
    });

    socket.on("disconnect", async () => {
      const entry = socketMap.get(socket.id);
      socketMap.delete(socket.id);
      if (!entry) return;
      const { roomCode, playerId } = entry;
      const state = await getRoom(roomCode);
      if (!state) return;
      const player = state.players[playerId];
      if (!player) return;
      player.connected = false;
      await saveRoom(state);
      io.to(roomCode).emit("player:disconnected", { playerId });
    });
  });
}
