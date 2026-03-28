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

export interface Player {
  id: string;
  sessionToken: string;
  roomCode: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
  connected: boolean;
  answeredQuestions: string[];
  answers: Record<string, number>; // questionId → choiceIndex
}

export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  timeLimit: number;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
  correct: boolean;
  points: number;
}

export interface ScoreEntry {
  playerId: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
}

export type RoomStatus =
  | "lobby"
  | "playing"
  | "paused"
  | "revealing"
  | "finished";

export interface GameState {
  roomCode: string;
  hostSocketId: string;
  status: RoomStatus;
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  pausedAt: number | null;
  timeElapsedBeforePause: number;
}
