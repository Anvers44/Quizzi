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
export type Difficulty = "easy" | "medium" | "hard";
export type PowerType =
  | "blind"
  | "freeze"
  | "flip"
  | "shuffle"
  | "shield"
  | "double"
  | "mirror"
  | "ghost";
export const ATTACK_POWERS: PowerType[] = [
  "blind",
  "freeze",
  "flip",
  "shuffle",
];
export const DEFENSE_POWERS: PowerType[] = [
  "shield",
  "double",
  "mirror",
  "ghost",
];
export const ALL_POWERS: PowerType[] = [...ATTACK_POWERS, ...DEFENSE_POWERS];
export interface ActiveEffect {
  type: PowerType;
  expiresAt: number;
  fromPlayerId: string;
}
export interface PendingEffect {
  type: PowerType;
  fromPlayerId: string;
  duration: number;
  expiresAt: number;
}
export type GameMode = "classic" | "teams" | "tournament";
export interface GameConfig {
  mode: GameMode;
  themes: string[];
  difficulty: Difficulty | "all";
  rounds: number;
  questionsPerRound: number;
  powersEnabled: boolean;
}
export type TeamId = "red" | "blue";
export interface Team {
  id: TeamId;
  name: string;
  score: number;
}
export interface Player {
  id: string;
  sessionToken: string;
  roomCode: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
  connected: boolean;
  answeredQuestions: string[];
  answers: Record<string, number>;
  teamId?: TeamId;
  currentPower: PowerType | null;
  powerUsedThisRound: boolean;
  shieldActive: boolean;
  mirrorActive: boolean;
  doubleNextAnswer: boolean;
  ghostActive: boolean;
  frozenUntil: number | null;
  activeEffects: ActiveEffect[];
  pendingEffects: PendingEffect[];
}
export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
  correct: boolean;
  points: number;
}
export type RoomStatus =
  | "lobby"
  | "playing"
  | "paused"
  | "revealing"
  | "round_end"
  | "finished";
export interface GameState {
  roomCode: string;
  hostSocketId: string;
  status: RoomStatus;
  config: GameConfig;
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  pausedAt: number | null;
  timeElapsedBeforePause: number;
  currentRound: number;
  eliminatedPlayerIds: string[];
  teams: Record<TeamId, Team>;
  lastQuestionPoints: Record<string, number>;
}
export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  timeLimit: number;
  theme: string;
  difficulty: Difficulty;
  imageUrl?: string;
}
