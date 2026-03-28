import type { Avatar } from "./types";

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
  connected: boolean;
}

export interface RoomStatePayload {
  roomCode: string;
  status: "lobby" | "playing" | "paused" | "revealing" | "finished";
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
  playerAnswers: Record<string, number>; // playerId → choiceIndex
}

export interface FinishedPayload {
  scores: PublicPlayer[];
}

export interface ClientToServerEvents {
  "host:join": (d: { roomCode: string }) => void;
  "player:join": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  }) => void;
  "host:leave": (d: { roomCode: string }) => void;
  "player:leave": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  }) => void;
  "host:start": (d: { roomCode: string }) => void;
  "host:next": (d: { roomCode: string }) => void;
  "host:pause": (d: { roomCode: string }) => void;
  "host:resume": (d: { roomCode: string }) => void;
  "host:stop": (d: { roomCode: string }) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomStatePayload) => void;
  "player:joined": (player: PublicPlayer) => void;
  "player:disconnected": (d: { playerId: string }) => void;
  "player:reconnected": (d: { playerId: string }) => void;
  "player:answered": (d: { playerId: string; choiceIndex: number }) => void;
  "room:closed": () => void;
  "player:kicked": (d: { playerId: string }) => void;
  "question:start": (d: QuestionPayload) => void;
  "question:reveal": (d: RevealPayload) => void;
  "game:paused": (d: { timeLeft: number }) => void;
  "game:resumed": (d: { startedAt: number }) => void;
  "game:finished": (d: FinishedPayload) => void;
  error: (d: { message: string }) => void;
}
