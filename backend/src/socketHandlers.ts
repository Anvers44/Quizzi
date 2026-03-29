import type { Server, Socket } from "socket.io";
import { getRoom, saveRoom, deleteRoom } from "./redis/helpers";
import { ROOM_TTL_SECONDS } from "./redis/keys";
import { ATTACK_POWERS, DEFENSE_POWERS } from "./types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomStatePayload,
  PublicPlayer,
  QuestionPayload,
  RoundEndPayload,
} from "./socket-events";
import type {
  GameState,
  Player,
  PowerType,
  AttackPower,
  DefensePower,
} from "./types";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const ROUND_COUNTDOWN_MS = 3000; // 3s countdown only at round start

const socketMap = new Map<string, { roomCode: string; playerId: string }>();
const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const emptyTimers = new Map<string, ReturnType<typeof setTimeout>>();

let _io: AppServer;
export function getIo() {
  return _io;
}

// ─── Public player ────────────────────────────────────────────
function toPublicPlayer(
  p: Player,
  eliminated: string[],
  currentQId?: string,
): PublicPlayer {
  return {
    id: p.id,
    pseudo: p.pseudo,
    avatar: p.avatar,
    score: p.score,
    connected: p.connected,
    teamId: p.teamId,
    attackPower: p.attackPower,
    defensePower: p.defensePower,
    attackUsed: p.attackUsed,
    defenseUsed: p.defenseUsed,
    isEliminated: eliminated.includes(p.id),
    activeEffectTypes: p.activeEffects.map((e) => e.type),
    hasAnswered: currentQId
      ? p.answeredQuestions.includes(currentQId)
      : undefined,
    specialtyTheme: p.specialtyTheme,
  };
}
function toPublicPlayers(
  state: GameState,
  currentQId?: string,
): PublicPlayer[] {
  return Object.values(state.players).map((p) =>
    toPublicPlayer(p, state.eliminatedPlayerIds, currentQId),
  );
}
function toRoomState(state: GameState): RoomStatePayload {
  const q = state.questions[state.currentQuestionIndex];
  return {
    roomCode: state.roomCode,
    status: state.status,
    config: state.config,
    players: toPublicPlayers(state, q?.id),
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

// ─── Empty room watcher ───────────────────────────────────────
function scheduleEmptyCheck(io: AppServer, roomCode: string) {
  const ex = emptyTimers.get(roomCode);
  if (ex) {
    clearTimeout(ex);
    emptyTimers.delete(roomCode);
  }
  const t = setTimeout(async () => {
    emptyTimers.delete(roomCode);
    const s = await getRoom(roomCode);
    if (!s) return;
    if (s.status === "finished" || s.status === "lobby") return;
    if (Object.values(s.players).some((p) => p.connected)) return;
    [revealTimers, expiryTimers].forEach((m) => {
      const t = m.get(roomCode);
      if (t) {
        clearTimeout(t);
        m.delete(roomCode);
      }
    });
    await deleteRoom(roomCode);
    io.to(roomCode).emit("room:closed");
    io.socketsLeave(roomCode);
  }, 10_000);
  emptyTimers.set(roomCode, t);
}
function cancelEmptyCheck(roomCode: string) {
  const t = emptyTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    emptyTimers.delete(roomCode);
  }
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
function isLastQOfRound(state: GameState) {
  return (
    (state.currentQuestionIndex + 1) % state.config.questionsPerRound === 0
  );
}
function isGameOver(state: GameState) {
  if (state.config.mode === "tournament")
    return getActivePlayers(state).length <= 1;
  return state.currentRound >= state.config.rounds;
}
function isFirstQOfRound(state: GameState) {
  return state.currentQuestionIndex % state.config.questionsPerRound === 0;
}

// ─── Powers: assign 1 attack + 1 defense per player ──────────
function assignPowers(state: GameState): void {
  if (!state.config.powersEnabled) return;
  for (const p of getActivePlayers(state)) {
    p.attackPower =
      ATTACK_POWERS[Math.floor(Math.random() * ATTACK_POWERS.length)];
    p.defensePower =
      DEFENSE_POWERS[Math.floor(Math.random() * DEFENSE_POWERS.length)];
    p.attackUsed = false;
    p.defenseUsed = false;
  }
}

function applyDefense(power: DefensePower, p: Player) {
  if (power === "shield") p.shieldActive = true;
  if (power === "double") p.doubleNextAnswer = true;
  if (power === "mirror") p.mirrorActive = true;
  if (power === "ghost") p.ghostActive = true;
}

function queueAttack(
  power: AttackPower,
  target: Player,
  fromId: string,
  fromAvatar: string,
  fromPseudo: string,
) {
  if (!target.pendingEffects) target.pendingEffects = [];
  target.pendingEffects.push({
    type: power,
    fromPlayerId: fromId,
    fromAvatar: fromAvatar as any,
    fromPseudo,
    duration: power === "freeze" ? 4000 : 6000,
    expiresAt: 0,
  });
}

function applyPendingEffects(state: GameState): void {
  const now = Date.now();
  for (const p of Object.values(state.players)) {
    if (!p.pendingEffects?.length) continue;
    for (const eff of p.pendingEffects) {
      eff.expiresAt = now + eff.duration;
      if (eff.type === "freeze") p.frozenUntil = eff.expiresAt;
      p.activeEffects.push({
        type: eff.type,
        expiresAt: eff.expiresAt,
        fromPlayerId: eff.fromPlayerId,
      });
    }
    p.pendingEffects = [];
  }
}

// ─── Emit powers ─────────────────────────────────────────────
async function emitPowers(io: AppServer, roomCode: string, state: GameState) {
  if (!state.config.powersEnabled) return;
  const sockets = await io.in(roomCode).fetchSockets();
  for (const p of Object.values(state.players)) {
    if (state.eliminatedPlayerIds.includes(p.id)) continue;
    if (!p.attackPower && !p.defensePower) continue;
    const entry = [...socketMap.entries()].find(
      ([, v]) => v.playerId === p.id && v.roomCode === roomCode,
    );
    if (!entry) continue;
    const s = sockets.find((sk) => sk.id === entry[0]);
    if (s && p.attackPower && p.defensePower) {
      s.emit("powers:assigned", {
        attackPower: p.attackPower,
        defensePower: p.defensePower,
      });
    }
  }
}

// ─── Perfect bonus ────────────────────────────────────────────
const PERFECT_BONUS = 500;
function computePerfectBonuses(state: GameState): Record<string, number> {
  const bonuses: Record<string, number> = {};
  for (const p of Object.values(state.players)) {
    if (state.eliminatedPlayerIds.includes(p.id)) continue;
    if ((p.roundCorrectCount || 0) >= state.config.questionsPerRound) {
      bonuses[p.id] = PERFECT_BONUS;
      p.score += PERFECT_BONUS;
      if (p.teamId && state.teams[p.teamId])
        state.teams[p.teamId].score += PERFECT_BONUS;
    }
    p.roundCorrectCount = 0;
  }
  return bonuses;
}

// ─── Start question ───────────────────────────────────────────
// Countdown ONLY happens at the first question of each round.
// We delay the actual question start by ROUND_COUNTDOWN_MS in that case.
async function startQuestion(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  const q = state.questions[state.currentQuestionIndex];
  if (!q) {
    await finishGame(io, roomCode);
    return;
  }

  const isRoundStart = isFirstQOfRound(state);
  const delay = isRoundStart ? ROUND_COUNTDOWN_MS : 0;

  // questionStartedAt = when the timer actually begins
  const questionStartAt = Date.now() + delay;

  state.status = "playing";
  state.questionStartedAt = questionStartAt;
  state.pausedAt = null;
  state.timeElapsedBeforePause = 0;
  state.lastQuestionPoints = {};
  state.lastQuestionTimes = {};

  // Apply pending effects from previous question
  applyPendingEffects(state);

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
    startedAt: questionStartAt,
    isRoundStart,
    round: state.currentRound,
    totalRounds: state.config.rounds,
    imageUrl: q.imageUrl,
    difficulty: q.difficulty,
    theme: q.theme,
  };
  io.to(roomCode).emit("question:start", payload);

  // Timer: delay (countdown) + timeLimit
  const totalMs = delay + q.timeLimit * 1000;
  const t = setTimeout(() => triggerReveal(io, roomCode), totalMs);
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
    timeTaken: state.lastQuestionTimes || {},
    questionTheme: q.theme,
  });
}

// ─── Round end ────────────────────────────────────────────────
async function endRound(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  state.status = "round_end";
  const perfectBonuses = computePerfectBonuses(state);
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
    perfectBonuses,
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
  let winnerTeamId: string | undefined;
  if (state.config.mode === "teams") {
    const sorted = Object.values(state.teams).sort((a, b) => b.score - a.score);
    winnerTeamId = sorted[0]?.id;
  }
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
    // Helper to build question payload for reconnect
    function makeQPayload(state: GameState): QuestionPayload | null {
      if (!state.questionStartedAt) return null;
      const q = state.questions[state.currentQuestionIndex];
      if (!q) return null;
      return {
        id: q.id,
        text: q.text,
        choices: q.choices,
        timeLimit: q.timeLimit,
        index: state.currentQuestionIndex,
        total: state.questions.length,
        startedAt: state.questionStartedAt,
        isRoundStart: false, // reconnect: no countdown
        round: state.currentRound,
        totalRounds: state.config.rounds,
        imageUrl: q.imageUrl,
        difficulty: q.difficulty,
        theme: q.theme,
      };
    }

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
      if (state.status === "playing" || state.status === "paused") {
        const qp = makeQPayload(state);
        if (qp) socket.emit("question:start", qp);
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
      if (!player.answerTimes) player.answerTimes = {};
      if (!player.pendingEffects) player.pendingEffects = [];
      if (typeof player.roundCorrectCount !== "number")
        player.roundCorrectCount = 0;
      // Migrate old power fields
      if (!("attackPower" in player)) {
        (player as any).attackPower = null;
        (player as any).defensePower = null;
        (player as any).attackUsed = false;
        (player as any).defenseUsed = false;
      }
      await saveRoom(state);
      socketMap.set(socket.id, { roomCode: code, playerId });
      socket.join(code);
      socket.emit("room:state", toRoomState(state));
      // Send current powers
      if (player.attackPower && player.defensePower)
        socket.emit("powers:assigned", {
          attackPower: player.attackPower,
          defensePower: player.defensePower,
        });
      cancelEmptyCheck(code);
      if (wasConnected) io.to(code).emit("player:reconnected", { playerId });
      else
        io.to(code).emit(
          "player:joined",
          toPublicPlayer(player, state.eliminatedPlayerIds),
        );
      if (state.status === "playing" || state.status === "paused") {
        const qp = makeQPayload(state);
        if (qp) socket.emit("question:start", qp);
        if (state.status === "paused") {
          const q = state.questions[state.currentQuestionIndex];
          const timeLeft = Math.max(
            0,
            q.timeLimit - state.timeElapsedBeforePause,
          );
          socket.emit("game:paused", { timeLeft: Math.ceil(timeLeft) });
        }
      }
    });

    socket.on("host:assign_teams", async ({ roomCode, assignments }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) return;
      for (const [pid, tid] of Object.entries(assignments))
        if (state.players[pid]) state.players[pid].teamId = tid;
      Object.values(state.teams).forEach((t) => (t.score = 0));
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
      Object.values(state.teams).forEach((t) => (t.score = 0));
      state.lastQuestionPoints = {};
      state.lastQuestionTimes = {};
      Object.values(state.players).forEach((p) => (p.roundCorrectCount = 0));
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

    // ── Attack power ───────────────────────────────────────────
    socket.on(
      "player:use_attack",
      async ({ roomCode, playerId, sessionToken, targetPlayerId }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        if (!state || state.status !== "revealing") return; // only between questions

        const attacker = state.players[playerId];
        if (!attacker || attacker.sessionToken !== sessionToken) return;
        if (!attacker.attackPower || attacker.attackUsed) return;
        if (state.eliminatedPlayerIds.includes(playerId)) return;

        const target = state.players[targetPlayerId];
        if (!target || state.eliminatedPlayerIds.includes(targetPlayerId))
          return;

        const power = attacker.attackPower;

        // Ghost: untargetable
        if (target.ghostActive) {
          socket.emit("power:blocked", { byShield: false, mirrorSent: false });
          return;
        }
        // Shield / Mirror
        if (target.shieldActive) {
          const mirrored = target.mirrorActive;
          target.shieldActive = false;
          target.mirrorActive = false;
          attacker.attackPower = null;
          attacker.attackUsed = true;
          if (mirrored) {
            queueAttack(
              power,
              attacker,
              attacker.id,
              attacker.avatar,
              attacker.pseudo,
            );
            // Notify the room
            io.to(code).emit("power:effect", {
              type: power,
              fromPlayerId: target.id,
              fromPseudo: target.pseudo,
              fromAvatar: target.avatar,
              targetPlayerId: playerId,
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

        // Apply attack (queued for next question)
        queueAttack(power, target, playerId, attacker.avatar, attacker.pseudo);
        attacker.attackPower = null;
        attacker.attackUsed = true;
        await saveRoom(state);

        // Broadcast to ALL so players see the notification with attacker avatar
        io.to(code).emit("power:effect", {
          type: power,
          fromPlayerId: playerId,
          fromPseudo: attacker.pseudo,
          fromAvatar: attacker.avatar,
          targetPlayerId,
          hiddenChoiceIndex: Math.floor(Math.random() * 4),
          newChoiceOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
        });
        io.to(code).emit("room:state", toRoomState(state));
      },
    );

    // ── Defense power ──────────────────────────────────────────
    socket.on(
      "player:use_defense",
      async ({ roomCode, playerId, sessionToken }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        if (!state || state.status !== "revealing") return;

        const player = state.players[playerId];
        if (!player || player.sessionToken !== sessionToken) return;
        if (!player.defensePower || player.defenseUsed) return;
        if (state.eliminatedPlayerIds.includes(playerId)) return;

        applyDefense(player.defensePower, player);
        player.defensePower = null;
        player.defenseUsed = true;
        await saveRoom(state);
        io.to(code).emit("room:state", toRoomState(state));
      },
    );

    socket.on("host:pause", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "playing") return;
      const now = Date.now();
      // Elapsed since question actually started (questionStartedAt already includes countdown delay)
      const elapsed = state.questionStartedAt
        ? Math.max(0, (now - state.questionStartedAt) / 1000)
        : 0;
      const q = state.questions[state.currentQuestionIndex];
      const timeLeft = Math.max(0, q.timeLimit - elapsed);
      const t = revealTimers.get(code);
      if (t) {
        clearTimeout(t);
        revealTimers.delete(code);
      }
      state.status = "paused";
      state.pausedAt = now;
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
      // New questionStartedAt: as if question started (timeElapsedBeforePause) seconds ago
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
      [revealTimers, expiryTimers, emptyTimers].forEach((m) => {
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
      const anyConnected = Object.values(state.players).some(
        (p) => p.connected,
      );
      if (
        !anyConnected &&
        state.status !== "lobby" &&
        state.status !== "finished"
      )
        scheduleEmptyCheck(io, roomCode);
    });
  });
}
