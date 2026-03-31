import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { roomRouter } from "./routes/room";
import { playerRouter } from "./routes/player";
import { answerRouter } from "./routes/answer";
import { authRouter } from "./routes/auth"; // ✅ ajout
import { registerSocketHandlers } from "./socketHandlers";
import { leaderboardRouter } from "./routes/leaderboard"; // ajout
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socket-events";

const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") ?? [
    "http://localhost:5173",
  ],
};

const app = express();
const httpServer = createServer(app);

app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }),
);
app.use(express.json());

app.use("/api/auth", authRouter); // ✅ ajout
app.use("/api/leaderboard", leaderboardRouter); // ajout
app.use("/api/rooms", roomRouter);
app.use("/api/rooms", playerRouter);
app.use("/api/rooms", answerRouter);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 10000,
  pingInterval: 5000,
});

registerSocketHandlers(io);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: Date.now(), env: config.nodeEnv });
});

httpServer.listen(config.port, config.host, () => {
  console.log(`[backend] listening on ${config.host}:${config.port}`);
  console.log(`[backend] Redis: ${config.redisUrl}`);
});

import("./redis/client").then(({ redis }) => redis.connect().catch(() => {}));
