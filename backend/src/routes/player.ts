import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getRoom, saveRoom } from "../redis/helpers";
import type { Player } from "../types";
import { AVATARS } from "../types";

export const playerRouter = Router();

playerRouter.post("/:roomCode/join", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const { pseudo, avatar } = req.body as { pseudo?: string; avatar?: string };

  if (!pseudo || pseudo.trim().length < 1)
    return res.status(400).json({ error: "Pseudo requis" });
  if (pseudo.trim().length > 20)
    return res.status(400).json({ error: "Pseudo trop long (20 max)" });
  if (!avatar || !AVATARS.includes(avatar as (typeof AVATARS)[number]))
    return res.status(400).json({ error: "Avatar invalide" });

  const state = await getRoom(roomCode);
  if (!state) return res.status(404).json({ error: "Room introuvable" });
  if (state.status !== "lobby")
    return res.status(400).json({ error: "La partie a déjà commencé" });

  const pseudoTaken = Object.values(state.players).some(
    (p) => p.pseudo.toLowerCase() === pseudo.trim().toLowerCase(),
  );
  if (pseudoTaken)
    return res.status(400).json({ error: "Ce pseudo est déjà pris" });

  const playerId = uuidv4();
  const sessionToken = uuidv4();

  const player: Player = {
    id: playerId,
    sessionToken,
    roomCode,
    pseudo: pseudo.trim(),
    avatar: avatar as Player["avatar"],
    score: 0,
    connected: false,
    answeredQuestions: [],
    answers: {},
  };

  state.players[playerId] = player;
  await saveRoom(state);
  return res.status(201).json({ playerId, sessionToken, roomCode });
});

playerRouter.post("/:roomCode/rejoin", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const { playerId, sessionToken } = req.body as {
    playerId?: string;
    sessionToken?: string;
  };

  if (!playerId || !sessionToken)
    return res.status(400).json({ error: "playerId et sessionToken requis" });

  const state = await getRoom(roomCode);
  if (!state) return res.status(404).json({ error: "Room introuvable" });

  const player = state.players[playerId];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  if (player.sessionToken !== sessionToken)
    return res.status(401).json({ error: "Session invalide" });

  player.connected = true;
  await saveRoom(state);

  return res.json({
    playerId: player.id,
    sessionToken: player.sessionToken,
    roomCode,
    pseudo: player.pseudo,
    avatar: player.avatar,
    score: player.score,
    status: state.status,
  });
});
