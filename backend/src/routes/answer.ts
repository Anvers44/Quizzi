import { Router } from "express";
import { getRoom, saveRoom, recordAnswerIfNew } from "../redis/helpers";
import type { PlayerAnswer, Difficulty } from "../types";
import { getIo, checkAllAnswered } from "../socketHandlers";

export const answerRouter = Router();

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
const SPECIALTY_BONUS_MULT = 1.2; // +20% si bonne réponse sur thème spécialité
const SPECIALTY_WRONG_PEN = 100; // -100 pts si mauvaise réponse sur thème spécialité

function computePoints(
  correct: boolean,
  difficulty: Difficulty,
  timeLimit: number,
  elapsed: number,
  doubled: boolean,
): number {
  if (!correct) return 0;
  const base = BASE_POINTS[difficulty];
  const maxB = MAX_BONUS[difficulty];
  const ratio = Math.max(0, Math.min(1, (timeLimit - elapsed) / timeLimit));
  const rounded = Math.round((base + Math.round(maxB * ratio)) / 50) * 50;
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

  if (player.frozenUntil && Date.now() < player.frozenUntil)
    return res.status(400).json({ error: "Tu es gelé !", frozen: true });

  const correct = choiceIndex === question.correctIndex;
  const elapsed = state.questionStartedAt
    ? (Date.now() - state.questionStartedAt) / 1000
    : question.timeLimit;
  const timeTaken = Math.min(elapsed, question.timeLimit);

  let points = computePoints(
    correct,
    question.difficulty,
    question.timeLimit,
    elapsed,
    player.doubleNextAnswer && correct,
  );

  // Modificateur thème spécialité
  const isSpecialty =
    player.specialtyTheme && player.specialtyTheme === question.theme;
  if (isSpecialty) {
    if (correct) {
      // +20% sur bonne réponse spécialité
      points = Math.round((points * SPECIALTY_BONUS_MULT) / 50) * 50;
    } else {
      // Pénalité sur mauvaise réponse spécialité
      points = -SPECIALTY_WRONG_PEN;
    }
  }

  if (correct && player.doubleNextAnswer) player.doubleNextAnswer = false;

  // scoreDelta représente le vrai delta (peut être négatif pour pénalité spécialité)
  const scoreDelta = points;

  const answer: PlayerAnswer = {
    playerId,
    questionId,
    choiceIndex,
    answeredAt: Date.now(),
    correct,
    points: Math.max(scoreDelta, 0), // pour les stats individuelles, on ne stocke pas de valeur négative
    timeTaken,
  };

  const recorded = await recordAnswerIfNew(answer, roomCode);
  if (!recorded)
    return res
      .status(409)
      .json({ error: "Réponse déjà envoyée", alreadyAnswered: true });

  // Appliquer le delta au score (jamais en dessous de 0)
  player.score = Math.max(0, player.score + scoreDelta);

  if (!player.answeredQuestions.includes(questionId))
    player.answeredQuestions.push(questionId);
  if (!player.answers) player.answers = {};
  player.answers[questionId] = choiceIndex;
  if (!player.answerTimes) player.answerTimes = {};
  player.answerTimes[questionId] = timeTaken;
  if (correct) {
    if (typeof player.roundCorrectCount !== "number")
      player.roundCorrectCount = 0;
    player.roundCorrectCount++;
  }

  if (!state.lastQuestionPoints) state.lastQuestionPoints = {};
  if (!state.lastQuestionTimes) state.lastQuestionTimes = {};
  // On stocke le vrai delta (y compris négatif) pour l'affichage révélation
  state.lastQuestionPoints[playerId] = scoreDelta;
  state.lastQuestionTimes[playerId] = timeTaken;

  if (
    state.config.mode === "teams" &&
    player.teamId &&
    state.teams[player.teamId]
  ) {
    state.teams[player.teamId].score = Math.max(
      0,
      state.teams[player.teamId].score + Math.max(0, scoreDelta),
    );
  }

  await saveRoom(state);

  try {
    const io = getIo();
    if (io) {
      io.to(roomCode).emit("player:answered", { playerId });
      if (state.config.mode === "teams")
        io.to(roomCode).emit("team:update", { teams: state.teams });
    }
  } catch {}
  try {
    const io = getIo();
    if (io) await checkAllAnswered(io, roomCode, questionId);
  } catch {}

  return res.json({ ok: true });
});
