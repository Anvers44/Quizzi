import type { Avatar } from "../types";

export interface LocalSession {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  role: "host" | "player";
  pseudo?: string;
  avatar?: Avatar;
}

const KEY = "quiz_session";

export function saveSession(session: LocalSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): LocalSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
