const SESSION_KEY = "quiz_session";

export interface Session {
  roomCode: string;
  playerId?: string;
  sessionToken?: string;
  role: "host" | "player";
  pseudo?: string;
  avatar?: string;
  specialtyTheme?: string | null; // ← thème spécialité du joueur
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
