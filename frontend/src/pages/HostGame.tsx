import { useEffect } from "react";
import { useRoom } from "../hooks/useRoom";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { AVATAR_EMOJI } from "../types";
import type { TeamId, GameConfig } from "../types";
import type { PublicPlayer } from "../socket-events";
import Scoreboard from "../components/Scoreboard";

interface Props {
  roomCode: string;
  config: GameConfig;
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

const TEAM_COLORS: Record<TeamId, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
};
const TEAM_BORDERS: Record<TeamId, string> = {
  red: "border-red-400",
  blue: "border-blue-400",
};

// ─── Team score bar ──────────────────────────────────────────
function TeamBar({ teams }: { teams: any }) {
  const total = teams.red.score + teams.blue.score || 1;
  const redPct = Math.round((teams.red.score / total) * 100);
  return (
    <div className="w-full max-w-2xl flex flex-col gap-1">
      <div className="flex justify-between text-sm font-bold">
        <span className="text-red-300">
          🔴 {teams.red.name} — {teams.red.score} pts
        </span>
        <span className="text-blue-300">
          🔵 {teams.blue.name} — {teams.blue.score} pts
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden">
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${redPct}%` }}
        />
        <div className="bg-blue-500 flex-1" />
      </div>
    </div>
  );
}

// ─── Question view ───────────────────────────────────────────
function HostQuestion({
  question,
  players,
  liveAnswers,
  paused,
  pausedTimeLeft,
  teams,
  config,
  onNext,
  onPause,
  onResume,
  onStop,
}: any) {
  const timeLeft = useTimer(question.startedAt, question.timeLimit, paused);
  const display = paused ? pausedTimeLeft : timeLeft;
  const pct = Math.max(0, (display / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const answered = Object.keys(liveAnswers).length;
  const connected = players.filter(
    (p: any) => p.connected && !p.isEliminated,
  ).length;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col gap-3 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 text-sm font-semibold">
          Manche {question.round}/{question.totalRounds} · Q
          {(question.index % config.questionsPerRound) + 1}/
          {config.questionsPerRound}
        </span>
        <span className="text-indigo-300 text-sm">
          {answered}/{connected} réponses
        </span>
        <span
          className={`text-2xl font-extrabold tabular-nums ${display <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
        >
          {paused ? "⏸" : ""}
          {display}s
        </span>
      </div>

      <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
        <div
          className={`${timerColor} h-3 rounded-full transition-all duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {config.mode === "teams" && <TeamBar teams={teams} />}

      <div className="flex-1 flex items-center justify-center">
        <p className="text-white text-2xl font-bold text-center max-w-3xl">
          {question.text}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => {
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
                {respondents.length > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {respondents.length}
                  </span>
                )}
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

      <div className="flex gap-2 justify-center flex-wrap">
        {paused ? (
          <button
            onClick={onResume}
            className="bg-green-500 text-white font-bold px-6 py-2 rounded-xl"
          >
            ▶ Reprendre
          </button>
        ) : (
          <button
            onClick={onPause}
            className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-xl"
          >
            ⏸ Pause
          </button>
        )}
        <button
          onClick={onNext}
          className="bg-white text-indigo-900 font-bold px-6 py-2 rounded-xl"
        >
          ⏭ Révéler
        </button>
        <button
          onClick={onStop}
          className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl"
        >
          ⏹ Arrêter
        </button>
      </div>
    </div>
  );
}

// ─── Reveal view ─────────────────────────────────────────────
function HostReveal({
  question,
  reveal,
  players,
  teams,
  config,
  onNext,
  isLastOfRound,
  isLastRound,
  onStop,
}: any) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col gap-3 p-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 text-sm font-semibold">
          Manche {question.round}/{question.totalRounds} · Q
          {(question.index % config.questionsPerRound) + 1}/
          {config.questionsPerRound}
        </span>
        <span className="text-green-300 text-sm font-bold">✅ Révélée</span>
      </div>

      {config.mode === "teams" && <TeamBar teams={teams} />}

      <p className="text-white text-lg font-bold text-center px-4">
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
              className={`${isCorrect ? COLORS[i] + " ring-4 ring-white" : COLORS_DIM[i]} rounded-2xl px-4 py-3 flex flex-col gap-2`}
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{SHAPES[i]}</span>
                <span className="text-white text-sm font-semibold flex-1">
                  {choice}
                </span>
                {isCorrect && <span>✅</span>}
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

      <div className="max-w-md mx-auto w-full">
        <Scoreboard
          players={reveal.scores.filter((p: any) => !p.isEliminated)}
        />
      </div>

      <div className="flex gap-2 justify-center flex-wrap pb-2">
        <button
          onClick={onNext}
          className="bg-yellow-400 text-indigo-900 font-bold px-8 py-3 rounded-xl"
        >
          {isLastOfRound
            ? isLastRound
              ? "🏁 Résultats"
              : "📊 Fin de manche"
            : "➡ Suivante"}
        </button>
        <button
          onClick={onStop}
          className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl"
        >
          ⏹ Arrêter
        </button>
      </div>
    </div>
  );
}

// ─── Round end view ──────────────────────────────────────────
function HostRoundEnd({ roundEnd, teams, config, onNext, isLastRound }: any) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto">
      <h2 className="text-3xl font-extrabold text-white">
        📊 Fin de la manche {roundEnd.round}
        {roundEnd.totalRounds > 1 ? `/${roundEnd.totalRounds}` : ""}
      </h2>

      {/* Tournament elimination */}
      {roundEnd.eliminatedPseudo && (
        <div className="bg-red-500/20 border border-red-400 rounded-2xl px-6 py-3 text-center">
          <p className="text-red-300 text-sm">Éliminé</p>
          <p className="text-white text-xl font-bold">
            💀 {roundEnd.eliminatedPseudo}
          </p>
        </div>
      )}

      {/* Team scores */}
      {config.mode === "teams" && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div
              key={tid}
              className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${TEAM_BORDERS[tid]} bg-indigo-800`}
            >
              <div className={`w-4 h-4 rounded-full ${TEAM_COLORS[tid]}`} />
              <span className="text-white font-bold flex-1">
                {teams[tid].name}
              </span>
              <span className="text-yellow-400 font-extrabold text-xl">
                {teams[tid].score}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md">
        <Scoreboard
          players={roundEnd.scores.filter((p: any) => !p.isEliminated)}
        />
      </div>

      <button
        onClick={onNext}
        className="bg-yellow-400 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg"
      >
        {isLastRound ? "🏆 Résultats finaux" : "➡ Manche suivante"}
      </button>
    </div>
  );
}

// ─── Finished view ───────────────────────────────────────────
function HostFinished({ finished, teams, config, onLeave }: any) {
  const isTeams = config.mode === "teams";
  const winner = isTeams
    ? null
    : [...finished.scores]
        .filter((p: any) => !p.isEliminated)
        .sort((a: any, b: any) => b.score - a.score)[0];
  const winTeam =
    isTeams && finished.winnerTeamId
      ? teams[finished.winnerTeamId as TeamId]
      : null;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto">
      <h1 className="text-4xl font-extrabold text-white">
        🏆 Résultats finaux
      </h1>

      {winTeam && (
        <div
          className={`rounded-2xl px-8 py-4 text-center border ${TEAM_BORDERS[finished.winnerTeamId]}`}
        >
          <p className="text-indigo-300 text-sm">Équipe gagnante</p>
          <p className="text-3xl font-extrabold text-yellow-400">
            {winTeam.name} — {winTeam.score} pts
          </p>
        </div>
      )}

      {!isTeams && winner && (
        <div className="bg-yellow-400/20 border border-yellow-400 rounded-2xl px-8 py-4 text-center">
          <p className="text-indigo-300 text-sm">Vainqueur</p>
          <p className="text-3xl font-extrabold text-yellow-400">
            {AVATAR_EMOJI[winner.avatar]} {winner.pseudo} — {winner.score} pts
          </p>
        </div>
      )}

      {isTeams && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div
              key={tid}
              className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${TEAM_BORDERS[tid]} bg-indigo-800`}
            >
              <div className={`w-4 h-4 rounded-full ${TEAM_COLORS[tid]}`} />
              <span className="text-white font-bold flex-1">
                {teams[tid].name}
              </span>
              <span className="text-yellow-400 font-extrabold text-xl">
                {teams[tid].score}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md overflow-y-auto max-h-72">
        <Scoreboard
          players={finished.scores.filter((p: any) => !p.isEliminated)}
        />
      </div>

      <button
        onClick={onLeave}
        className="bg-yellow-400 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg"
      >
        Nouvelle partie
      </button>
    </div>
  );
}

// ─── Main HostGame ───────────────────────────────────────────
export default function HostGame({ roomCode, config, onLeave }: Props) {
  const {
    state,
    question,
    reveal,
    roundEnd,
    finished,
    roomClosed,
    paused,
    pausedTimeLeft,
    liveAnswers,
    teams,
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
  const isLastOfRound = question
    ? (question.index + 1) % config.questionsPerRound === 0
    : false;
  const isLastRound = question ? question.round >= question.totalRounds : false;

  if (finished)
    return (
      <HostFinished
        finished={finished}
        teams={teams}
        config={config}
        onLeave={handleLeave}
      />
    );

  if (roundEnd)
    return (
      <HostRoundEnd
        roundEnd={roundEnd}
        teams={teams}
        config={config}
        onNext={nextQuestion}
        isLastRound={
          roundEnd.round >= roundEnd.totalRounds || config.mode === "tournament"
        }
      />
    );

  if (reveal && question)
    return (
      <HostReveal
        question={question}
        reveal={reveal}
        players={players}
        teams={teams}
        config={config}
        onNext={nextQuestion}
        isLastOfRound={isLastOfRound}
        isLastRound={isLastRound}
        onStop={stopGame}
      />
    );

  if (question)
    return (
      <HostQuestion
        question={question}
        players={players}
        liveAnswers={liveAnswers}
        paused={paused}
        pausedTimeLeft={pausedTimeLeft}
        teams={teams}
        config={config}
        onNext={nextQuestion}
        onPause={pauseGame}
        onResume={resumeGame}
        onStop={stopGame}
      />
    );

  return (
    <div className="h-[100dvh] bg-indigo-900 flex items-center justify-center">
      <p className="text-indigo-300 text-xl animate-pulse">Démarrage…</p>
    </div>
  );
}
