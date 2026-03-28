import type { GameState, Player } from "./types";

export interface ClientToServerEvents {
  "host:join": (data: { roomCode: string }) => void;
  "player:join": (data: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  }) => void;
  "host:leave": (data: { roomCode: string }) => void;
  "player:leave": (data: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  }) => void;
  "host:start": (data: { roomCode: string }) => void;
  "host:next": (data: { roomCode: string }) => void;
  "host:pause": (data: { roomCode: string }) => void;
  "host:resume": (data: { roomCode: string }) => void;
  "host:stop": (data: { roomCode: string }) => void; // termine la partie immédiatement
}

export interface ServerToClientEvents {
  "room:state": (state: RoomStatePayload) => void;
  "player:joined": (player: PublicPlayer) => void;
  "player:disconnected": (data: { playerId: string }) => void;
  "player:reconnected": (data: { playerId: string }) => void;
  "player:answered": (data: { playerId: string; choiceIndex: number }) => void;
  "room:closed": () => void;
  "player:kicked": (data: { playerId: string }) => void;
  "question:start": (data: QuestionPayload) => void;
  "question:reveal": (data: RevealPayload) => void;
  "game:paused": (data: { timeLeft: number }) => void;
  "game:resumed": (data: { startedAt: number }) => void;
  "game:finished": (data: FinishedPayload) => void;
  error: (data: { message: string }) => void;
}

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: Player["avatar"];
  score: number;
  connected: boolean;
}

export interface RoomStatePayload {
  roomCode: string;
  status: GameState["status"];
  players: PublicPlayer[];
  currentQuestionIndex: number;
}

export interface QuestionPayload {
  id: string;
  text: string;
  choices: string[];
  timeLimit: number;
  index: number;
  total: number;
  startedAt: number;
}

export interface RevealPayload {
  questionId: string;
  correctIndex: number;
  scores: PublicPlayer[];
  // Qui a répondu quoi : playerId → choiceIndex
  playerAnswers: Record<string, number>;
}

export interface FinishedPayload {
  scores: PublicPlayer[];
}
