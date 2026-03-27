import type { Server, Socket } from "socket.io";
import { getRoom, saveRoom, deleteRoom } from "./redis/helpers";
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

async function startQuestion(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  const question = state.questions[state.currentQuestionIndex];
  if (!question) return;
  state.status = "playing";
  state.questionStartedAt = Date.now();
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
    () => revealQuestion(io, roomCode),
    question.timeLimit * 1000,
  );
  revealTimers.set(roomCode, timer);
}

async function revealQuestion(io: AppServer, roomCode: string) {
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
  io.to(roomCode).emit("question:reveal", {
    questionId: question.id,
    correctIndex: question.correctIndex,
    scores,
  });
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

export function registerSocketHandlers(io: AppServer) {
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
        return;
      }
      const isReconnection = player.connected;
      player.connected = true;
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
      if (state.status === "playing") {
        await revealQuestion(io, code);
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

    socket.on("host:leave", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const timer = revealTimers.get(code);
      if (timer) {
        clearTimeout(timer);
        revealTimers.delete(code);
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
