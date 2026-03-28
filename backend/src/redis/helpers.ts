import { redis } from "./client";
import { keys, ROOM_TTL_SECONDS } from "./keys";
import type { GameState, PlayerAnswer } from "../types";

// ─── GameState ───────────────────────────────────────────────

export async function saveRoom(state: GameState): Promise<void> {
  await redis.set(
    keys.room(state.roomCode),
    JSON.stringify(state),
    "EX",
    ROOM_TTL_SECONDS,
  );
}

export async function getRoom(roomCode: string): Promise<GameState | null> {
  const raw = await redis.get(keys.room(roomCode));
  if (!raw) return null;
  return JSON.parse(raw) as GameState;
}

export async function deleteRoom(roomCode: string): Promise<void> {
  await redis.del(keys.room(roomCode));
}

// ─── Anti double-soumission ──────────────────────────────────
// Retourne true si la réponse a été enregistrée (première fois).
// Retourne false si le joueur avait déjà répondu à cette question.

export async function recordAnswerIfNew(
  answer: PlayerAnswer,
  roomCode: string,
): Promise<boolean> {
  const key = keys.answer(roomCode, answer.questionId, answer.playerId);

  // SET NX : n'écrit que si la clé n'existe pas encore
  const result = await redis.set(
    key,
    JSON.stringify(answer),
    "EX",
    ROOM_TTL_SECONDS,
    "NX",
  );

  return result === "OK"; // 'OK' = écrit, null = déjà existant
}
