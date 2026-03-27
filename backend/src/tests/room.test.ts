import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../redis/helpers", () => ({
  saveRoom: vi.fn().mockResolvedValue(undefined),
  getRoom: vi.fn(),
  deleteRoom: vi.fn().mockResolvedValue(undefined),
  recordAnswerIfNew: vi.fn(),
}));

import { getRoom, saveRoom, recordAnswerIfNew } from "../redis/helpers";
import type { GameState } from "../types";
import { QUESTIONS } from "../data/questions";

function makeRoom(overrides: Partial<GameState> = {}): GameState {
  return {
    roomCode: "ABCDEF",
    hostSocketId: "",
    status: "lobby",
    players: {},
    questions: QUESTIONS,
    currentQuestionIndex: 0,
    questionStartedAt: null,
    ...overrides,
  };
}

describe("Room helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saveRoom est appelé avec le bon état", async () => {
    const state = makeRoom();
    await saveRoom(state);
    expect(saveRoom).toHaveBeenCalledWith(state);
  });

  it("getRoom retourne null si la room n'existe pas", async () => {
    vi.mocked(getRoom).mockResolvedValueOnce(null);
    expect(await getRoom("XXXXXX")).toBeNull();
  });

  it("getRoom retourne l'état correct", async () => {
    const state = makeRoom();
    vi.mocked(getRoom).mockResolvedValueOnce(state);
    const result = await getRoom("ABCDEF");
    expect(result?.roomCode).toBe("ABCDEF");
    expect(result?.status).toBe("lobby");
  });
});

describe("Anti double-soumission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne true à la première réponse", async () => {
    vi.mocked(recordAnswerIfNew).mockResolvedValueOnce(true);
    const answer = {
      playerId: "p1",
      questionId: "q1",
      choiceIndex: 0,
      answeredAt: Date.now(),
      correct: true,
      points: 1200,
    };
    expect(await recordAnswerIfNew(answer, "ABCDEF")).toBe(true);
  });

  it("retourne false si déjà répondu", async () => {
    vi.mocked(recordAnswerIfNew).mockResolvedValueOnce(false);
    const answer = {
      playerId: "p1",
      questionId: "q1",
      choiceIndex: 0,
      answeredAt: Date.now(),
      correct: true,
      points: 1200,
    };
    expect(await recordAnswerIfNew(answer, "ABCDEF")).toBe(false);
  });
});

describe("Questions statiques", () => {
  it("contient 5 questions", () => {
    expect(QUESTIONS).toHaveLength(5);
  });
  it("chaque question a 4 choix", () => {
    QUESTIONS.forEach((q) => expect(q.choices).toHaveLength(4));
  });
  it("correctIndex est entre 0 et 3", () => {
    QUESTIONS.forEach((q) => {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    });
  });
});
