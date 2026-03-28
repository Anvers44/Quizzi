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

export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "classic" | "teams" | "tournament";
export type TeamId = "red" | "blue";

export interface GameConfig {
  mode: GameMode;
  themes: string[]; // multi-theme
  difficulty: Difficulty | "all";
  rounds: number;
  questionsPerRound: number;
  powersEnabled: boolean;
}

export interface Team {
  id: TeamId;
  name: string;
  score: number;
}

export type PowerType =
  | "blind"
  | "freeze"
  | "flip"
  | "shuffle"
  | "shield"
  | "double"
  | "mirror"
  | "ghost";

export const POWER_LABELS: Record<PowerType, string> = {
  blind: "💥 Aveugle",
  freeze: "❄️ Gèle",
  flip: "🔄 Retourne",
  shuffle: "🔀 Mélange",
  shield: "🛡️ Bouclier",
  double: "✨ Double",
  mirror: "🪞 Miroir",
  ghost: "👻 Fantôme",
};
export const POWER_DESC: Record<PowerType, string> = {
  blind: "Cache un choix à la cible 8s",
  freeze: "Bloque la cible 4s",
  flip: "Retourne l'écran de la cible 5s",
  shuffle: "Mélange les choix de la cible",
  shield: "Bloque la prochaine attaque",
  double: "Prochaine bonne réponse × 2",
  mirror: "Renvoie la prochaine attaque",
  ghost: "Inciblable cette question",
};

export const THEME_LABELS: Record<string, string> = {
  general: "🌍 Général",
  sport: "⚽ Sport",
  cinema: "🎬 Cinéma",
  music: "🎵 Musique",
  history: "📜 Histoire",
  geography: "🗺️ Géo",
  science: "🔬 Science",
  games: "🎮 Jeux vidéo",
  logos: "🏷️ Logos",
  flags: "🏳️ Drapeaux",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  all: "Tous les niveaux",
  easy: "⭐ Facile",
  medium: "⭐⭐ Moyen",
  hard: "⭐⭐⭐ Difficile",
};

export interface Player {
  id: string;
  sessionToken: string;
  roomCode: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
  connected: boolean;
  answeredQuestions: string[];
  teamId?: TeamId;
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
  currentRound: number;
  eliminatedPlayerIds: string[];
  teams: Record<TeamId, Team>;
}
