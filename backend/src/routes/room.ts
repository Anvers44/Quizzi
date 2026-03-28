import { Router } from "express";
import { saveRoom, getRoom } from "../redis/helpers";
import { redis } from "../redis/client";
import type { GameState } from "../types";
import { QUESTIONS } from "../data/questions";
import { ROOM_TTL_SECONDS } from "../redis/keys";

export const roomRouter = Router();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
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

    // Timer d'expiration : fermeture automatique après TTL
    // Le socket handler s'occupe de broadcaster room:closed
    // mais si le serveur redémarre, Redis expire les clés tout seul
    console.log(
      `[room] created ${roomCode} — expires in ${ROOM_TTL_SECONDS / 60}min`,
    );

    res.status(201).json({ roomCode, expiresIn: ROOM_TTL_SECONDS });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    res.status(500).json({ error: "Impossible de créer la room" });
  }
});

// GET /api/rooms/list
roomRouter.get("/list", async (_req, res) => {
  try {
    const keys = await redis.keys("room:*");
    const roomKeys = keys.filter((k) => k.split(":").length === 2);
    const rooms: { roomCode: string; playerCount: number; ttl: number }[] = [];

    for (const key of roomKeys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const state = JSON.parse(raw) as GameState;
      if (state.status === "lobby") {
        const ttl = await redis.ttl(key);
        rooms.push({
          roomCode: state.roomCode,
          playerCount: Object.keys(state.players).length,
          ttl, // secondes restantes
        });
      }
    }

    res.json({ rooms });
  } catch {
    res.json({ rooms: [] });
  }
});

// GET /api/rooms/:roomCode
roomRouter.get("/:roomCode", async (req, res) => {
  const state = await getRoom(req.params.roomCode.toUpperCase());
  if (!state) return res.status(404).json({ error: "Room introuvable" });
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
