import AnswerButtons from "../components/AnswerButtons";

interface Question {
  id: string;
  text: string;
  choices: string[];
  timeLimit: number;
}

interface Props {
  roomCode: string;
  question: Question;
  timeLeft: number;
}

export default function PlayerQuestion({
  roomCode,
  question,
  timeLeft,
}: Props) {
  const pct = Math.max(0, (timeLeft / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-between p-6 gap-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-indigo-300 text-sm mb-1">
          <span>Temps restant</span>
          <span className="font-bold text-white">{timeLeft}s</span>
        </div>
        <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
          <div
            className={`${timerColor} h-3 rounded-full transition-all duration-1000`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full max-w-sm">
        <p className="text-white text-xl font-bold text-center leading-snug">
          {question.text}
        </p>
      </div>

      <AnswerButtons
        roomCode={roomCode}
        questionId={question.id}
        choices={question.choices}
      />
    </div>
  );
}
