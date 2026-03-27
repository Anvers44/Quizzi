import { describe, it, expect } from "vitest";

function calcScore(
  choiceIndex: number,
  correctIndex: number,
  elapsedSeconds: number,
  timeLimit: number,
) {
  const correct = choiceIndex === correctIndex;
  const timeBonus = correct
    ? Math.round(500 * Math.max(0, (timeLimit - elapsedSeconds) / timeLimit))
    : 0;
  return { correct, points: correct ? 1000 + timeBonus : 0 };
}

describe("Calcul du score", () => {
  it("bonne réponse immédiate = 1500 pts", () => {
    const { correct, points } = calcScore(2, 2, 0, 20);
    expect(correct).toBe(true);
    expect(points).toBe(1500);
  });

  it("bonne réponse à mi-temps = 1250 pts", () => {
    expect(calcScore(1, 1, 10, 20).points).toBe(1250);
  });

  it("mauvaise réponse = 0 pts", () => {
    const { correct, points } = calcScore(0, 2, 5, 20);
    expect(correct).toBe(false);
    expect(points).toBe(0);
  });

  it("réponse après timeLimit = 1000 pts (pas de bonus)", () => {
    expect(calcScore(3, 3, 25, 20).points).toBe(1000);
  });
});

describe("Génération du roomCode", () => {
  function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  it("fait exactement 6 caractères", () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it("ne contient pas I ou O", () => {
    for (let i = 0; i < 100; i++)
      expect(generateRoomCode()).not.toMatch(/[IO]/);
  });

  it("ne contient que des majuscules", () => {
    expect(generateRoomCode()).toMatch(/^[A-Z]+$/);
  });
});
