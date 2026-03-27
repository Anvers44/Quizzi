// ─── Avatars ────────────────────────────────────────────────
export type Avatar =
  | "fox"
  | "cat"
  | "dog"
  | "rabbit"
  | "bear"
  | "panda"
  | "owl"
  | "frog";

export const AVATARS: Avatar[] = [
  "fox",
  "cat",
  "dog",
  "rabbit",
  "bear",
  "panda",
  "owl",
  "frog",
];

export const AVATAR_EMOJI: Record<Avatar, string> = {
  fox: "🦊",
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
  bear: "🐻",
  panda: "🐼",
  owl: "🦉",
  frog: "🐸",
};

// ─── Player ─────────────────────────────────────────────────
export interface Player {
  id: string;
  sessionToken: string;
  roomCode: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
  connected: boolean;
  answeredQuestions: string[];
}

// ─── Question ───────────────────────────────────────────────
export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  timeLimit: number;
}

// ─── ScoreEntry ─────────────────────────────────────────────
export interface ScoreEntry {
  playerId: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
}

// ─── GameState ──────────────────────────────────────────────
export type RoomStatus = "lobby" | "playing" | "revealing" | "finished";

export interface GameState {
  roomCode: string;
  hostSocketId: string;
  status: RoomStatus;
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
}

// ─── Session localStorage ───────────────────────────────────
export interface LocalSession {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  role: "host" | "player";
}
