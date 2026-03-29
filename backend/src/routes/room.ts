import { Router } from "express";
import { saveRoom, getRoom } from "../redis/helpers";
import { redis } from "../redis/client";
import type { GameState, GameConfig, Team } from "../types";
import { ALL_TEAM_IDS } from "../types";
import { pickQuestions } from "../data/questions";
import { ROOM_TTL_SECONDS } from "../redis/keys";

export const roomRouter = Router();

const TEAM_NAMES: Record<string, string> = {
  red: "🔴 Rouge",
  blue: "🔵 Bleue",
  green: "🟢 Verte",
  yellow: "🟡 Jaune",
  purple: "🟣 Violette",
  orange: "🟠 Orange",
};

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

roomRouter.post("/", async (req, res) => {
  try {
    const body = req.body as any;
    let themes: string[] = [];
    if (Array.isArray(body.themes) && body.themes.length > 0)
      themes = body.themes;
    else if (typeof body.theme === "string") themes = [body.theme];
    else themes = ["all"];

    const teamCount = Math.min(6, Math.max(2, Number(body.teamCount) || 2));

    const config: GameConfig = {
      mode: body.mode || "classic",
      themes,
      difficulty: body.difficulty || "all",
      rounds: Math.min(5, Math.max(1, Number(body.rounds) || 3)),
      questionsPerRound: [5, 7, 10].includes(Number(body.questionsPerRound))
        ? Number(body.questionsPerRound)
        : 5,
      powersEnabled: Boolean(body.powersEnabled) || false,
      teamCount,
    };

    const totalQ =
      config.mode === "tournament"
        ? config.questionsPerRound * 10
        : config.rounds * config.questionsPerRound;

    const questions = pickQuestions(themes, config.difficulty, totalQ);
    const roomCode = generateRoomCode();

    // Build teams (2-6)
    const teams: Record<string, Team> = {};
    ALL_TEAM_IDS.slice(0, config.mode === "teams" ? teamCount : 0).forEach(
      (tid) => {
        teams[tid] = { id: tid, name: TEAM_NAMES[tid] || tid, score: 0 };
      },
    );

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
      teams,
      lastQuestionPoints: {},
      lastQuestionTimes: {},
    };

    await saveRoom(state);
    res.status(201).json({ roomCode, config });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    res.status(500).json({ error: "Impossible de créer la room" });
  }
});

roomRouter.get("/list", async (_req, res) => {
  try {
    const keys = await redis.keys("room:*");
    const rooms = [];
    for (const key of keys.filter((k) => k.split(":").length === 2)) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const state = JSON.parse(raw) as GameState;
      if (state.status === "lobby") {
        rooms.push({
          roomCode: state.roomCode,
          playerCount: Object.keys(state.players).length,
          ttl: await redis.ttl(key),
          config: state.config,
        });
      }
    }
    res.json({ rooms });
  } catch {
    res.json({ rooms: [] });
  }
});

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
