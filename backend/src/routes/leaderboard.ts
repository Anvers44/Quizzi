import { Router } from "express";
import { db } from "../db/client";

export const leaderboardRouter = Router();

// ─── Global leaderboard (filtrable par mode) ──────────────────
// GET /api/leaderboard?mode=all|classic|teams|tournament&limit=50
leaderboardRouter.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         u.id       AS user_id,
         u.username,
         COUNT(pgs.id)::INT                                   AS games_played,
         SUM(CASE WHEN pgs.is_winner THEN 1 ELSE 0 END)::INT AS wins,
         MAX(pgs.score)                                        AS best_score,
         ROUND(AVG(pgs.score))::INT                           AS avg_score,
         SUM(pgs.score)::INT                                   AS total_score
       FROM users u
       JOIN player_game_stats pgs ON pgs.user_id = u.id
       GROUP BY u.id, u.username
       ORDER BY total_score DESC
       LIMIT $1`,
      [50],
    );
    return res.json({ leaderboard: result.rows });
  } catch (e: any) {
    console.error("[leaderboard]", e.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Detailed stats for one user ──────────────────────────────
// GET /api/leaderboard/stats/:userId
leaderboardRouter.get("/stats/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Global summary
    const general = await db.query(
      `SELECT
         COUNT(pgs.id)::INT                                           AS games_played,
         SUM(CASE WHEN pgs.is_winner THEN 1 ELSE 0 END)::INT         AS wins,
         COALESCE(MAX(pgs.score), 0)                                  AS best_score,
         COALESCE(ROUND(AVG(pgs.score))::INT, 0)                     AS avg_score,
         COALESCE(SUM(pgs.score)::INT, 0)                            AS total_score
       FROM player_game_stats pgs
       WHERE pgs.user_id = $1`,
      [userId],
    );

    // Per-mode breakdown
    const byMode = await db.query(
      `SELECT
         mode,
         COUNT(id)::INT                                               AS games,
         SUM(CASE WHEN is_winner THEN 1 ELSE 0 END)::INT             AS wins,
         COALESCE(MAX(score), 0)                                      AS best,
         COALESCE(ROUND(AVG(score))::INT, 0)                         AS avg
       FROM player_game_stats
       WHERE user_id = $1
       GROUP BY mode`,
      [userId],
    );

    // Per-theme accuracy + avg response time
    const byTheme = await db.query(
      `SELECT
         theme,
         COUNT(*)::INT                                                                       AS attempts,
         SUM(CASE WHEN correct THEN 1 ELSE 0 END)::INT                                      AS correct_count,
         ROUND(
           SUM(CASE WHEN correct THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0) * 100
         )::INT                                                                              AS accuracy_pct,
         ROUND(AVG(time_taken)::NUMERIC, 2)                                                 AS avg_time,
         ROUND(AVG(CASE WHEN correct THEN time_taken END)::NUMERIC, 2)                      AS avg_time_correct,
         COALESCE(ROUND(AVG(CASE WHEN correct THEN points_earned ELSE 0 END))::INT, 0)      AS avg_pts
       FROM answer_logs
       WHERE user_id = $1
       GROUP BY theme
       ORDER BY accuracy_pct DESC NULLS LAST`,
      [userId],
    );

    // Best theme (min 5 attempts, sorted by accuracy)
    const bestTheme = await db.query(
      `SELECT
         theme,
         ROUND(
           SUM(CASE WHEN correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100
         )::INT AS accuracy_pct,
         ROUND(AVG(time_taken)::NUMERIC, 2) AS avg_time
       FROM answer_logs
       WHERE user_id = $1
       GROUP BY theme
       HAVING COUNT(*) >= 5
       ORDER BY accuracy_pct DESC
       LIMIT 1`,
      [userId],
    );

    // Worst theme (min 5 attempts)
    const worstTheme = await db.query(
      `SELECT
         theme,
         ROUND(
           SUM(CASE WHEN correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100
         )::INT AS accuracy_pct
       FROM answer_logs
       WHERE user_id = $1
       GROUP BY theme
       HAVING COUNT(*) >= 5
       ORDER BY accuracy_pct ASC
       LIMIT 1`,
      [userId],
    );

    // Global timing
    const timing = await db.query(
      `SELECT
         ROUND(AVG(time_taken)::NUMERIC, 2)                              AS avg_time_all,
         ROUND(AVG(CASE WHEN correct THEN time_taken END)::NUMERIC, 2)   AS avg_time_correct,
         ROUND(AVG(CASE WHEN NOT correct THEN time_taken END)::NUMERIC, 2) AS avg_time_wrong
       FROM answer_logs
       WHERE user_id = $1`,
      [userId],
    );

    // Total answers
    const totals = await db.query(
      `SELECT
         COUNT(*)::INT                                                AS total_answers,
         SUM(CASE WHEN correct THEN 1 ELSE 0 END)::INT              AS total_correct
       FROM answer_logs
       WHERE user_id = $1`,
      [userId],
    );

    return res.json({
      general: general.rows[0],
      byMode: byMode.rows,
      byTheme: byTheme.rows,
      bestTheme: bestTheme.rows[0] ?? null,
      worstTheme: worstTheme.rows[0] ?? null,
      timing: timing.rows[0],
      totals: totals.rows[0],
    });
  } catch (e: any) {
    console.error("[leaderboard/stats]", e.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});
