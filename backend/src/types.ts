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
export type AttackPower = "blind" | "freeze" | "flip" | "shuffle";
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
  bluffEnabled: boolean; // ← NEW: include open/bluff questions
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
  specialtyTheme: string | null;
  userId?: string | null; // ← NEW: linked account (optional)

  attackPower: AttackPower | null;
  defensePower: DefensePower | null;
  attackUsed: boolean;
  defenseUsed: boolean;
  shieldActive: boolean;
  mirrorActive: boolean;
  doubleNextAnswer: boolean;
  ghostActive: boolean;
  frozenUntil: number | null;
  activeEffects: ActiveEffect[];
  pendingEffects: PendingEffect[];
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

// ─── Bluff (open question) types ─────────────────────────────
export interface BluffOption {
  letter: string; // A, B, C…
  text: string;
  isReal: boolean;
  authorId?: string; // undefined = real answer
}

// ─── Room status (includes bluff phases) ─────────────────────
export type RoomStatus =
  | "lobby"
  | "playing"
  | "paused"
  | "revealing"
  | "round_end"
  | "finished"
  | "bluff_input" // players typing fake answers
  | "bluff_voting"; // players voting on options

// ─── Game state ───────────────────────────────────────────────
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

  // Bluff state
  bluffSubmissions?: Record<string, string>; // playerId → fake text
  bluffOptions?: BluffOption[]; // mixed options for voting
  bluffVotes?: Record<string, string>; // playerId → letter
  bluffDeadline?: number; // ms timestamp
}

// ─── Question ─────────────────────────────────────────────────
export type QuestionType = "mcq" | "open";

export interface Question {
  id: string;
  text: string;
  choices: string[]; // empty [] for type:"open"
  correctIndex: number; // -1 for type:"open"
  correctAnswer?: string; // only for type:"open"
  timeLimit: number;
  theme: string;
  difficulty: Difficulty;
  type?: QuestionType; // default "mcq"
  imageUrl?: string;
  audioUrl?: string; // URL to audio file (mp3/ogg)
  videoUrl?: string; // URL to video file or YouTube embed
}
