import { useState } from "react";
import { apiPost } from "../lib/api";
import { loadSession } from "../lib/session";
import { vibrate } from "../lib/sound";

interface AnswerResult {
  correct: boolean;
  points: number;
  score: number;
}

type AnswerStatus = "idle" | "sending" | "sent" | "already" | "error";

interface UseAnswerReturn {
  status: AnswerStatus;
  result: AnswerResult | null;
  submitAnswer: (
    roomCode: string,
    questionId: string,
    choiceIndex: number,
  ) => Promise<void>;
  reset: () => void;
}

export function useAnswer(): UseAnswerReturn {
  const [status, setStatus] = useState<AnswerStatus>("idle");
  const [result, setResult] = useState<AnswerResult | null>(null);

  async function submitAnswer(
    roomCode: string,
    questionId: string,
    choiceIndex: number,
  ) {
    if (status === "sending" || status === "sent" || status === "already")
      return;

    const session = loadSession();
    if (!session) return;

    setStatus("sending");
    try {
      const res = await apiPost<AnswerResult>(`/api/rooms/${roomCode}/answer`, {
        playerId: session.playerId,
        sessionToken: session.sessionToken,
        questionId,
        choiceIndex,
      });
      setResult(res);
      setStatus("sent");
      // Vibration confirmation de réponse
      vibrate([80, 40, 80]);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("déjà")) {
        setStatus("already");
      } else {
        setStatus("error");
      }
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
  }

  return { status, result, submitAnswer, reset };
}
