import { Router } from "express";
import { getRoom, saveRoom, recordAnswerIfNew } from "../redis/helpers";
import type { PlayerAnswer, Difficulty } from "../types";
import { getIo, checkAllAnswered } from "../socketHandlers";

export const answerRouter = Router();

// ─── Smooth scoring ────────────────────────────────────────────
const BASE_POINTS: Record<Difficulty, number> = {
  easy: 600,
  medium: 1000,
  hard: 1500,
};
const MAX_BONUS: Record<Difficulty, number> = {
  easy: 200,
  medium: 400,
  hard: 600,
};

function computePoints(
  correct: boolean,
  difficulty: Difficulty,
  timeLimit: number,
  elapsed: number,
  doubled: boolean,
): number {
  if (!correct) return 0;

  const base = BASE_POINTS[difficulty];
  const maxBonus = MAX_BONUS[difficulty];
  const ratio = Math.max(0, Math.min(1, (timeLimit - elapsed) / timeLimit));
  const rawBonus = Math.round(maxBonus * ratio);
  const rawTotal = base + rawBonus;

  // Round to nearest 50 → clean numbers like 650, 700, 850...
  const rounded = Math.round(rawTotal / 50) * 50;
  return doubled ? rounded * 2 : rounded;
}

answerRouter.post("/:roomCode/answer", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const { playerId, sessionToken, questionId, choiceIndex } = req.body as {
    playerId?: string;
    sessionToken?: string;
    questionId?: string;
    choiceIndex?: number;
  };

  if (!playerId || !sessionToken || !questionId || choiceIndex === undefined)
    return res.status(400).json({ error: "Paramètres manquants" });

  const state = await getRoom(roomCode);
  if (!state) return res.status(404).json({ error: "Room introuvable" });

  const player = state.players[playerId];
  if (!player || player.sessionToken !== sessionToken)
    return res.status(401).json({ error: "Session invalide" });

  if (state.status !== "playing")
    return res.status(400).json({ error: "Aucune question en cours" });

  const question = state.questions[state.currentQuestionIndex];
  if (!question || question.id !== questionId)
    return res.status(400).json({ error: "Question incorrecte" });

  // Freeze check
  if (player.frozenUntil && Date.now() < player.frozenUntil)
    return res.status(400).json({ error: "Tu es gelé !", frozen: true });

  const correct = choiceIndex === question.correctIndex;
  const elapsed = state.questionStartedAt
    ? (Date.now() - state.questionStartedAt) / 1000
    : question.timeLimit;

  const points = computePoints(
    correct,
    question.difficulty,
    question.timeLimit,
    elapsed,
    player.doubleNextAnswer && correct,
  );

  if (correct && player.doubleNextAnswer) player.doubleNextAnswer = false;

  const answer: PlayerAnswer = {
    playerId,
    questionId,
    choiceIndex,
    answeredAt: Date.now(),
    correct,
    points,
  };

  const recorded = await recordAnswerIfNew(answer, roomCode);
  if (!recorded)
    return res
      .status(409)
      .json({ error: "Réponse déjà envoyée", alreadyAnswered: true });

  player.score += points;
  if (!player.answeredQuestions.includes(questionId))
    player.answeredQuestions.push(questionId);
  if (!player.answers) player.answers = {};
  player.answers[questionId] = choiceIndex;

  // Track points this question (for reveal display)
  if (!state.lastQuestionPoints) state.lastQuestionPoints = {};
  state.lastQuestionPoints[playerId] = points;

  // Team scoring
  if (state.config.mode === "teams" && player.teamId) {
    state.teams[player.teamId].score += points;
  }

  await saveRoom(state);

  try {
    const io = getIo();
    if (io) {
      io.to(roomCode).emit("player:answered", { playerId, choiceIndex });
      if (state.config.mode === "teams")
        io.to(roomCode).emit("team:update", { teams: state.teams });
    }
  } catch {}

  try {
    const io = getIo();
    if (io) await checkAllAnswered(io, roomCode, questionId);
  } catch {}

  return res.json({ correct, points, score: player.score });
});
