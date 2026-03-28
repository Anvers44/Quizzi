import { useEffect, useRef } from "react";
import { useRoom } from "../hooks/useRoom";
import { useAnswer } from "../hooks/useAnswer";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { AVATAR_EMOJI } from "../types";
import { playTickBeep, vibrate } from "../lib/sound";
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
  "bg-red-500 active:bg-red-600",
  "bg-blue-500 active:bg-blue-600",
  "bg-yellow-500 active:bg-yellow-600",
  "bg-green-500 active:bg-green-600",
];
const COLORS_SENT = [
  "bg-red-800",
  "bg-blue-800",
  "bg-yellow-800",
  "bg-green-800",
];
const COLORS_DIM = [
  "bg-red-500/30",
  "bg-blue-500/30",
  "bg-yellow-500/30",
  "bg-green-500/30",
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

// ── Lobby ─────────────────────────────────────────────────────────────────────
function Lobby({
  roomCode,
  playerId,
  pseudo,
  avatar,
  players,
  connected,
  onLeave,
}: any) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6 overflow-hidden">
      <div className="w-full max-w-sm flex justify-between items-center">
        <div
          className={`text-xs px-3 py-1 rounded-full font-semibold ${connected ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300 animate-pulse"}`}
        >
          {connected ? "● Connecté" : "○ Reconnexion…"}
        </div>
        <button
          onClick={onLeave}
          className="text-sm text-indigo-400 font-semibold"
        >
          ✕ Quitter
        </button>
      </div>
      <div className="text-6xl">{AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-2xl font-extrabold text-white">{pseudo}</h1>
      <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          Partie
        </p>
        <p className="text-2xl font-bold text-white tracking-widest">
          {roomCode}
        </p>
      </div>
      <p className="text-indigo-300 text-base animate-pulse">
        En attente du début…
      </p>
      {players.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-xs">
          {players
            .filter((p: any) => p.id !== playerId)
            .map((p: any) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${p.connected ? "bg-indigo-700" : "opacity-40 bg-indigo-900"}`}
              >
                <span className="text-lg">{AVATAR_EMOJI[p.avatar]}</span>
                <span className="text-white text-sm font-semibold">
                  {p.pseudo}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Question ──────────────────────────────────────────────────────────────────
function QuestionScreen({ roomCode, question, paused, pausedTimeLeft }: any) {
  const timeLeft = useTimer(question.startedAt, question.timeLimit, paused);
  const displayTime = paused ? pausedTimeLeft : timeLeft;
  const pct = Math.max(0, (displayTime / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const { status, submitAnswer } = useAnswer();
  const answered = status === "sent" || status === "already";
  const lastBeep = useRef(-1);

  // Son + vibration sur les 5 dernières secondes
  useEffect(() => {
    if (
      !paused &&
      displayTime <= 5 &&
      displayTime > 0 &&
      displayTime !== lastBeep.current
    ) {
      lastBeep.current = displayTime;
      playTickBeep();
      vibrate(50);
    }
  }, [displayTime, paused]);

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-4 overflow-hidden">
      <div className="w-full max-w-sm pt-2">
        <div className="flex justify-between text-indigo-300 text-sm mb-1">
          <span>
            Q{question.index + 1}/{question.total}
          </span>
          <span
            className={`font-bold tabular-nums ${displayTime <= 5 && !paused ? "text-red-400 animate-pulse" : "text-white"}`}
          >
            {paused ? "⏸ " : ""}
            {displayTime}s
          </span>
        </div>
        <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
          <div
            className={`${timerColor} h-3 rounded-full transition-all duration-200`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {paused && (
        <div className="bg-indigo-700/80 rounded-2xl px-6 py-2 text-white font-bold text-center text-sm">
          ⏸ Partie en pause
        </div>
      )}

      <div className="flex-1 flex items-center justify-center w-full max-w-sm px-2">
        <p className="text-white text-lg font-bold text-center leading-snug">
          {question.text}
        </p>
      </div>

      <div className="w-full max-w-sm min-h-8 flex items-center justify-center">
        {answered && !paused && (
          <p className="text-indigo-300 text-sm font-semibold text-center">
            ⏳ Réponse envoyée — résultat à la fin du compte à rebours
          </p>
        )}
        {status === "sending" && (
          <p className="text-indigo-400 text-sm animate-pulse">Envoi…</p>
        )}
        {status === "error" && (
          <p className="text-red-400 text-sm">Erreur — réessaie</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-sm pb-2">
        {question.choices.map((choice: string, i: number) => (
          <button
            key={i}
            disabled={answered || status === "sending" || paused}
            onClick={() => submitAnswer(roomCode, question.id, i)}
            className={`${answered ? COLORS_SENT[i] + " opacity-60" : paused ? COLORS_SENT[i] + " opacity-50" : COLORS[i]} disabled:cursor-not-allowed text-white font-bold rounded-2xl px-3 py-4 text-left transition flex flex-col gap-1 select-none`}
          >
            <span className="text-xl">{SHAPES[i]}</span>
            <span className="text-xs leading-tight">{choice}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Reveal ────────────────────────────────────────────────────────────────────
// Affiche la bonne réponse + qui a voté quoi
function RevealScreen({ reveal, question, playerId, pseudo, avatar }: any) {
  const sorted = [...reveal.scores].sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore = reveal.scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const myChoice = reveal.playerAnswers?.[playerId];
  const didAnswer = myChoice !== undefined;
  const wasCorrect = myChoice === reveal.correctIndex;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-start gap-3 p-5 overflow-y-auto">
      {/* Mon résultat */}
      <div
        className={`w-full max-w-sm rounded-2xl px-5 py-3 flex items-center gap-3 mt-2 ${didAnswer ? (wasCorrect ? "bg-green-500/20 border border-green-400" : "bg-red-500/20 border border-red-400") : "bg-indigo-700"}`}
      >
        <div className="text-4xl">{AVATAR_EMOJI[avatar]}</div>
        <div className="flex flex-col">
          <span className="text-white font-bold">{pseudo}</span>
          {didAnswer ? (
            <span
              className={`text-sm font-semibold ${wasCorrect ? "text-green-300" : "text-red-300"}`}
            >
              {wasCorrect ? "✅ Bonne réponse !" : "❌ Mauvaise réponse"}
            </span>
          ) : (
            <span className="text-indigo-400 text-sm">Pas répondu</span>
          )}
        </div>
        <div className="ml-auto text-right">
          <p className="text-yellow-400 font-extrabold text-xl">{myScore}</p>
          <p className="text-indigo-400 text-xs">#{myRank}</p>
        </div>
      </div>

      {/* Affichage des réponses avec qui a voté quoi */}
      {question && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {question.choices.map((choice: string, i: number) => {
            const isCorrect = i === reveal.correctIndex;
            const iMyChoice = myChoice === i;
            // Joueurs ayant voté pour ce choix
            const voters = reveal.scores.filter(
              (p: any) => reveal.playerAnswers?.[p.id] === i,
            );

            return (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 flex flex-col gap-1 transition ${
                  isCorrect
                    ? "ring-2 ring-green-400 " + COLORS_SENT[i]
                    : COLORS_DIM[i]
                } ${iMyChoice && !isCorrect ? "ring-2 ring-red-400" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{SHAPES[i]}</span>
                  <span className="text-white text-sm font-semibold flex-1">
                    {choice}
                  </span>
                  {isCorrect && (
                    <span className="text-green-300 text-sm">✅</span>
                  )}
                  {iMyChoice && !isCorrect && (
                    <span className="text-red-300 text-sm">← toi</span>
                  )}
                  {iMyChoice && isCorrect && (
                    <span className="text-green-300 text-sm">← toi ✅</span>
                  )}
                </div>
                {voters.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {voters.map((p: any) => (
                      <span key={p.id} title={p.pseudo} className="text-lg">
                        {AVATAR_EMOJI[p.avatar]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-indigo-300 text-sm animate-pulse pb-2">
        En attente de la prochaine question…
      </p>
    </div>
  );
}

// ── Finished ──────────────────────────────────────────────────────────────────
function FinishedScreen({ scores, playerId, pseudo, avatar, onLeave }: any) {
  const sorted = [...scores].sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore = scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-6 p-6 overflow-hidden">
      <div className="text-6xl">{MEDALS[myRank] ?? AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-3xl font-extrabold text-white">Partie terminée !</h1>
      <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          {pseudo}
        </p>
        <p className="text-3xl font-extrabold text-yellow-400">{myScore} pts</p>
        <p className="text-indigo-300 text-sm">#{myRank} au classement</p>
      </div>
      <div className="w-full max-w-sm overflow-y-auto max-h-64">
        <Scoreboard players={scores} currentPlayerId={playerId} />
      </div>
      <button
        onClick={onLeave}
        className="bg-indigo-600 active:bg-indigo-500 text-white font-bold text-lg px-10 py-3 rounded-2xl shadow-lg"
      >
        Retour à l'accueil
      </button>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function PlayerScreen({
  roomCode,
  playerId,
  sessionToken,
  pseudo,
  avatar,
  onLeave,
  onRoomClosed,
}: Props) {
  const {
    state,
    connected,
    roomClosed,
    kicked,
    question,
    reveal,
    finished,
    paused,
    pausedTimeLeft,
    leave,
  } = useRoom({ role: "player", roomCode, playerId, sessionToken });

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

  const players = state?.players ?? [];

  if (finished)
    return (
      <>
        <ConnBadge connected={connected} />
        <FinishedScreen
          scores={finished.scores}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
          onLeave={handleLeave}
        />
      </>
    );

  if (reveal)
    return (
      <>
        <ConnBadge connected={connected} />
        <RevealScreen
          reveal={reveal}
          question={question}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
        />
      </>
    );

  if (question)
    return (
      <>
        <ConnBadge connected={connected} />
        <QuestionScreen
          roomCode={roomCode}
          question={question}
          paused={paused}
          pausedTimeLeft={pausedTimeLeft}
        />
      </>
    );

  return (
    <>
      <ConnBadge connected={connected} />
      <Lobby
        roomCode={roomCode}
        playerId={playerId}
        pseudo={pseudo}
        avatar={avatar}
        players={players}
        connected={connected}
        onLeave={handleLeave}
      />
    </>
  );
}
