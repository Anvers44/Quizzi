// ─── Avatars (16) ────────────────────────────────────────────
export type Avatar =
  | "fox"
  | "cat"
  | "dog"
  | "rabbit"
  | "bear"
  | "panda"
  | "owl"
  | "frog"
  | "lion"
  | "tiger"
  | "penguin"
  | "koala"
  | "wolf"
  | "duck"
  | "hamster"
  | "dragon";

export const AVATARS: Avatar[] = [
  "fox",
  "cat",
  "dog",
  "rabbit",
  "bear",
  "panda",
  "owl",
  "frog",
  "lion",
  "tiger",
  "penguin",
  "koala",
  "wolf",
  "duck",
  "hamster",
  "dragon",
];

// ─── Difficulty ───────────────────────────────────────────────
export type Difficulty = "easy" | "medium" | "hard";

// ─── Powers ───────────────────────────────────────────────────
// Attack powers
export type AttackPower = "blind" | "freeze" | "flip" | "shuffle";
// Defense powers
export type DefensePower = "shield" | "double" | "mirror" | "ghost";
export type PowerType = AttackPower | DefensePower;

export const ATTACK_POWERS: AttackPower[] = [
  "blind",
  "freeze",
  "flip",
  "shuffle",
];
export const DEFENSE_POWERS: DefensePower[] = [
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
  fromAvatar: Avatar;
  fromPseudo: string;
  duration: number;
  expiresAt: number;
}

// ─── Game mode ────────────────────────────────────────────────
export type GameMode = "classic" | "teams" | "tournament";

export type TeamId = "red" | "blue" | "green" | "yellow" | "purple" | "orange";
export const ALL_TEAM_IDS: TeamId[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export interface GameConfig {
  mode: GameMode;
  themes: string[];
  difficulty: Difficulty | "all";
  rounds: number;
  questionsPerRound: number;
  powersEnabled: boolean;
  teamCount: number;
}

export interface Team {
  id: string;
  name: string;
  score: number;
}

// ─── Player ───────────────────────────────────────────────────
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
  answerTimes: Record<string, number>;
  teamId?: string;

  // Specialty theme chosen by player at join
  specialtyTheme: string | null;

  // Powers: 1 attack + 1 defense per round
  attackPower: AttackPower | null; // current attack card
  defensePower: DefensePower | null; // current defense card
  attackUsed: boolean;
  defenseUsed: boolean;

  // Active defense states
  shieldActive: boolean;
  mirrorActive: boolean;
  doubleNextAnswer: boolean;
  ghostActive: boolean;
  frozenUntil: number | null;
  activeEffects: ActiveEffect[];
  pendingEffects: PendingEffect[];

  // Round tracking
  roundCorrectCount: number;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
  correct: boolean;
  points: number;
  timeTaken: number;
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
  teams: Record<string, Team>;
  lastQuestionPoints: Record<string, number>;
  lastQuestionTimes: Record<string, number>;
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
