import { useAnswer } from "../hooks/useAnswer";

const COLORS = [
  { base: "bg-red-500 hover:bg-red-400", sent: "bg-red-700" },
  { base: "bg-blue-500 hover:bg-blue-400", sent: "bg-blue-700" },
  { base: "bg-yellow-500 hover:bg-yellow-400", sent: "bg-yellow-700" },
  { base: "bg-green-500 hover:bg-green-400", sent: "bg-green-700" },
];

const SHAPES = ["▲", "◆", "●", "■"];

interface Props {
  roomCode: string;
  questionId: string;
  choices: string[];
  correctIndex?: number;
}

export default function AnswerButtons({
  roomCode,
  questionId,
  choices,
  correctIndex,
}: Props) {
  const { status, result, submitAnswer } = useAnswer();

  const answered = status === "sent" || status === "already";
  const revealing = correctIndex !== undefined;

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {status === "sending" && (
        <p className="text-center text-indigo-300 animate-pulse">Envoi…</p>
      )}
      {status === "sent" && result && (
        <div
          className={`text-center rounded-2xl px-4 py-3 font-bold text-lg ${result.correct ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
        >
          {result.correct
            ? `✅ Bonne réponse ! +${result.points} pts`
            : "❌ Mauvaise réponse"}
        </div>
      )}
      {status === "already" && (
        <p className="text-center text-yellow-400 font-semibold">
          ⚡ Réponse déjà envoyée
        </p>
      )}
      {status === "error" && (
        <p className="text-center text-red-400 text-sm">Erreur — réessaie</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice, i) => {
          let colorClass = COLORS[i].base;
          if (answered || revealing) {
            if (revealing && i === correctIndex) {
              colorClass = "bg-green-500";
            } else if (answered) {
              colorClass = COLORS[i].sent + " opacity-60";
            } else {
              colorClass = COLORS[i].sent + " opacity-40";
            }
          }
          return (
            <button
              key={i}
              disabled={answered || status === "sending"}
              onClick={() => submitAnswer(roomCode, questionId, i)}
              className={`${colorClass} disabled:cursor-not-allowed text-white font-bold rounded-2xl px-4 py-5 text-left transition flex flex-col gap-1`}
            >
              <span className="text-2xl">{SHAPES[i]}</span>
              <span className="text-sm leading-tight">{choice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
