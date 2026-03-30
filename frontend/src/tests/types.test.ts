import { describe, it, expect } from "vitest";
import { AVATARS, AVATAR_EMOJI } from "../types";

describe("Avatars", () => {
  it("AVATARS contient 16 entrées", () => {
    expect(AVATARS).toHaveLength(16);
  });

  it("chaque avatar a un emoji", () => {
    AVATARS.forEach((a) => {
      expect(AVATAR_EMOJI[a]).toBeTruthy();
      expect(typeof AVATAR_EMOJI[a]).toBe("string");
    });
  });

  it("pas de doublon dans AVATARS", () => {
    expect(new Set(AVATARS).size).toBe(AVATARS.length);
  });
});
