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

function HostQuestion({ question, players, onNext }: any) {
  const timeLeft = useTimer(question.startedAt, question.timeLimit);
  const pct = Math.max(0, (timeLeft / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const SHAPES = ["▲", "◆", "●", "■"];
  const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 font-semibold">
          Question {question.index + 1} / {question.total}
        </span>
        <span
          className={`text-2xl font-extrabold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
        >
          {timeLeft}s
        </span>
      </div>

      <div className="w-full bg-indigo-800 rounded-full h-4 overflow-hidden">
        <div
          className={`${timerColor} h-4 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <p className="text-white text-4xl font-bold text-center max-w-3xl leading-snug">
          {question.text}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => (
          <div
            key={i}
            className={`${COLORS[i]} rounded-2xl px-6 py-5 flex items-center gap-3`}
          >
            <span className="text-white text-2xl font-bold">{SHAPES[i]}</span>
            <span className="text-white text-xl font-semibold">{choice}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="self-center bg-white text-indigo-900 font-bold text-lg px-10 py-3 rounded-2xl shadow-lg hover:bg-indigo-100 transition"
      >
        ⏭ Révéler la réponse
      </button>
    </div>
  );
}

function HostReveal({ question, reveal, onNext, isLast }: any) {
  const SHAPES = ["▲", "◆", "●", "■"];
  const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 font-semibold">
          Question {question.index + 1} / {question.total}
        </span>
        <span className="text-green-300 font-bold">✅ Réponse révélée</span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <p className="text-white text-3xl font-bold text-center max-w-3xl">
          {question.text}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => (
          <div
            key={i}
            className={`${COLORS[i]} rounded-2xl px-6 py-5 flex items-center gap-3 transition ${
              i !== reveal.correctIndex
                ? "opacity-40"
                : "ring-4 ring-white scale-105"
            }`}
          >
            <span className="text-white text-2xl font-bold">{SHAPES[i]}</span>
            <span className="text-white text-xl font-semibold">{choice}</span>
            {i === reveal.correctIndex && (
              <span className="ml-auto text-2xl">✅</span>
            )}
          </div>
        ))}
      </div>

      <div className="max-w-md mx-auto w-full">
        <Scoreboard players={reveal.scores} />
      </div>

      <button
        onClick={onNext}
        className="self-center bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold text-lg px-10 py-3 rounded-2xl shadow-lg transition"
      >
        {isLast ? "🏁 Voir le classement final" : "➡ Question suivante"}
      </button>
    </div>
  );
}

function HostFinished({ scores, onLeave }: any) {
  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-extrabold text-white">
        🏆 Résultats finaux
      </h1>
      <Scoreboard players={scores} />
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
    connected,
    question,
    reveal,
    finished,
    roomClosed,
    leave,
    nextQuestion,
  } = useRoom({
    role: "host",
    roomCode,
  });

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

  if (finished) {
    return <HostFinished scores={finished.scores} onLeave={handleLeave} />;
  }

  if (reveal && question) {
    const isLast = question.index === question.total - 1;
    return (
      <HostReveal
        question={question}
        reveal={reveal}
        onNext={nextQuestion}
        isLast={isLast}
      />
    );
  }

  if (question) {
    return <HostQuestion question={question} onNext={nextQuestion} />;
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
      <p className="text-indigo-300 text-xl animate-pulse">Démarrage…</p>
    </div>
  );
}
