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

// ─── Powers ─────────────────────────────────────────────────
export type PowerType =
  // attack
  | "blind" // cache un choix aléatoire pendant 8 s
  | "freeze" // bloque la cible 4 s
  | "flip" // retourne l'écran 5 s
  | "shuffle" // mélange les choix
  // defense
  | "shield" // bloque la prochaine attaque
  | "double" // prochaine bonne réponse × 2
  | "mirror" // renvoie la prochaine attaque
  | "ghost"; // inciblable cette question

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
  expiresAt: number; // timestamp ms
  fromPlayerId: string;
}

// ─── Game config ────────────────────────────────────────────
export type GameMode = "classic" | "teams" | "tournament";

export interface GameConfig {
  mode: GameMode;
  theme: string; // theme key or "all"
  rounds: number; // 1-5 (tournament: auto-computed)
  questionsPerRound: number; // 5, 7, 10
  powersEnabled: boolean;
}

// ─── Teams ──────────────────────────────────────────────────
export type TeamId = "red" | "blue";

export interface Team {
  id: TeamId;
  name: string;
  score: number;
}

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
  answers: Record<string, number>; // questionId -> choiceIndex
  // Mode teams
  teamId?: TeamId;
  // Powers
  currentPower: PowerType | null;
  powerUsedThisRound: boolean;
  shieldActive: boolean;
  mirrorActive: boolean;
  doubleNextAnswer: boolean;
  ghostActive: boolean;
  frozenUntil: number | null; // timestamp
  activeEffects: ActiveEffect[];
}

// ─── Question ───────────────────────────────────────────────
export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  timeLimit: number;
  theme: string;
}

// ─── Answer ─────────────────────────────────────────────────
export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
  correct: boolean;
  points: number;
}

// ─── GameState ──────────────────────────────────────────────
export type RoomStatus =
  | "lobby"
  | "playing"
  | "paused"
  | "revealing"
  | "round_end" // between rounds — show summary
  | "finished";

export interface GameState {
  roomCode: string;
  hostSocketId: string;
  status: RoomStatus;
  config: GameConfig;
  players: Record<string, Player>;
  questions: Question[]; // flat list for the whole game
  currentQuestionIndex: number; // absolute index in `questions`
  questionStartedAt: number | null;
  pausedAt: number | null;
  timeElapsedBeforePause: number;
  // Rounds
  currentRound: number; // 1-based
  // Tournament
  eliminatedPlayerIds: string[];
  // Teams
  teams: Record<TeamId, Team>;
}
