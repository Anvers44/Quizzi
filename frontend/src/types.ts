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

export const AVATAR_EMOJI: Record<Avatar, string> = {
  fox: "🦊",
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
  bear: "🐻",
  panda: "🐼",
  owl: "🦉",
  frog: "🐸",
  lion: "🦁",
  tiger: "🐯",
  penguin: "🐧",
  koala: "🐨",
  wolf: "🐺",
  duck: "🦆",
  hamster: "🐹",
  dragon: "🐲",
};

// ─── Difficulty / Game mode ───────────────────────────────────
export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "classic" | "teams" | "tournament";

// ─── Teams (6) ───────────────────────────────────────────────
export type TeamId = "red" | "blue" | "green" | "yellow" | "purple" | "orange";
export const ALL_TEAM_IDS: TeamId[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];
export const TEAM_META: Record<
  TeamId,
  {
    label: string;
    emoji: string;
    bg: string;
    border: string;
    text: string;
    light: string;
  }
> = {
  red: {
    label: "Rouge",
    emoji: "🔴",
    bg: "bg-red-500",
    border: "border-red-400",
    text: "text-red-300",
    light: "bg-red-500/10",
  },
  blue: {
    label: "Bleue",
    emoji: "🔵",
    bg: "bg-blue-500",
    border: "border-blue-400",
    text: "text-blue-300",
    light: "bg-blue-500/10",
  },
  green: {
    label: "Verte",
    emoji: "🟢",
    bg: "bg-green-500",
    border: "border-green-400",
    text: "text-green-300",
    light: "bg-green-500/10",
  },
  yellow: {
    label: "Jaune",
    emoji: "🟡",
    bg: "bg-yellow-500",
    border: "border-yellow-400",
    text: "text-yellow-300",
    light: "bg-yellow-500/10",
  },
  purple: {
    label: "Violette",
    emoji: "🟣",
    bg: "bg-purple-500",
    border: "border-purple-400",
    text: "text-purple-300",
    light: "bg-purple-500/10",
  },
  orange: {
    label: "Orange",
    emoji: "🟠",
    bg: "bg-orange-500",
    border: "border-orange-400",
    text: "text-orange-300",
    light: "bg-orange-500/10",
  },
};

// ─── Powers ───────────────────────────────────────────────────
export type AttackPower = "blind" | "freeze" | "flip" | "shuffle";
export type DefensePower = "shield" | "double" | "mirror" | "ghost";
export type PowerType = AttackPower | DefensePower;

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
  blind: "Cache un choix à la cible",
  freeze: "Bloque la cible 4s",
  flip: "Retourne l'écran de la cible",
  shuffle: "Mélange les choix",
  shield: "Bloque la prochaine attaque",
  double: "Prochaine réponse × 2",
  mirror: "Renvoie la prochaine attaque",
  ghost: "Inciblable cette question",
};

// ─── Themes ───────────────────────────────────────────────────
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
  all: "Tous niveaux",
  easy: "⭐ Facile",
  medium: "⭐⭐ Moyen",
  hard: "⭐⭐⭐ Difficile",
};

// ─── Game config ─────────────────────────────────────────────
export interface GameConfig {
  mode: GameMode;
  themes: string[];
  difficulty: Difficulty | "all";
  rounds: number;
  questionsPerRound: number;
  powersEnabled: boolean;
  teamCount: number;
  bluffEnabled: boolean; // ← NEW
}

export interface Team {
  id: string;
  name: string;
  score: number;
}
export interface Player {
  id: string;
  pseudo: string;
  avatar: Avatar;
  score: number;
  connected: boolean;
  teamId?: string;
  specialtyTheme?: string | null;
}
export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  timeLimit: number;
  theme: string;
  difficulty: Difficulty;
  type?: "mcq" | "open";
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  correctAnswer?: string;
}

export type RoomStatus =
  | "lobby"
  | "playing"
  | "paused"
  | "revealing"
  | "round_end"
  | "finished"
  | "bluff_input"
  | "bluff_voting";

export interface GameState {
  roomCode: string;
  status: RoomStatus;
  config: GameConfig;
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  currentRound: number;
  eliminatedPlayerIds: string[];
  teams: Record<string, Team>;
}

// ─── Bluff ────────────────────────────────────────────────────
export interface BluffOption {
  letter: string;
  text: string;
  isReal?: boolean;
  authorId?: string;
}

// ─── Settings ────────────────────────────────────────────────
export interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}
export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
};
export function loadSettings(): AppSettings {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(localStorage.getItem("quiz_settings") || "{}"),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export function saveSettings(s: AppSettings) {
  localStorage.setItem("quiz_settings", JSON.stringify(s));
}
