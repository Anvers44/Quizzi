import type {
  GameConfig,
  GameState,
  Player,
  PowerType,
  AttackPower,
  DefensePower,
  Avatar,
} from "./types";

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: Player["avatar"];
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
  specialtyTheme?: string | null;
}

export interface RoomStatePayload {
  roomCode: string;
  status: GameState["status"];
  config: GameConfig;
  players: PublicPlayer[];
  currentQuestionIndex: number;
  currentRound: number;
  teams: Record<string, { id: string; name: string; score: number }>;
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
  isRoundStart: boolean; // true only for first question of each round
  round: number;
  totalRounds: number;
  imageUrl?: string;
  difficulty: "easy" | "medium" | "hard";
  theme: string;
}

export interface RevealPayload {
  questionId: string;
  correctIndex: number;
  scores: PublicPlayer[];
  playerAnswers: Record<string, number>;
  teams: Record<string, { id: string; name: string; score: number }>;
  pointsEarned: Record<string, number>;
  timeTaken: Record<string, number>;
  questionTheme: string;
}

export interface RoundEndPayload {
  round: number;
  totalRounds: number;
  scores: PublicPlayer[];
  teams: Record<string, { id: string; name: string; score: number }>;
  eliminatedPlayerId?: string;
  eliminatedPseudo?: string;
  perfectBonuses: Record<string, number>;
}

export interface FinishedPayload {
  scores: PublicPlayer[];
  teams: Record<string, { id: string; name: string; score: number }>;
  winnerId?: string;
  winnerTeamId?: string;
}

export interface PowerEffectPayload {
  type: PowerType;
  fromPlayerId: string;
  fromPseudo: string;
  fromAvatar: Avatar;
  targetPlayerId: string;
  hiddenChoiceIndex?: number;
  newChoiceOrder?: number[];
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
  "team:update": (d: {
    teams: Record<string, { id: string; name: string; score: number }>;
  }) => void;
  "powers:assigned": (d: {
    attackPower: AttackPower;
    defensePower: DefensePower;
  }) => void;
  "power:effect": (d: PowerEffectPayload) => void;
  "power:blocked": (d: { byShield: boolean; mirrorSent: boolean }) => void;
  error: (d: { message: string }) => void;
}
