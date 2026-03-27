import { describe, it, expect, beforeEach } from "vitest";

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

const KEY = "quiz_session";
interface LocalSession {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  role: "host" | "player";
  pseudo?: string;
  avatar?: string;
}
function saveSession(s: LocalSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
function loadSession(): LocalSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function clearSession() {
  localStorage.removeItem(KEY);
}

describe("Session localStorage", () => {
  beforeEach(() => localStorageMock.clear());

  it("retourne null si aucune session", () => {
    expect(loadSession()).toBeNull();
  });

  it("sauvegarde et recharge une session joueur", () => {
    saveSession({
      roomCode: "ABCDEF",
      playerId: "p1",
      sessionToken: "tok1",
      role: "player",
      pseudo: "Alice",
      avatar: "fox",
    });
    const s = loadSession();
    expect(s?.roomCode).toBe("ABCDEF");
    expect(s?.pseudo).toBe("Alice");
  });

  it("sauvegarde et recharge une session host", () => {
    saveSession({
      roomCode: "XYZABC",
      playerId: "host",
      sessionToken: "host",
      role: "host",
    });
    expect(loadSession()?.role).toBe("host");
  });

  it("clearSession supprime la session", () => {
    saveSession({
      roomCode: "ABCDEF",
      playerId: "p1",
      sessionToken: "tok1",
      role: "player",
    });
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("écrase l'ancienne session", () => {
    saveSession({
      roomCode: "AAAA11",
      playerId: "p1",
      sessionToken: "t1",
      role: "player",
    });
    saveSession({
      roomCode: "BBBB22",
      playerId: "p2",
      sessionToken: "t2",
      role: "host",
    });
    expect(loadSession()?.roomCode).toBe("BBBB22");
  });
});
