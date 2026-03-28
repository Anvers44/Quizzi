import type { Server, Socket } from "socket.io";
import { getRoom, saveRoom, deleteRoom } from "./redis/helpers";
import { ROOM_TTL_SECONDS } from "./redis/keys";
import { DEFENSE_POWERS, ALL_POWERS } from "./types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomStatePayload,
  PublicPlayer,
  QuestionPayload,
  RoundEndPayload,
} from "./socket-events";
import type { GameState, Player, PowerType, TeamId } from "./types";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const socketMap = new Map<string, { roomCode: string; playerId: string }>();
const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

let _io: AppServer;
export function getIo() {
  return _io;
}

// ─── Helpers ─────────────────────────────────────────────────
function toPublicPlayer(p: Player, eliminated: string[]): PublicPlayer {
  return {
    id: p.id,
    pseudo: p.pseudo,
    avatar: p.avatar,
    score: p.score,
    connected: p.connected,
    teamId: p.teamId,
    currentPower: p.currentPower,
    isEliminated: eliminated.includes(p.id),
    activeEffectTypes: p.activeEffects.map((e) => e.type),
  };
}
function toPublicPlayers(state: GameState): PublicPlayer[] {
  return Object.values(state.players).map((p) =>
    toPublicPlayer(p, state.eliminatedPlayerIds),
  );
}
function toRoomState(state: GameState): RoomStatePayload {
  return {
    roomCode: state.roomCode,
    status: state.status,
    config: state.config,
    players: toPublicPlayers(state),
    currentQuestionIndex: state.currentQuestionIndex,
    currentRound: state.currentRound,
    teams: state.teams,
    eliminatedPlayerIds: state.eliminatedPlayerIds,
  };
}
function getActivePlayers(state: GameState): Player[] {
  return Object.values(state.players).filter(
    (p) => p.connected && !state.eliminatedPlayerIds.includes(p.id),
  );
}

// ─── Expiry ───────────────────────────────────────────────────
function scheduleExpiry(io: AppServer, roomCode: string) {
  const ex = expiryTimers.get(roomCode);
  if (ex) clearTimeout(ex);
  const t = setTimeout(async () => {
    expiryTimers.delete(roomCode);
    const rv = revealTimers.get(roomCode);
    if (rv) {
      clearTimeout(rv);
      revealTimers.delete(roomCode);
    }
    await deleteRoom(roomCode);
    io.to(roomCode).emit("room:closed");
    io.socketsLeave(roomCode);
  }, ROOM_TTL_SECONDS * 1000);
  expiryTimers.set(roomCode, t);
}

// ─── Round helpers ────────────────────────────────────────────
function isLastQOfRound(state: GameState): boolean {
  return (
    (state.currentQuestionIndex + 1) % state.config.questionsPerRound === 0
  );
}
function isGameOver(state: GameState): boolean {
  if (state.config.mode === "tournament")
    return getActivePlayers(state).length <= 1;
  return state.currentRound >= state.config.rounds;
}

// ─── Powers ───────────────────────────────────────────────────
function assignPowers(state: GameState): void {
  if (!state.config.powersEnabled) return;
  for (const p of getActivePlayers(state)) {
    p.currentPower = ALL_POWERS[Math.floor(Math.random() * ALL_POWERS.length)];
    p.powerUsedThisRound = false;
  }
}
function applyDefense(power: PowerType, p: Player) {
  if (power === "shield") p.shieldActive = true;
  if (power === "double") p.doubleNextAnswer = true;
  if (power === "mirror") p.mirrorActive = true;
  if (power === "ghost") p.ghostActive = true;
}
function applyAttack(power: PowerType, target: Player, fromId: string) {
  const now = Date.now();
  const dur = power === "freeze" ? 4000 : 6000;
  if (power === "freeze") target.frozenUntil = now + dur;
  target.activeEffects.push({
    type: power,
    expiresAt: now + dur,
    fromPlayerId: fromId,
  });
}

// ─── Emit powers to each player socket ───────────────────────
async function emitPowers(io: AppServer, roomCode: string, state: GameState) {
  if (!state.config.powersEnabled) return;
  const sockets = await io.in(roomCode).fetchSockets();
  for (const p of Object.values(state.players)) {
    if (!p.currentPower || state.eliminatedPlayerIds.includes(p.id)) continue;
    const entry = [...socketMap.entries()].find(
      ([, v]) => v.playerId === p.id && v.roomCode === roomCode,
    );
    if (!entry) continue;
    const s = sockets.find((sk) => sk.id === entry[0]);
    s?.emit("power:assigned", { power: p.currentPower });
  }
}

// ─── Start question ───────────────────────────────────────────
async function startQuestion(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  const q = state.questions[state.currentQuestionIndex];
  if (!q) {
    await finishGame(io, roomCode);
    return;
  }

  state.status = "playing";
  state.questionStartedAt = Date.now();
  state.pausedAt = null;
  state.timeElapsedBeforePause = 0;
  state.lastQuestionPoints = {};

  const now = Date.now();
  for (const p of Object.values(state.players)) {
    p.activeEffects = p.activeEffects.filter((e) => e.expiresAt > now);
    p.ghostActive = false;
  }
  await saveRoom(state);

  const payload: QuestionPayload = {
    id: q.id,
    text: q.text,
    choices: q.choices,
    timeLimit: q.timeLimit,
    index: state.currentQuestionIndex,
    total: state.questions.length,
    startedAt: state.questionStartedAt!,
    round: state.currentRound,
    totalRounds: state.config.rounds,
    imageUrl: q.imageUrl,
    difficulty: q.difficulty,
  };
  io.to(roomCode).emit("question:start", payload);

  const t = setTimeout(() => triggerReveal(io, roomCode), q.timeLimit * 1000);
  revealTimers.set(roomCode, t);
}

// ─── Reveal ───────────────────────────────────────────────────
export async function triggerReveal(io: AppServer, roomCode: string) {
  const rv = revealTimers.get(roomCode);
  if (rv) {
    clearTimeout(rv);
    revealTimers.delete(roomCode);
  }
  const state = await getRoom(roomCode);
  if (!state || state.status !== "playing") return;
  state.status = "revealing";
  await saveRoom(state);

  const q = state.questions[state.currentQuestionIndex];
  const playerAnswers: Record<string, number> = {};
  for (const p of Object.values(state.players)) {
    const ci = p.answers?.[q.id];
    if (ci !== undefined) playerAnswers[p.id] = ci;
  }
  io.to(roomCode).emit("question:reveal", {
    questionId: q.id,
    correctIndex: q.correctIndex,
    scores: toPublicPlayers(state),
    playerAnswers,
    teams: state.teams,
    pointsEarned: state.lastQuestionPoints || {},
  });
}

// ─── Round end ────────────────────────────────────────────────
async function endRound(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  state.status = "round_end";
  let eliminatedPlayerId: string | undefined;
  let eliminatedPseudo: string | undefined;
  if (state.config.mode === "tournament") {
    const active = getActivePlayers(state);
    if (active.length > 1) {
      const loser = [...active].sort((a, b) => a.score - b.score)[0];
      state.eliminatedPlayerIds.push(loser.id);
      eliminatedPlayerId = loser.id;
      eliminatedPseudo = loser.pseudo;
    }
  }
  await saveRoom(state);
  io.to(roomCode).emit("game:round_end", {
    round: state.currentRound,
    totalRounds: state.config.rounds,
    scores: toPublicPlayers(state),
    teams: state.teams,
    eliminatedPlayerId,
    eliminatedPseudo,
  });
}

// ─── Finish ───────────────────────────────────────────────────
async function finishGame(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  state.status = "finished";
  await saveRoom(state);
  const scores = toPublicPlayers(state);
  const active = scores
    .filter((p) => !p.isEliminated)
    .sort((a, b) => b.score - a.score);
  const winnerId = active[0]?.id;
  let winnerTeamId: TeamId | undefined;
  if (state.config.mode === "teams")
    winnerTeamId =
      state.teams.red.score >= state.teams.blue.score ? "red" : "blue";
  io.to(roomCode).emit("game:finished", {
    scores,
    teams: state.teams,
    winnerId,
    winnerTeamId,
  });
}

// ─── Check all answered ───────────────────────────────────────
export async function checkAllAnswered(
  io: AppServer,
  roomCode: string,
  questionId: string,
) {
  const state = await getRoom(roomCode);
  if (!state || state.status !== "playing") return;
  const active = getActivePlayers(state);
  if (active.length === 0) return;
  if (active.every((p) => p.answeredQuestions.includes(questionId)))
    await triggerReveal(io, roomCode);
}

// ─── Register ─────────────────────────────────────────────────
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
      scheduleExpiry(io, code);
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
          round: state.currentRound,
          totalRounds: state.config.rounds,
          imageUrl: q.imageUrl,
          difficulty: q.difficulty,
        });
      }
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
      const wasConnected = player.connected;
      player.connected = true;
      if (!player.answers) player.answers = {};
      await saveRoom(state);
      socketMap.set(socket.id, { roomCode: code, playerId });
      socket.join(code);
      socket.emit("room:state", toRoomState(state));
      if (player.currentPower)
        socket.emit("power:assigned", { power: player.currentPower });
      if (wasConnected) io.to(code).emit("player:reconnected", { playerId });
      else
        io.to(code).emit(
          "player:joined",
          toPublicPlayer(player, state.eliminatedPlayerIds),
        );
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
          round: state.currentRound,
          totalRounds: state.config.rounds,
          imageUrl: q.imageUrl,
          difficulty: q.difficulty,
        });
      }
    });

    socket.on("host:assign_teams", async ({ roomCode, assignments }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) return;
      for (const [pid, tid] of Object.entries(assignments))
        if (state.players[pid]) state.players[pid].teamId = tid as TeamId;
      state.teams.red.score = 0;
      state.teams.blue.score = 0;
      await saveRoom(state);
      io.to(code).emit("room:state", toRoomState(state));
    });

    socket.on("host:start", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "lobby") return;
      state.currentQuestionIndex = 0;
      state.currentRound = 1;
      state.eliminatedPlayerIds = [];
      state.teams.red.score = 0;
      state.teams.blue.score = 0;
      state.lastQuestionPoints = {};
      assignPowers(state);
      await saveRoom(state);
      await emitPowers(io, code, state);
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
      if (state.status === "revealing") {
        if (isLastQOfRound(state)) {
          await endRound(io, code);
        } else {
          state.currentQuestionIndex++;
          await saveRoom(state);
          await startQuestion(io, code);
        }
        return;
      }
      if (state.status === "round_end") {
        if (isGameOver(state)) {
          await finishGame(io, code);
          return;
        }
        state.currentRound++;
        state.currentQuestionIndex++;
        assignPowers(state);
        await saveRoom(state);
        await emitPowers(io, code, state);
        await startQuestion(io, code);
      }
    });

    socket.on(
      "player:use_power",
      async ({ roomCode, playerId, sessionToken, targetPlayerId }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        if (!state || state.status !== "playing") return;
        const attacker = state.players[playerId];
        if (!attacker || attacker.sessionToken !== sessionToken) return;
        if (!attacker.currentPower || attacker.powerUsedThisRound) return;
        if (state.eliminatedPlayerIds.includes(playerId)) return;

        const power = attacker.currentPower;
        const isDefense = (DEFENSE_POWERS as readonly string[]).includes(power);

        if (isDefense) {
          applyDefense(power as PowerType, attacker);
          attacker.currentPower = null;
          attacker.powerUsedThisRound = true;
          await saveRoom(state);
          io.to(code).emit("room:state", toRoomState(state));
          return;
        }

        const target = state.players[targetPlayerId];
        if (!target || state.eliminatedPlayerIds.includes(targetPlayerId))
          return;
        if (target.ghostActive) {
          socket.emit("power:blocked", { byShield: false, mirrorSent: false });
          return;
        }

        if (target.shieldActive) {
          const mirrored = target.mirrorActive;
          target.shieldActive = false;
          target.mirrorActive = false;
          attacker.currentPower = null;
          attacker.powerUsedThisRound = true;
          if (mirrored) {
            applyAttack(power as PowerType, attacker, attacker.id);
            io.to(code).emit("power:effect", {
              type: power as PowerType,
              fromPlayerId: attacker.id,
              fromPseudo: attacker.pseudo,
              targetPlayerId: attacker.id,
              hiddenChoiceIndex: Math.floor(Math.random() * 4),
              newChoiceOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
            });
          }
          await saveRoom(state);
          socket.emit("power:blocked", {
            byShield: true,
            mirrorSent: mirrored,
          });
          return;
        }

        applyAttack(power as PowerType, target, playerId);
        attacker.currentPower = null;
        attacker.powerUsedThisRound = true;
        await saveRoom(state);
        io.to(code).emit("power:effect", {
          type: power as PowerType,
          fromPlayerId: playerId,
          fromPseudo: attacker.pseudo,
          targetPlayerId,
          hiddenChoiceIndex: Math.floor(Math.random() * 4),
          newChoiceOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
        });
        io.to(code).emit("room:state", toRoomState(state));
      },
    );

    socket.on("host:pause", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "playing") return;
      const elapsed =
        (Date.now() - (state.questionStartedAt ?? Date.now())) / 1000;
      const q = state.questions[state.currentQuestionIndex];
      const timeLeft = Math.max(0, q.timeLimit - elapsed);
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
    });

    socket.on("host:resume", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "paused") return;
      const q = state.questions[state.currentQuestionIndex];
      const timeLeft = Math.max(0, q.timeLimit - state.timeElapsedBeforePause);
      const newStartedAt = Date.now() - state.timeElapsedBeforePause * 1000;
      state.status = "playing";
      state.questionStartedAt = newStartedAt;
      state.pausedAt = null;
      await saveRoom(state);
      const t = setTimeout(() => triggerReveal(io, code), timeLeft * 1000);
      revealTimers.set(code, t);
      io.to(code).emit("game:resumed", { startedAt: newStartedAt });
    });

    socket.on("host:stop", async ({ roomCode }) => {
      const t = revealTimers.get(roomCode);
      if (t) {
        clearTimeout(t);
        revealTimers.delete(roomCode);
      }
      await finishGame(io, roomCode.toUpperCase());
    });

    socket.on("host:leave", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      [revealTimers, expiryTimers].forEach((m) => {
        const t = m.get(code);
        if (t) {
          clearTimeout(t);
          m.delete(code);
        }
      });
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
