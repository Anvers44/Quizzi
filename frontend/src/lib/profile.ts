import type { Avatar } from "../types";

export interface PlayerProfile {
  pseudo: string;
  avatar: Avatar;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
}

const KEY = "quiz_profile";

export function loadProfile(): PlayerProfile | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

// Appelé à la fin d'une partie
export function updateStats(score: number, isWin: boolean): void {
  const profile = loadProfile();
  if (!profile) return;
  profile.gamesPlayed += 1;
  profile.totalScore += score;
  if (isWin) profile.wins += 1;
  saveProfile(profile);
}
