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
  BluffInputPayload,
} from "./socket-events";
import type {
  GameState,
  Player,
  AttackPower,
  DefensePower,
  BluffOption,
} from "./types";
import { db } from "./db/client";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const ROUND_COUNTDOWN_MS = 3_000;
const BLUFF_INPUT_SECS = 45;
const BLUFF_VOTE_SECS = 30;
const BLUFF_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const socketMap = new Map<string, { roomCode: string; playerId: string }>();
const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const emptyTimers = new Map<string, ReturnType<typeof setTimeout>>();

let _io: AppServer;
export function getIo() {
  return _io;
}

// ─── Public helpers ───────────────────────────────────────────
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

// ─── Timers ───────────────────────────────────────────────────
function scheduleEmptyCheck(io: AppServer, roomCode: string) {
  const ex = emptyTimers.get(roomCode);
  if (ex) {
    clearTimeout(ex);
    emptyTimers.delete(roomCode);
  }
  const t = setTimeout(async () => {
    emptyTimers.delete(roomCode);
    const s = await getRoom(roomCode);
    if (!s || s.status === "finished" || s.status === "lobby") return;
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

// ─── Powers ───────────────────────────────────────────────────
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
    if (s && p.attackPower && p.defensePower)
      s.emit("powers:assigned", {
        attackPower: p.attackPower,
        defensePower: p.defensePower,
      });
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

// ═══════════════════════════════════════════════════════════════
// QUESTION FLOW
// ═══════════════════════════════════════════════════════════════

async function startQuestion(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  const q = state.questions[state.currentQuestionIndex];
  if (!q) {
    await finishGame(io, roomCode);
    return;
  }

  // Branch on question type
  if (q.type === "open" && state.config.bluffEnabled) {
    return startBluffInput(io, roomCode);
  }

  // ── Standard MCQ ──
  const isRoundStart = isFirstQOfRound(state);
  const delay = isRoundStart ? ROUND_COUNTDOWN_MS : 0;
  const questionStartAt = Date.now() + delay;

  state.status = "playing";
  state.questionStartedAt = questionStartAt;
  state.pausedAt = null;
  state.timeElapsedBeforePause = 0;
  state.lastQuestionPoints = {};
  state.lastQuestionTimes = {};
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
    audioUrl: q.audioUrl,
    videoUrl: q.videoUrl,
    difficulty: q.difficulty,
    theme: q.theme,
    questionType: q.type ?? "mcq",
  };
  io.to(roomCode).emit("question:start", payload);

  const totalMs = delay + q.timeLimit * 1000;
  const t = setTimeout(() => triggerReveal(io, roomCode), totalMs);
  revealTimers.set(roomCode, t);
}

// ─── MCQ reveal ───────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════
// BLUFF FLOW
// ═══════════════════════════════════════════════════════════════

async function startBluffInput(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state) return;
  const q = state.questions[state.currentQuestionIndex];
  if (!q) return;

  const isRoundStart = isFirstQOfRound(state);
  const delay = isRoundStart ? ROUND_COUNTDOWN_MS : 0;
  const startedAt = Date.now() + delay;

  state.status = "bluff_input";
  state.bluffSubmissions = {};
  state.bluffOptions = [];
  state.bluffVotes = {};
  state.bluffDeadline = startedAt + BLUFF_INPUT_SECS * 1000;
  state.questionStartedAt = startedAt;
  state.lastQuestionPoints = {};
  state.lastQuestionTimes = {};
  applyPendingEffects(state);
  await saveRoom(state);

  const payload: BluffInputPayload = {
    id: q.id,
    text: q.text,
    theme: q.theme,
    difficulty: q.difficulty,
    timeLimit: BLUFF_INPUT_SECS,
    startedAt,
    isRoundStart,
    round: state.currentRound,
    totalRounds: state.config.rounds,
    imageUrl: q.imageUrl,
  };
  io.to(roomCode).emit("bluff:input_start", payload);

  const totalMs = delay + BLUFF_INPUT_SECS * 1000;
  const t = setTimeout(() => startBluffVoting(io, roomCode), totalMs);
  revealTimers.set(roomCode, t);
}

async function startBluffVoting(io: AppServer, roomCode: string) {
  const rv = revealTimers.get(roomCode);
  if (rv) {
    clearTimeout(rv);
    revealTimers.delete(roomCode);
  }

  const state = await getRoom(roomCode);
  if (!state || state.status !== "bluff_input") return;
  const q = state.questions[state.currentQuestionIndex];

  // Build options: real answer + all fake submissions
  const items: Array<{ text: string; isReal: boolean; authorId?: string }> = [
    { text: q.correctAnswer ?? q.choices[q.correctIndex] ?? "?", isReal: true },
  ];

  for (const [pid, text] of Object.entries(state.bluffSubmissions ?? {})) {
    if (text.trim().length > 0) {
      items.push({ text: text.trim(), isReal: false, authorId: pid });
    }
  }

  // Shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const options: BluffOption[] = items
    .slice(0, BLUFF_LETTERS.length)
    .map((item, idx) => ({
      letter: BLUFF_LETTERS[idx],
      ...item,
    }));

  const startedAt = Date.now();
  state.status = "bluff_voting";
  state.bluffOptions = options;
  state.bluffVotes = {};
  state.bluffDeadline = startedAt + BLUFF_VOTE_SECS * 1000;
  await saveRoom(state);

  // Send options WITHOUT revealing isReal / authorId
  io.to(roomCode).emit("bluff:vote_start", {
    options: options.map(({ letter, text }) => ({ letter, text })),
    timeLimit: BLUFF_VOTE_SECS,
    startedAt,
    question: q.text,
  });

  const t = setTimeout(() => revealBluff(io, roomCode), BLUFF_VOTE_SECS * 1000);
  revealTimers.set(roomCode, t);
}

async function revealBluff(io: AppServer, roomCode: string) {
  const rv = revealTimers.get(roomCode);
  if (rv) {
    clearTimeout(rv);
    revealTimers.delete(roomCode);
  }

  const state = await getRoom(roomCode);
  if (!state || state.status !== "bluff_voting") return;
  const q = state.questions[state.currentQuestionIndex];
  const opts = state.bluffOptions ?? [];
  const votes = state.bluffVotes ?? {};

  // ── Scoring ──
  const pointsEarned: Record<string, number> = {};
  for (const [voterId, letter] of Object.entries(votes)) {
    const opt = opts.find((o) => o.letter === letter);
    if (!opt) continue;
    if (opt.isReal) {
      pointsEarned[voterId] = (pointsEarned[voterId] ?? 0) + 800;
    } else if (opt.authorId) {
      pointsEarned[opt.authorId] = (pointsEarned[opt.authorId] ?? 0) + 300;
    }
  }

  for (const [pid, pts] of Object.entries(pointsEarned)) {
    const p = state.players[pid];
    if (!p) continue;
    p.score = Math.max(0, p.score + pts);
    if (p.roundCorrectCount !== undefined) p.roundCorrectCount++;
    if (!p.answeredQuestions.includes(q.id)) p.answeredQuestions.push(q.id);
    if (state.config.mode === "teams" && p.teamId && state.teams[p.teamId])
      state.teams[p.teamId].score += pts;
  }

  state.status = "revealing";
  state.lastQuestionPoints = pointsEarned;
  await saveRoom(state);

  const authorPseudos: Record<string, string> = {};
  for (const [id, p] of Object.entries(state.players))
    authorPseudos[id] = p.pseudo;

  io.to(roomCode).emit("bluff:reveal", {
    questionId: q.id,
    question: q.text,
    correctAnswer: q.correctAnswer ?? "",
    options: opts,
    votes,
    pointsEarned,
    scores: toPublicPlayers(state),
    teams: state.teams,
    authorPseudos,
  });
}

export async function checkAllBluffSubmitted(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state || state.status !== "bluff_input") return;
  const active = getActivePlayers(state);
  if (!active.length) return;
  const submittedCount = Object.keys(state.bluffSubmissions ?? {}).length;
  if (submittedCount >= active.length) await startBluffVoting(io, roomCode);
}

export async function checkAllBluffVoted(io: AppServer, roomCode: string) {
  const state = await getRoom(roomCode);
  if (!state || state.status !== "bluff_voting") return;
  const active = getActivePlayers(state);
  if (!active.length) return;
  const votedCount = Object.keys(state.bluffVotes ?? {}).length;
  if (votedCount >= active.length) await revealBluff(io, roomCode);
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

// ─── Finish + DB persist ──────────────────────────────────────
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

  // ── Persist to DB for logged-in users ──
  try {
    const loggedIn = Object.values(state.players).filter((p) => p.userId);
    if (!loggedIn.length) return;

    const gr = await db.query(
      "INSERT INTO game_results (room_code, mode, player_count) VALUES ($1,$2,$3) RETURNING id",
      [roomCode, state.config.mode, Object.keys(state.players).length],
    );
    const gameId = gr.rows[0].id;

    for (const p of loggedIn) {
      const rank = active.findIndex((s) => s.id === p.id) + 1;
      const isWinner =
        state.config.mode === "teams"
          ? winnerTeamId
            ? p.teamId === winnerTeamId
            : false
          : rank === 1;
      await db.query(
        `INSERT INTO player_game_stats (user_id,game_id,pseudo,score,rank,is_winner,team_id,mode)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          p.userId,
          gameId,
          p.pseudo,
          p.score,
          rank || 999,
          isWinner,
          p.teamId ?? null,
          state.config.mode,
        ],
      );
    }
  } catch (e: any) {
    console.error("[db] finishGame persist:", e.message);
  }
}

// ─── Check all MCQ answered ───────────────────────────────────
export async function checkAllAnswered(
  io: AppServer,
  roomCode: string,
  questionId: string,
) {
  const state = await getRoom(roomCode);
  if (!state || state.status !== "playing") return;
  const active = getActivePlayers(state);
  if (!active.length) return;
  if (active.every((p) => p.answeredQuestions.includes(questionId)))
    await triggerReveal(io, roomCode);
}

// ═══════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════
export function registerSocketHandlers(io: AppServer) {
  _io = io;

  io.on("connection", (socket: AppSocket) => {
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
        isRoundStart: false,
        round: state.currentRound,
        totalRounds: state.config.rounds,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        videoUrl: q.videoUrl,
        difficulty: q.difficulty,
        theme: q.theme,
        questionType: q.type ?? "mcq",
      };
    }

    // ── Host join ─────────────────────────────────────────────
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
        if (state.status === "paused") {
          const q = state.questions[state.currentQuestionIndex];
          socket.emit("game:paused", {
            timeLeft: Math.ceil(
              Math.max(0, q.timeLimit - state.timeElapsedBeforePause),
            ),
          });
        }
      }

      // ✅ AJOUT : host rafraîchit pendant la révélation
      if (state.status === "revealing") {
        const qp = makeQPayload(state);
        if (qp) socket.emit("question:start", qp);
        const q = state.questions[state.currentQuestionIndex];
        const playerAnswers: Record<string, number> = {};
        for (const p of Object.values(state.players)) {
          const ci = p.answers?.[q.id];
          if (ci !== undefined) playerAnswers[p.id] = ci;
        }
        socket.emit("question:reveal", {
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

      // ✅ AJOUT : host rafraîchit pendant round_end
      if (state.status === "round_end") {
        io.to(code).emit("game:round_end", {
          round: state.currentRound,
          totalRounds: state.config.rounds,
          scores: toPublicPlayers(state),
          teams: state.teams,
          perfectBonuses: {},
        });
      }

      if (state.status === "bluff_input" || state.status === "bluff_voting") {
        const q = state.questions[state.currentQuestionIndex]; // ✅ déclaré UNE FOIS ici
        if (state.status === "bluff_input" && q) {
          socket.emit("bluff:input_start", {
            id: q.id,
            text: q.text,
            theme: q.theme,
            difficulty: q.difficulty,
            timeLimit: BLUFF_INPUT_SECS,
            startedAt: state.questionStartedAt ?? Date.now(),
            isRoundStart: false,
            round: state.currentRound,
            totalRounds: state.config.rounds,
            imageUrl: q.imageUrl,
          });
        }
        if (state.status === "bluff_voting" && state.bluffOptions && q) {
          socket.emit("bluff:vote_start", {
            options: state.bluffOptions.map(({ letter, text }) => ({
              letter,
              text,
            })),
            timeLimit: BLUFF_VOTE_SECS,
            startedAt:
              (state.bluffDeadline ?? Date.now()) - BLUFF_VOTE_SECS * 1000,
            question: q.text, // ✅ q est bien défini maintenant
          });
        }
      }
    });

    // ── Player join ───────────────────────────────────────────
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
          socket.emit("game:paused", {
            timeLeft: Math.ceil(
              Math.max(0, q.timeLimit - state.timeElapsedBeforePause),
            ),
          });
        }
      }
      if (state.status === "bluff_input" && state.questionStartedAt) {
        const q = state.questions[state.currentQuestionIndex];
        socket.emit("bluff:input_start", {
          id: q.id,
          text: q.text,
          theme: q.theme,
          difficulty: q.difficulty,
          timeLimit: BLUFF_INPUT_SECS,
          startedAt: state.questionStartedAt,
          isRoundStart: false,
          round: state.currentRound,
          totalRounds: state.config.rounds,
          imageUrl: q.imageUrl,
        });
      }
      // Dans player:join, remplace le bloc bluff_voting par :
      if (state.status === "bluff_voting" && state.bluffOptions) {
        const q = state.questions[state.currentQuestionIndex]; // ✅ déclaré ici
        socket.emit("bluff:vote_start", {
          options: state.bluffOptions.map(({ letter, text }) => ({
            letter,
            text,
          })),
          timeLimit: BLUFF_VOTE_SECS,
          startedAt:
            (state.bluffDeadline ?? Date.now()) - BLUFF_VOTE_SECS * 1000,
          question: q?.text ?? "",
        });
      }
    });

    // ── Bluff submit ──────────────────────────────────────────
    socket.on(
      "player:bluff_submit",
      async ({ roomCode, playerId, sessionToken, text }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        if (!state || state.status !== "bluff_input") return;
        const p = state.players[playerId];
        if (!p || p.sessionToken !== sessionToken) return;
        if (state.eliminatedPlayerIds.includes(playerId)) return;

        const cleaned = text.trim().slice(0, 100);
        if (!cleaned) return;
        if (!state.bluffSubmissions) state.bluffSubmissions = {};
        state.bluffSubmissions[playerId] = cleaned;
        await saveRoom(state);

        const active = getActivePlayers(state).length;
        const count = Object.keys(state.bluffSubmissions).length;
        io.to(code).emit("bluff:submitted", { playerId, count, total: active });

        await checkAllBluffSubmitted(io, code);
      },
    );

    // ── Bluff vote ────────────────────────────────────────────
    socket.on(
      "player:bluff_vote",
      async ({ roomCode, playerId, sessionToken, letter }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        if (!state || state.status !== "bluff_voting") return;
        const p = state.players[playerId];
        if (!p || p.sessionToken !== sessionToken) return;
        if (state.eliminatedPlayerIds.includes(playerId)) return;
        if (!state.bluffVotes) state.bluffVotes = {};
        if (state.bluffVotes[playerId]) return; // already voted

        // Can't vote for your own submission
        const myOpt = (state.bluffOptions ?? []).find(
          (o) => o.authorId === playerId,
        );
        if (myOpt?.letter === letter) return;

        state.bluffVotes[playerId] = letter;
        await saveRoom(state);
        io.to(code).emit("bluff:voted", { playerId });

        await checkAllBluffVoted(io, code);
      },
    );

    // ── Host: start ───────────────────────────────────────────
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

    // ── Host: next ────────────────────────────────────────────
    socket.on("host:next", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state) return;

      if (state.status === "bluff_input") {
        await startBluffVoting(io, code);
        return;
      }
      if (state.status === "bluff_voting") {
        await revealBluff(io, code);
        return;
      }
      if (state.status === "playing" || state.status === "paused") {
        await triggerReveal(io, code);
        return;
      }
      if (state.status === "revealing") {
        if (isLastQOfRound(state)) {
          await endRound(io, code);
        } else {
          state.currentQuestionIndex++;
          state.lastQuestionPoints = {};
          state.lastQuestionTimes = {};
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

    // ── Attack / Defense powers ───────────────────────────────
    socket.on(
      "player:use_attack",
      async ({ roomCode, playerId, sessionToken, targetPlayerId }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        console.log(
          "[use_attack] status=",
          state?.status,
          "attacker=",
          playerId,
          "target=",
          targetPlayerId,
        );
        if (!state || (state.status !== "revealing" && state.status !== "playing")) {
          console.log("[use_attack] BLOQUÉ — mauvais status");
          return;
        }
        const attacker = state.players[playerId];
        if (!attacker || attacker.sessionToken !== sessionToken) return;
        if (!attacker.attackPower || attacker.attackUsed) return;
        if (state.eliminatedPlayerIds.includes(playerId)) return;
        const target = state.players[targetPlayerId];
        if (!target || state.eliminatedPlayerIds.includes(targetPlayerId))
          return;
        const power = attacker.attackPower;
        if (target.ghostActive) {
          socket.emit("power:blocked", { byShield: false, mirrorSent: false });
          return;
        }
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
            const targetEntry = [...socketMap.entries()].find(
              ([, v]) => v.playerId === targetPlayerId && v.roomCode === code,
            );
            const targetSocketId = targetEntry?.[0];
            if (targetSocketId) {
              io.to(targetSocketId).emit("power:effect", {
                type: power,
                fromPlayerId: playerId,
                fromPseudo: attacker.pseudo,
                fromAvatar: attacker.avatar,
                targetPlayerId,
                hiddenChoiceIndex: Math.floor(Math.random() * 4),
                newChoiceOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
              });
            }
            io.to(code).emit("room:state", toRoomState(state));
          }
          await saveRoom(state);
          socket.emit("power:blocked", {
            byShield: true,
            mirrorSent: mirrored,
          });
          return;
        }
        queueAttack(power, target, playerId, attacker.avatar, attacker.pseudo);
        attacker.attackPower = null;
        attacker.attackUsed = true;
        await saveRoom(state);
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

    socket.on(
      "player:use_defense",
      async ({ roomCode, playerId, sessionToken }) => {
        const code = roomCode.toUpperCase();
        const state = await getRoom(code);
        if (!state || (state.status !== "revealing" && state.status !== "playing")) return;
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

    // ── Pause / Resume / Stop ─────────────────────────────────
    socket.on("host:pause", async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = await getRoom(code);
      if (!state || state.status !== "playing") return;
      const now = Date.now();
      const elapsed = state.questionStartedAt
        ? Math.max(0, (now - state.questionStartedAt) / 1000)
        : 0;
      const q = state.questions[state.currentQuestionIndex];
      const t = revealTimers.get(code);
      if (t) {
        clearTimeout(t);
        revealTimers.delete(code);
      }
      state.status = "paused";
      state.pausedAt = now;
      state.timeElapsedBeforePause = elapsed;
      await saveRoom(state);
      io.to(code).emit("game:paused", {
        timeLeft: Math.ceil(Math.max(0, q.timeLimit - elapsed)),
      });
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
