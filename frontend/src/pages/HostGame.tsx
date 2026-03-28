import { useEffect } from "react";
import { useRoom } from "../hooks/useRoom";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { AVATAR_EMOJI } from "../types";
import Scoreboard from "../components/Scoreboard";

interface Props {
  roomCode: string;
  onLeave: () => void;
}

const SHAPES = ["▲", "◆", "●", "■"];
const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
const COLORS_DIM = [
  "bg-red-500/30",
  "bg-blue-500/30",
  "bg-yellow-500/30",
  "bg-green-500/30",
];

function HostQuestion({
  question,
  players,
  liveAnswers,
  paused,
  pausedTimeLeft,
  onNext,
  onPause,
  onResume,
  onStop,
}: any) {
  const timeLeft = useTimer(question.startedAt, question.timeLimit, paused);
  const displayTime = paused ? pausedTimeLeft : timeLeft;
  const pct = Math.max(0, (displayTime / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";

  const answeredCount = Object.keys(liveAnswers).length;
  const connectedCount = players.filter((p: any) => p.connected).length;

  // Compte combien ont choisi chaque réponse
  const choiceCounts = [0, 1, 2, 3].map(
    (i) =>
      Object.values(liveAnswers as Record<string, number>).filter(
        (v) => v === i,
      ).length,
  );

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col gap-3 p-5 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 font-semibold text-sm">
          Q{question.index + 1}/{question.total}
        </span>
        <span className="text-indigo-300 text-sm">
          {answeredCount}/{connectedCount} réponses
        </span>
        <span
          className={`text-2xl font-extrabold tabular-nums ${displayTime <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
        >
          {paused ? "⏸" : ""}
          {displayTime}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
        <div
          className={`${timerColor} h-3 rounded-full transition-all duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white text-2xl font-bold text-center max-w-3xl leading-snug">
          {question.text}
        </p>
      </div>

      {/* Réponses + qui a répondu quoi */}
      <div className="grid grid-cols-2 gap-2 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => {
          // Joueurs ayant choisi ce choix
          const respondents = players.filter(
            (p: any) => liveAnswers[p.id] === i,
          );
          return (
            <div
              key={i}
              className={`${COLORS[i]} rounded-2xl px-4 py-3 flex flex-col gap-2`}
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{SHAPES[i]}</span>
                <span className="text-white text-sm font-semibold flex-1">
                  {choice}
                </span>
                {choiceCounts[i] > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {choiceCounts[i]}
                  </span>
                )}
              </div>
              {/* Avatars des joueurs qui ont choisi cette réponse */}
              {respondents.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {respondents.map((p: any) => (
                    <span key={p.id} title={p.pseudo} className="text-xl">
                      {AVATAR_EMOJI[p.avatar]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Boutons de contrôle */}
      <div className="flex gap-2 justify-center flex-wrap">
        {paused ? (
          <button
            onClick={onResume}
            className="bg-green-500 hover:bg-green-400 text-white font-bold px-6 py-2 rounded-xl transition"
          >
            ▶ Reprendre
          </button>
        ) : (
          <button
            onClick={onPause}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-xl transition"
          >
            ⏸ Pause
          </button>
        )}
        <button
          onClick={onNext}
          className="bg-white text-indigo-900 font-bold px-6 py-2 rounded-xl hover:bg-indigo-100 transition"
        >
          ⏭ Révéler
        </button>
        <button
          onClick={onStop}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-xl transition"
        >
          ⏹ Arrêter
        </button>
      </div>
    </div>
  );
}

function HostReveal({
  question,
  reveal,
  players,
  onNext,
  isLast,
  onStop,
}: any) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col gap-3 p-5 overflow-hidden">
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 font-semibold text-sm">
          Q{question.index + 1}/{question.total}
        </span>
        <span className="text-green-300 font-bold text-sm">✅ Révélée</span>
      </div>

      <p className="text-white text-xl font-bold text-center px-4">
        {question.text}
      </p>

      <div className="grid grid-cols-2 gap-2 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => {
          const isCorrect = i === reveal.correctIndex;
          const respondents = players.filter(
            (p: any) => reveal.playerAnswers?.[p.id] === i,
          );
          return (
            <div
              key={i}
              className={`${isCorrect ? COLORS[i] + " ring-4 ring-white" : COLORS_DIM[i]} rounded-2xl px-4 py-3 flex flex-col gap-2 transition`}
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{SHAPES[i]}</span>
                <span className="text-white text-sm font-semibold flex-1">
                  {choice}
                </span>
                {isCorrect && <span className="text-lg">✅</span>}
              </div>
              {respondents.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {respondents.map((p: any) => (
                    <span key={p.id} title={p.pseudo} className="text-xl">
                      {AVATAR_EMOJI[p.avatar]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-md mx-auto w-full overflow-y-auto flex-1">
        <Scoreboard players={reveal.scores} />
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={onNext}
          className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold px-8 py-3 rounded-xl transition"
        >
          {isLast ? "🏁 Classement final" : "➡ Suivante"}
        </button>
        <button
          onClick={onStop}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-xl transition"
        >
          ⏹ Arrêter
        </button>
      </div>
    </div>
  );
}

function HostFinished({ scores, onLeave }: any) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      <h1 className="text-4xl font-extrabold text-white">
        🏆 Résultats finaux
      </h1>
      <div className="w-full max-w-md overflow-y-auto max-h-96">
        <Scoreboard players={scores} />
      </div>
      <button
        onClick={onLeave}
        className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg transition"
      >
        Nouvelle partie
      </button>
    </div>
  );
}

export default function HostGame({ roomCode, onLeave }: Props) {
  const {
    state,
    connected,
    question,
    reveal,
    finished,
    roomClosed,
    paused,
    pausedTimeLeft,
    liveAnswers,
    leave,
    nextQuestion,
    pauseGame,
    resumeGame,
    stopGame,
  } = useRoom({ role: "host", roomCode });

  useEffect(() => {
    if (roomClosed) {
      clearSession();
      onLeave();
    }
  }, [roomClosed]);

  function handleLeave() {
    leave();
    clearSession();
    onLeave();
  }

  const players = state?.players ?? [];

  if (finished)
    return <HostFinished scores={finished.scores} onLeave={handleLeave} />;

  if (reveal && question) {
    return (
      <HostReveal
        question={question}
        reveal={reveal}
        players={players}
        onNext={nextQuestion}
        isLast={question.index === question.total - 1}
        onStop={stopGame}
      />
    );
  }

  if (question) {
    return (
      <HostQuestion
        question={question}
        players={players}
        liveAnswers={liveAnswers}
        paused={paused}
        pausedTimeLeft={pausedTimeLeft}
        onNext={nextQuestion}
        onPause={pauseGame}
        onResume={resumeGame}
        onStop={stopGame}
      />
    );
  }

  return (
    <div className="h-[100dvh] bg-indigo-900 flex items-center justify-center">
      <p className="text-indigo-300 text-xl animate-pulse">Démarrage…</p>
    </div>
  );
}
