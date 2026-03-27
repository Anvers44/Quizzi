import { useEffect } from "react";
import { useRoom } from "../hooks/useRoom";
import { useTimer } from "../hooks/useTimer";
import { useAnswer } from "../hooks/useAnswer";
import { clearSession } from "../lib/session";
import { AVATAR_EMOJI } from "../types";
import Scoreboard from "../components/Scoreboard";
import type { Avatar } from "../types";

interface Props {
  roomCode: string;
  playerId: string;
  sessionToken: string;
  pseudo: string;
  avatar: Avatar;
  onLeave: () => void;
  onRoomClosed: () => void;
}

const COLORS = [
  "bg-red-500 hover:bg-red-400",
  "bg-blue-500 hover:bg-blue-400",
  "bg-yellow-500 hover:bg-yellow-400",
  "bg-green-500 hover:bg-green-400",
];
const COLORS_SENT = [
  "bg-red-800",
  "bg-blue-800",
  "bg-yellow-800",
  "bg-green-800",
];
const SHAPES = ["▲", "◆", "●", "■"];

function ConnBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`fixed top-3 right-3 text-xs px-2 py-1 rounded-full font-semibold z-50 ${connected ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300 animate-pulse"}`}
    >
      {connected ? "●" : "○"}
    </div>
  );
}

function PlayerQuestion({ roomCode, question }: any) {
  const timeLeft = useTimer(question.startedAt, question.timeLimit);
  const pct = Math.max(0, (timeLeft / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const { status, result, submitAnswer } = useAnswer();
  const answered = status === "sent" || status === "already";

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-between p-6 gap-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-indigo-300 text-sm mb-1">
          <span>
            Question {question.index + 1}/{question.total}
          </span>
          <span
            className={`font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
          >
            {timeLeft}s
          </span>
        </div>
        <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
          <div
            className={`${timerColor} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full max-w-sm">
        <p className="text-white text-xl font-bold text-center leading-snug">
          {question.text}
        </p>
      </div>

      {status === "sent" && result && (
        <div
          className={`w-full max-w-sm text-center rounded-2xl px-4 py-3 font-bold text-lg ${result.correct ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
        >
          {result.correct ? `✅ +${result.points} pts` : "❌ Raté !"}
        </div>
      )}
      {status === "already" && (
        <p className="text-yellow-400 font-semibold">⚡ Déjà répondu</p>
      )}

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {question.choices.map((choice: string, i: number) => (
          <button
            key={i}
            disabled={answered || status === "sending"}
            onClick={() => submitAnswer(roomCode, question.id, i)}
            className={`${answered ? COLORS_SENT[i] + " opacity-60" : COLORS[i]} disabled:cursor-not-allowed text-white font-bold rounded-2xl px-4 py-5 text-left transition flex flex-col gap-1`}
          >
            <span className="text-2xl">{SHAPES[i]}</span>
            <span className="text-sm leading-tight">{choice}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerReveal({ reveal, playerId, pseudo, avatar }: any) {
  const sorted = [...reveal.scores].sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore = reveal.scores.find((p: any) => p.id === playerId)?.score ?? 0;

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-6xl">{AVATAR_EMOJI[avatar]}</div>
      <h2 className="text-2xl font-bold text-white">{pseudo}</h2>
      <div className="bg-indigo-800 rounded-2xl px-8 py-4 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          Score
        </p>
        <p className="text-4xl font-extrabold text-yellow-400">{myScore}</p>
        <p className="text-indigo-300 text-sm">#{myRank} au classement</p>
      </div>
      <p className="text-indigo-300 animate-pulse">
        En attente de la prochaine question…
      </p>
      <div className="w-full max-w-sm">
        <Scoreboard players={reveal.scores} currentPlayerId={playerId} />
      </div>
    </div>
  );
}

function PlayerFinished({ scores, playerId, pseudo, avatar, onLeave }: any) {
  const sorted = [...scores].sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore = scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-7xl">{MEDALS[myRank] ?? AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-4xl font-extrabold text-white">Partie terminée !</h1>
      <div className="bg-indigo-800 rounded-2xl px-8 py-4 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          {pseudo}
        </p>
        <p className="text-4xl font-extrabold text-yellow-400">{myScore} pts</p>
        <p className="text-indigo-300 text-sm">#{myRank} au classement</p>
      </div>
      <div className="w-full max-w-sm">
        <Scoreboard players={scores} currentPlayerId={playerId} />
      </div>
      <button
        onClick={onLeave}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-10 py-3 rounded-2xl shadow-lg transition"
      >
        Retour à l'accueil
      </button>
    </div>
  );
}

export default function PlayerGame({
  roomCode,
  playerId,
  sessionToken,
  pseudo,
  avatar,
  onLeave,
  onRoomClosed,
}: Props) {
  const { connected, question, reveal, finished, roomClosed, kicked, leave } =
    useRoom({
      role: "player",
      roomCode,
      playerId,
      sessionToken,
    });

  useEffect(() => {
    if (roomClosed || kicked) {
      clearSession();
      onRoomClosed();
    }
  }, [roomClosed, kicked]);

  function handleLeave() {
    leave();
    clearSession();
    onLeave();
  }

  if (finished) {
    return (
      <>
        <ConnBadge connected={connected} />
        <PlayerFinished
          scores={finished.scores}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
          onLeave={handleLeave}
        />
      </>
    );
  }

  if (reveal) {
    return (
      <>
        <ConnBadge connected={connected} />
        <PlayerReveal
          reveal={reveal}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
        />
      </>
    );
  }

  if (question) {
    return (
      <>
        <ConnBadge connected={connected} />
        <PlayerQuestion roomCode={roomCode} question={question} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6">
      <ConnBadge connected={connected} />
      <div className="text-6xl">{AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-2xl font-bold text-white">{pseudo}</h1>
      <p className="text-indigo-300 animate-pulse">En attente…</p>
      <button
        onClick={handleLeave}
        className="text-sm text-indigo-500 hover:text-red-400 transition mt-4"
      >
        ✕ Quitter
      </button>
    </div>
  );
}
