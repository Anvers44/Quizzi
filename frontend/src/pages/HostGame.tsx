import { useEffect } from "react";
import { useRoom } from "../hooks/useRoom";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { AVATAR_EMOJI, TEAM_META, ALL_TEAM_IDS } from "../types";
import {
  startBackgroundMusic,
  stopBackgroundMusic,
} from "../lib/sound";
import type { GameConfig } from "../types";
import type { PublicPlayer, TeamPublic } from "../socket-events";
import Scoreboard from "../components/Scoreboard";
import {
  HostBluffInputView,
  HostBluffVoteView,
  BluffRevealScreen,
} from "../components/BluffScreens";

interface Props {
  roomCode: string;
  config: GameConfig;
  onLeave: () => void;
}

const LETTERS = ["A", "B", "C", "D"];
const COLORS = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
const COLORS_DIM = [
  "bg-red-500/20",
  "bg-blue-500/20",
  "bg-yellow-500/20",
  "bg-green-500/20",
];

function TeamBar({
  teams,
  config,
}: {
  teams: Record<string, TeamPublic>;
  config: GameConfig;
}) {
  const teamIds = ALL_TEAM_IDS.slice(0, config.teamCount || 2).filter(
    (id) => teams[id],
  );
  const total = teamIds.reduce((s, id) => s + teams[id].score, 0) || 1;
  return (
    <div className="w-full max-w-4xl flex flex-col gap-1">
      <div className="flex gap-2 text-xs font-bold">
        {teamIds.map((id) => (
          <span key={id} className={`flex-1 text-center ${TEAM_META[id].text}`}>
            {TEAM_META[id].emoji} {teams[id].name} —{" "}
            {teams[id].score.toLocaleString()}
          </span>
        ))}
      </div>
      <div className="flex h-3 rounded-full overflow-hidden">
        {teamIds.map((id) => (
          <div
            key={id}
            className={`${TEAM_META[id].bg} transition-all duration-500`}
            style={{
              width: `${(teams[id].score / total) * 100}%`,
              minWidth: teams[id].score > 0 ? "2px" : "0",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CountdownOverlay({ n }: { n: number }) {
  return (
    <div className="absolute inset-0 bg-indigo-900/90 z-50 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
      <p className="text-indigo-300 text-sm uppercase tracking-widest mb-4">
        La question commence dans
      </p>
      <span
        className="text-9xl font-extrabold text-white animate-popIn"
        key={n}
      >
        {n}
      </span>
    </div>
  );
}

function HostQuestion({
  question,
  players,
  liveAnswers,
  paused,
  pausedTimeLeft,
  countdown,
  teams,
  config,
  onNext,
  onPause,
  onResume,
  onStop,
}: any) {
  const timeLeft = useTimer(
    question.startedAt,
    question.timeLimit,
    paused || countdown > 0,
  );
  const display = paused ? pausedTimeLeft : timeLeft;
  const pct = Math.max(0, (display / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const answered = Object.keys(liveAnswers).length;
  const connected = players.filter(
    (p: any) => p.connected && !p.isEliminated,
  ).length;

  return (
    <div className="relative h-[100dvh] bg-indigo-900 flex flex-col gap-3 p-4 overflow-hidden">
      {countdown > 0 && <CountdownOverlay n={countdown} />}
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 text-sm font-semibold">
          M{question.round}/{question.totalRounds} · Q
          {(question.index % config.questionsPerRound) + 1}/
          {config.questionsPerRound}
        </span>
        <span
          className={`text-2xl font-extrabold tabular-nums ${display <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
        >
          {paused ? "⏸ " : ""}
          {display}s
        </span>
        <span className="text-indigo-300 text-sm">
          {answered}/{connected} ✓
        </span>
      </div>
      <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
        <div
          className={`${timerColor} h-3 rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {config.mode === "teams" && <TeamBar teams={teams} config={config} />}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt=""
            className="rounded-2xl max-h-40 object-contain"
          />
        )}
        <p className="text-white text-2xl font-bold text-center max-w-3xl">
          {question.text}
        </p>
      </div>
      <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => (
          <div key={i} className={`${COLORS[i]} rounded-2xl px-4 py-3`}>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 rounded-xl w-8 h-8 flex items-center justify-center font-extrabold text-sm text-white shrink-0">
                {LETTERS[i]}
              </span>
              <span className="text-white text-sm font-semibold flex-1">
                {choice}
              </span>
            </div>
          </div>
        ))}
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
  const sorted = [...reveal.scores]
    .filter((p: any) => !p.isEliminated)
    .sort((a: any, b: any) => b.score - a.score);
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col gap-3 p-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <span className="text-indigo-300 text-sm font-semibold">
          M{question.round}/{question.totalRounds} · Q
          {(question.index % config.questionsPerRound) + 1}/
          {config.questionsPerRound}
        </span>
        <span className="text-green-300 text-sm font-bold">✅ Révélée</span>
      </div>
      {config.mode === "teams" && <TeamBar teams={teams} config={config} />}
      <p className="text-white text-lg font-bold text-center px-4">
        {question.text}
      </p>
      <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
        {question.choices.map((choice: string, i: number) => {
          const isCorrect = i === reveal.correctIndex;
          const respondents = reveal.scores.filter(
            (p: any) => reveal.playerAnswers?.[p.id] === i,
          );
          return (
            <div
              key={i}
              className={`${isCorrect ? COLORS[i] + " ring-4 ring-white" : COLORS_DIM[i]} rounded-2xl px-4 py-3`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-white/20 rounded-xl w-8 h-8 flex items-center justify-center font-extrabold text-sm text-white shrink-0">
                  {LETTERS[i]}
                </span>
                <span className="text-white text-sm font-semibold flex-1">
                  {choice}
                </span>
                {isCorrect && <span>✅</span>}
                <span className="text-white/70 text-xs">
                  {respondents.length} joueur{respondents.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pl-1">
                {respondents.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-0.5"
                  >
                    <span>{AVATAR_EMOJI[p.avatar]}</span>
                    <span className="text-white text-xs font-semibold">
                      {p.pseudo}
                    </span>
                    {reveal.timeTaken?.[p.id] !== undefined && (
                      <span className="text-white/60 text-xs">
                        {reveal.timeTaken[p.id].toFixed(1)}s
                      </span>
                    )}
                    {reveal.pointsEarned?.[p.id] > 0 && (
                      <span className="text-green-300 text-xs font-bold">
                        +{reveal.pointsEarned[p.id]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="max-w-md mx-auto w-full">
        <Scoreboard players={sorted} />
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

function HostRoundEnd({ roundEnd, teams, config, onNext, isLastRound }: any) {
  const teamIds = ALL_TEAM_IDS.slice(0, config.teamCount || 2);
  const perfects = Object.entries(roundEnd.perfectBonuses || {}).filter(
    ([, v]) => (v as number) > 0,
  );
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto">
      <h2 className="text-3xl font-extrabold text-white animate-slideDown">
        📊 Fin de la manche {roundEnd.round}
        {roundEnd.totalRounds > 1 ? `/${roundEnd.totalRounds}` : ""}
      </h2>
      {roundEnd.eliminatedPseudo && (
        <div className="bg-red-500/20 border border-red-400 rounded-2xl px-6 py-3 text-center animate-scaleIn">
          <p className="text-red-300 text-sm">Éliminé</p>
          <p className="text-white text-xl font-bold">
            💀 {roundEnd.eliminatedPseudo}
          </p>
        </div>
      )}
      {perfects.length > 0 && (
        <div className="bg-yellow-400/20 border border-yellow-400 rounded-2xl px-5 py-3 text-center animate-popIn">
          <p className="text-yellow-300 text-sm font-bold">
            ⭐ Manche parfaite ! +500 pts
          </p>
          <p className="text-white text-sm">
            {perfects
              .map(
                ([pid]) =>
                  roundEnd.scores.find((p: any) => p.id === pid)?.pseudo,
              )
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}
      {config.mode === "teams" && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {teamIds
            .filter((id) => teams[id])
            .map((id) => (
              <div
                key={id}
                className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${TEAM_META[id].border} ${TEAM_META[id].light}`}
              >
                <span>{TEAM_META[id].emoji}</span>
                <span className="text-white font-bold flex-1">
                  {teams[id].name}
                </span>
                <span className="text-yellow-400 font-extrabold text-xl">
                  {teams[id].score.toLocaleString()}
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
        className="bg-yellow-400 text-indigo-900 font-bold text-xl px-12 py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
      >
        {isLastRound ? "🏆 Résultats finaux" : "➡ Manche suivante"}
      </button>
    </div>
  );
}

function HostFinished({ finished, teams, config, onLeave }: any) {
  const teamIds = ALL_TEAM_IDS.slice(0, config.teamCount || 2);
  const isTeams = config.mode === "teams";
  const winner = isTeams
    ? null
    : [...finished.scores]
        .filter((p: any) => !p.isEliminated)
        .sort((a: any, b: any) => b.score - a.score)[0];
  const winTeam =
    isTeams && finished.winnerTeamId ? teams[finished.winnerTeamId] : null;
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto animate-fadeIn">
      <h1 className="text-4xl font-extrabold text-white animate-slideDown">
        🏆 Résultats finaux
      </h1>
      {winTeam && (
        <div
          className={`rounded-2xl px-8 py-4 text-center border ${TEAM_META[finished.winnerTeamId as any]?.border || "border-yellow-400"}`}
        >
          <p className="text-indigo-300 text-sm">Équipe gagnante</p>
          <p className="text-3xl font-extrabold text-yellow-400">
            {winTeam.name} — {winTeam.score.toLocaleString()} pts
          </p>
        </div>
      )}
      {!isTeams && winner && (
        <div className="bg-yellow-400/20 border border-yellow-400 rounded-2xl px-8 py-4 text-center animate-popIn">
          <p className="text-indigo-300 text-sm">Vainqueur</p>
          <p className="text-3xl font-extrabold text-yellow-400">
            {AVATAR_EMOJI[winner.avatar]} {winner.pseudo} —{" "}
            {winner.score.toLocaleString()} pts
          </p>
        </div>
      )}
      {isTeams && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {teamIds
            .filter((id) => teams[id])
            .map((id) => (
              <div
                key={id}
                className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${TEAM_META[id].border} ${TEAM_META[id].light}`}
              >
                <span>{TEAM_META[id].emoji}</span>
                <span className="text-white font-bold flex-1">
                  {teams[id].name}
                </span>
                <span className="text-yellow-400 font-extrabold text-xl">
                  {teams[id].score.toLocaleString()}
                </span>
                {finished.winnerTeamId === id && <span>🏆</span>}
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

// ─── Main ─────────────────────────────────────────────────────
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
    countdown,
    teams,
    bluffInput,
    bluffVote,
    bluffReveal,
    bluffSubmitCount,
    bluffSubmitTotal,
    bluffVotedCount,
    leave,
    nextQuestion,
    pauseGame,
    resumeGame,
    stopGame,
  } = useRoom({ role: "host", roomCode });

  // Start music at first question, stop at game end
  useEffect(() => {
    if (question && !finished) {
      startBackgroundMusic();
    }
    if (finished) {
      stopBackgroundMusic();
    }
  }, [question, finished]);

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

  // ── Bluff phases ──
  if (bluffReveal)
    return (
      <div className="h-[100dvh] bg-indigo-900 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <BluffRevealScreen
            payload={bluffReveal}
            playerId=""
            pseudo="Hôte"
            avatar="fox"
          />
        </div>
        <div className="p-4 flex justify-center">
          <button
            onClick={nextQuestion}
            className="bg-yellow-400 text-indigo-900 font-bold px-8 py-3 rounded-xl"
          >
            {isLastOfRound
              ? isLastRound
                ? "🏁 Résultats"
                : "📊 Fin de manche"
              : "➡ Suivante"}
          </button>
        </div>
      </div>
    );

  if (bluffVote)
    return (
      <HostBluffVoteView
        payload={bluffVote}
        question={bluffInput?.text ?? ""}
        votedCount={bluffVotedCount}
        totalPlayers={
          players.filter((p: any) => p.connected && !p.isEliminated).length
        }
        onSkip={nextQuestion}
      />
    );

  if (bluffInput)
    return (
      <HostBluffInputView
        payload={bluffInput}
        submitCount={bluffSubmitCount}
        submitTotal={bluffSubmitTotal}
        onSkip={nextQuestion}
        countdown={countdown}
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
        countdown={countdown}
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
