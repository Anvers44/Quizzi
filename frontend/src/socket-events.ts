import type {
  GameConfig,
  PowerType,
  AttackPower,
  DefensePower,
  Avatar,
  BluffOption,
} from "./types";

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: string;
  score: number;
  connected: boolean;
  teamId?: string;
  attackPower?: AttackPower | null;
  defensePower?: DefensePower | null;
  attackUsed?: boolean;
  defenseUsed?: boolean;
  isEliminated?: boolean;
  activeEffectTypes?: PowerType[];
  hasAnswered?: boolean;
  hasSubmittedBluff?: boolean;
  specialtyTheme?: string | null;
}
export interface TeamPublic {
  id: string;
  name: string;
  score: number;
}

export interface RoomStatePayload {
  roomCode: string;
  status:
    | "lobby"
    | "playing"
    | "paused"
    | "revealing"
    | "round_end"
    | "finished"
    | "bluff_input"
    | "bluff_voting";
  config: GameConfig;
  players: PublicPlayer[];
  currentQuestionIndex: number;
  currentRound: number;
  teams: Record<string, TeamPublic>;
  eliminatedPlayerIds: string[];
}

export interface QuestionPayload {
  id: string;
  text: string;
  choices: string[];
  timeLimit: number;
  index: number;
  total: number;
  startedAt: number;
  isRoundStart: boolean;
  round: number;
  totalRounds: number;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  difficulty: "easy" | "medium" | "hard";
  theme: string;
  questionType: "mcq" | "open";
}

export interface RevealPayload {
  questionId: string;
  correctIndex: number;
  scores: PublicPlayer[];
  playerAnswers: Record<string, number>;
  teams: Record<string, TeamPublic>;
  pointsEarned: Record<string, number>;
  timeTaken: Record<string, number>;
  questionTheme: string;
}

export interface RoundEndPayload {
  round: number;
  totalRounds: number;
  scores: PublicPlayer[];
  teams: Record<string, TeamPublic>;
  eliminatedPlayerId?: string;
  eliminatedPseudo?: string;
  perfectBonuses: Record<string, number>;
}

export interface FinishedPayload {
  scores: PublicPlayer[];
  teams: Record<string, TeamPublic>;
  winnerId?: string;
  winnerTeamId?: string;
}

export interface PowerEffectPayload {
  type: PowerType;
  fromPlayerId: string;
  fromPseudo: string;
  fromAvatar: string;
  targetPlayerId: string;
  hiddenChoiceIndex?: number;
  newChoiceOrder?: number[];
}

// ─── Bluff ────────────────────────────────────────────────────
export interface BluffInputPayload {
  id: string;
  text: string;
  theme: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  startedAt: number;
  isRoundStart: boolean;
  round: number;
  totalRounds: number;
  imageUrl?: string;
}
export interface BluffVotePayload {
  options: Array<{ letter: string; text: string }>;
  timeLimit: number;
  startedAt: number;
  question: string;
}
export interface BluffRevealPayload {
  questionId: string;
  question: string;
  correctAnswer: string;
  options: BluffOption[];
  votes: Record<string, string>;
  pointsEarned: Record<string, number>;
  scores: PublicPlayer[];
  teams: Record<string, TeamPublic>;
  authorPseudos: Record<string, string>;
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
  "host:assign_teams": (d: {
    roomCode: string;
    assignments: Record<string, string>;
  }) => void;
  "player:use_attack": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
    targetPlayerId: string;
  }) => void;
  "player:use_defense": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  }) => void;
  "player:bluff_submit": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
    text: string;
  }) => void;
  "player:bluff_vote": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
    letter: string;
  }) => void;
}

export interface ServerToClientEvents {
  "room:state": (s: RoomStatePayload) => void;
  "player:joined": (p: PublicPlayer) => void;
  "player:disconnected": (d: { playerId: string }) => void;
  "player:reconnected": (d: { playerId: string }) => void;
  "player:answered": (d: { playerId: string }) => void;
  "room:closed": () => void;
  "player:kicked": (d: { playerId: string }) => void;
  "question:start": (d: QuestionPayload) => void;
  "question:reveal": (d: RevealPayload) => void;
  "game:paused": (d: { timeLeft: number }) => void;
  "game:resumed": (d: { startedAt: number }) => void;
  "game:round_end": (d: RoundEndPayload) => void;
  "game:finished": (d: FinishedPayload) => void;
  "team:update": (d: { teams: Record<string, TeamPublic> }) => void;
  "powers:assigned": (d: {
    attackPower: AttackPower;
    defensePower: DefensePower;
  }) => void;
  "power:effect": (d: PowerEffectPayload) => void;
  "power:blocked": (d: { byShield: boolean; mirrorSent: boolean }) => void;
  "bluff:input_start": (d: BluffInputPayload) => void;
  "bluff:submitted": (d: {
    playerId: string;
    count: number;
    total: number;
  }) => void;
  "bluff:vote_start": (d: BluffVotePayload) => void;
  "bluff:voted": (d: { playerId: string }) => void;
  "bluff:reveal": (d: BluffRevealPayload) => void;
  error: (d: { message: string }) => void;
}
