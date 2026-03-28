import type { GameState, Player, PowerType, TeamId } from "./types";

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: Player["avatar"];
  score: number;
  connected: boolean;
  teamId?: TeamId;
  currentPower?: PowerType | null;
  isEliminated?: boolean;
  // active effect types visible to everyone
  activeEffectTypes?: PowerType[];
}

export interface RoomStatePayload {
  roomCode: string;
  status: GameState["status"];
  config: GameState["config"];
  players: PublicPlayer[];
  currentQuestionIndex: number;
  currentRound: number;
  teams: GameState["teams"];
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
  round: number;
  totalRounds: number;
}

export interface RevealPayload {
  questionId: string;
  correctIndex: number;
  scores: PublicPlayer[];
  playerAnswers: Record<string, number>;
  teams: GameState["teams"];
}

export interface RoundEndPayload {
  round: number;
  totalRounds: number;
  scores: PublicPlayer[];
  teams: GameState["teams"];
  eliminatedPlayerId?: string; // tournament
  eliminatedPseudo?: string;
}

export interface FinishedPayload {
  scores: PublicPlayer[];
  teams: GameState["teams"];
  winnerId?: string;
  winnerTeamId?: TeamId;
}

export interface PowerAssignedPayload {
  power: PowerType;
}

export interface PowerEffectPayload {
  type: PowerType;
  fromPlayerId: string;
  fromPseudo: string;
  // blind: which index to hide
  hiddenChoiceIndex?: number;
  // shuffle: new order
  newChoiceOrder?: number[];
}

// ─── Client → Server ────────────────────────────────────────
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
    assignments: Record<string, TeamId>;
  }) => void;
  "player:use_power": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
    targetPlayerId: string;
  }) => void;
}

// ─── Server → Client ────────────────────────────────────────
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
  "game:round_end": (d: RoundEndPayload) => void;
  "game:finished": (d: FinishedPayload) => void;
  "team:update": (d: { teams: GameState["teams"] }) => void;
  "power:assigned": (d: PowerAssignedPayload) => void;
  "power:effect": (d: PowerEffectPayload) => void;
  "power:blocked": (d: { byShield: boolean; mirrorSent: boolean }) => void;
  error: (d: { message: string }) => void;
}
