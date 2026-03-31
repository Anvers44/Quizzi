import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/client";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "quiz-secret-dev";
const SALT_ROUNDS = 10;

// ─── Register ─────────────────────────────────────────────────
authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || username.trim().length < 2)
    return res.status(400).json({ error: "Pseudo min 2 caractères" });
  if (username.trim().length > 30)
    return res.status(400).json({ error: "Pseudo max 30 caractères" });
  if (!password || password.length < 4)
    return res.status(400).json({ error: "Mot de passe min 4 caractères" });

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
      [username.trim().toLowerCase(), hash],
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "30d" },
    );
    return res
      .status(201)
      .json({ token, userId: user.id, username: user.username });
  } catch (e: any) {
    if (e.code === "23505")
      return res.status(409).json({ error: "Ce pseudo est déjà pris" });
    console.error("[auth] register:", e.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Login ────────────────────────────────────────────────────
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password)
    return res.status(400).json({ error: "Paramètres manquants" });

  try {
    const result = await db.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username.trim().toLowerCase()],
    );
    if (!result.rows.length)
      return res.status(401).json({ error: "Identifiants incorrects" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Identifiants incorrects" });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "30d" },
    );
    return res.json({ token, userId: user.id, username: user.username });
  } catch (e: any) {
    console.error("[auth] login:", e.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Me (validate token) ──────────────────────────────────────
authRouter.get("/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Non authentifié" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
    };
    return res.json({ userId: payload.userId, username: payload.username });
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
});

// ─── Helper: extract userId from Bearer token (nullable) ──────
export function extractUserId(authHeader?: string): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}
