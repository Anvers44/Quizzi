import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { saveRoom } from "../redis/helpers";
import type { GameState } from "../types";
import { QUESTIONS } from "../data/questions";

export const roomRouter = Router();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/rooms
roomRouter.post("/", async (_req, res) => {
  try {
    const roomCode = generateRoomCode();

    const state: GameState = {
      roomCode,
      hostSocketId: "",
      status: "lobby",
      players: {},
      questions: QUESTIONS,
      currentQuestionIndex: 0,
      questionStartedAt: null,
    };

    await saveRoom(state);
    res.status(201).json({ roomCode });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    res.status(500).json({ error: "Impossible de créer la room" });
  }
});

// GET /api/rooms/:roomCode
roomRouter.get("/:roomCode", async (req, res) => {
  const { getRoom } = await import("../redis/helpers");
  const state = await getRoom(req.params.roomCode.toUpperCase());
  if (!state) {
    return res.status(404).json({ error: "Room introuvable" });
  }
  const safePlayers = Object.fromEntries(
    Object.entries(state.players).map(([id, p]) => [
      id,
      {
        id: p.id,
        pseudo: p.pseudo,
        avatar: p.avatar,
        score: p.score,
        connected: p.connected,
      },
    ]),
  );
  return res.json({ ...state, players: safePlayers });
});
