import type { GameConfig, GameState, Player, PowerType, TeamId } from "./types";

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: Player["avatar"];
  score: number;
  connected: boolean;
  teamId?: TeamId;
  currentPower?: PowerType | null;
  isEliminated?: boolean;
  activeEffectTypes?: PowerType[];
}

export interface RoomStatePayload {
  roomCode: string;
  status: GameState["status"];
  config: GameConfig;
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
  imageUrl?: string; // ← for flag/image questions
  difficulty: "easy" | "medium" | "hard";
}

export interface RevealPayload {
  questionId: string;
  correctIndex: number;
  scores: PublicPlayer[];
  playerAnswers: Record<string, number>;
  teams: GameState["teams"];
  pointsEarned: Record<string, number>; // ← playerId → pts this question
}

export interface RoundEndPayload {
  round: number;
  totalRounds: number;
  scores: PublicPlayer[];
  teams: GameState["teams"];
  eliminatedPlayerId?: string;
  eliminatedPseudo?: string;
}

export interface FinishedPayload {
  scores: PublicPlayer[];
  teams: GameState["teams"];
  winnerId?: string;
  winnerTeamId?: TeamId;
}

export interface PowerEffectPayload {
  type: PowerType;
  fromPlayerId: string;
  fromPseudo: string;
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
    assignments: Record<string, TeamId>;
  }) => void;
  "player:use_power": (d: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
    targetPlayerId: string;
  }) => void;
}

export interface ServerToClientEvents {
  "room:state": (s: RoomStatePayload) => void;
  "player:joined": (p: PublicPlayer) => void;
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
  "power:assigned": (d: { power: PowerType }) => void;
  "power:effect": (d: PowerEffectPayload) => void;
  "power:blocked": (d: { byShield: boolean; mirrorSent: boolean }) => void;
  error: (d: { message: string }) => void;
}
