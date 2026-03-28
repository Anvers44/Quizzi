import { Router } from "express";
import { getRoom, saveRoom, recordAnswerIfNew } from "../redis/helpers";
import type { PlayerAnswer } from "../types";
import { getIo, checkAllAnswered } from "../socketHandlers";

export const answerRouter = Router();

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

  const correct = choiceIndex === question.correctIndex;
  const elapsed = state.questionStartedAt
    ? (Date.now() - state.questionStartedAt) / 1000
    : question.timeLimit;
  const timeBonus = correct
    ? Math.round(
        500 * Math.max(0, (question.timeLimit - elapsed) / question.timeLimit),
      )
    : 0;
  const points = correct ? 1000 + timeBonus : 0;

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
  await saveRoom(state);

  // Broadcast "joueur a répondu" au host (sans révéler si correct)
  try {
    const io = getIo();
    if (io) io.to(roomCode).emit("player:answered", { playerId, choiceIndex });
  } catch {}

  // Auto-reveal si tout le monde a répondu
  try {
    const io = getIo();
    if (io) await checkAllAnswered(io, roomCode, questionId);
  } catch {}

  return res.json({ correct: false, points: 0, score: player.score });
  // On ne révèle pas correct/points ici — sera dans le reveal socket event
});
