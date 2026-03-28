import { Router } from "express";
import { saveRoom, getRoom } from "../redis/helpers";
import { redis } from "../redis/client";
import type { GameState, GameConfig, TeamId } from "../types";
import { pickQuestions } from "../data/questions";
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
roomRouter.post("/", async (req, res) => {
  try {
    const body = req.body as Partial<GameConfig>;

    const config: GameConfig = {
      mode: (body.mode as GameConfig["mode"]) || "classic",
      theme: body.theme || "all",
      rounds: Math.min(5, Math.max(1, Number(body.rounds) || 3)),
      questionsPerRound: [5, 7, 10].includes(Number(body.questionsPerRound))
        ? Number(body.questionsPerRound)
        : 5,
      powersEnabled: Boolean(body.powersEnabled) || false,
    };

    // For tournament: totalQuestions = questionsPerRound per round
    // rounds will be determined dynamically (players - 1)
    const totalQ =
      config.mode === "tournament"
        ? config.questionsPerRound * 10 // generate extra, we'll slice per round
        : config.rounds * config.questionsPerRound;

    const questions = pickQuestions(config.theme, totalQ);

    const roomCode = generateRoomCode();

    const state: GameState = {
      roomCode,
      hostSocketId: "",
      status: "lobby",
      config,
      players: {},
      questions,
      currentQuestionIndex: 0,
      questionStartedAt: null,
      pausedAt: null,
      timeElapsedBeforePause: 0,
      currentRound: 1,
      eliminatedPlayerIds: [],
      teams: {
        red: { id: "red", name: "Équipe Rouge", score: 0 },
        blue: { id: "blue", name: "Équipe Bleue", score: 0 },
      },
    };

    await saveRoom(state);
    console.log(
      `[room] created ${roomCode} mode=${config.mode} theme=${config.theme}`,
    );
    res.status(201).json({ roomCode, expiresIn: ROOM_TTL_SECONDS, config });
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
    const rooms: {
      roomCode: string;
      playerCount: number;
      ttl: number;
      config: GameConfig;
    }[] = [];
    for (const key of roomKeys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const state = JSON.parse(raw) as GameState;
      if (state.status === "lobby") {
        const ttl = await redis.ttl(key);
        rooms.push({
          roomCode: state.roomCode,
          playerCount: Object.keys(state.players).length,
          ttl,
          config: state.config,
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
        teamId: p.teamId,
      },
    ]),
  );
  return res.json({ ...state, players: safePlayers });
});
