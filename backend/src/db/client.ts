import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://quiz:quizpass@localhost:5432/quiz",
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => console.error("[db] pool error:", err.message));

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
};

export async function initDB(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username    VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS game_results (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_code    VARCHAR(10) NOT NULL,
      mode         VARCHAR(20) NOT NULL,
      player_count INTEGER DEFAULT 0,
      ended_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS player_game_stats (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
      game_id    UUID REFERENCES game_results(id) ON DELETE CASCADE,
      pseudo     VARCHAR(50) NOT NULL,
      score      INTEGER DEFAULT 0,
      rank       INTEGER DEFAULT 0,
      is_winner  BOOLEAN DEFAULT FALSE,
      team_id    VARCHAR(20),
      mode       VARCHAR(20) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answer_logs (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      question_id   VARCHAR(100) NOT NULL,
      theme         VARCHAR(50)  NOT NULL,
      difficulty    VARCHAR(20)  NOT NULL,
      correct       BOOLEAN      NOT NULL,
      time_taken    FLOAT        NOT NULL,
      points_earned INTEGER DEFAULT 0,
      answered_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pgs_user    ON player_game_stats(user_id);
    CREATE INDEX IF NOT EXISTS idx_pgs_mode    ON player_game_stats(mode);
    CREATE INDEX IF NOT EXISTS idx_alogs_user  ON answer_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_alogs_theme ON answer_logs(user_id, theme);
  `);
  console.log("[db] schema ready");
}
