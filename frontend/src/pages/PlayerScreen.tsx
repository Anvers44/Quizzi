import { useEffect, useRef, useState } from "react";
import { useRoom } from "../hooks/useRoom";
import { useAnswer } from "../hooks/useAnswer";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { loadProfile, updateStats } from "../lib/profile";
import { AVATAR_EMOJI, POWER_LABELS, POWER_DESC } from "../types";
import { playTickBeep, vibrate } from "../lib/sound";
import Scoreboard from "../components/Scoreboard";
import type { Avatar, TeamId, PowerType, Difficulty } from "../types";
import type { PublicPlayer } from "../socket-events";

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
const SHAPES = ["▲", "◆", "●", "■"];
const DIFF_STARS: Record<Difficulty, string> = {
  easy: "⭐",
  medium: "⭐⭐",
  hard: "⭐⭐⭐",
};
const TEAM_BADGE: Record<TeamId, string> = {
  red: "bg-red-500/20 border border-red-400 text-red-300",
  blue: "bg-blue-500/20 border border-blue-400 text-blue-300",
};

function ConnBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`fixed top-3 right-3 text-xs px-2 py-1 rounded-full font-semibold z-50 transition-all ${
        connected
          ? "bg-green-500/20 text-green-300"
          : "bg-red-500/20 text-red-300 animate-pulse"
      }`}
    >
      {connected ? "●" : "○"}
    </div>
  );
}

// ─── Power panel ─────────────────────────────────────────────
function PowerPanel({
  myPower,
  players,
  playerId,
  onUsePower,
}: {
  myPower: PowerType;
  players: PublicPlayer[];
  playerId: string;
  onUsePower: (tid: string) => void;
}) {
  const [targeting, setTargeting] = useState(false);
  const isAttack = ["blind", "freeze", "flip", "shuffle"].includes(myPower);
  const targets = isAttack
    ? players.filter((p) => p.id !== playerId && p.connected && !p.isEliminated)
    : [];

  if (targeting)
    return (
      <div className="w-full max-w-sm bg-indigo-800 border border-yellow-400 rounded-2xl p-3 animate-slideUp">
        <p className="text-yellow-400 text-sm font-bold mb-2 text-center">
          ⚔️ Choisir une cible (prochaine question) :
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          {targets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onUsePower(p.id);
                setTargeting(false);
              }}
              className="flex items-center gap-2 bg-indigo-700 active:bg-indigo-600 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
            >
              <span>{AVATAR_EMOJI[p.avatar]}</span>
              <span>{p.pseudo}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setTargeting(false)}
          className="w-full text-indigo-400 text-xs"
        >
          Annuler
        </button>
      </div>
    );

  return (
    <button
      onClick={() => (isAttack ? setTargeting(true) : onUsePower(playerId))}
      className="w-full max-w-sm bg-purple-600 active:bg-purple-500 text-white font-bold rounded-2xl px-4 py-3 flex items-center gap-3 transition-all active:scale-95 animate-powerBounce"
    >
      <div className="text-left flex-1">
        <p className="text-base">{POWER_LABELS[myPower]}</p>
        <p className="text-xs opacity-70">{POWER_DESC[myPower]}</p>
        {["blind", "freeze", "flip", "shuffle"].includes(myPower) && (
          <p className="text-xs opacity-50 mt-0.5">
            ⚡ S'active à la prochaine question
          </p>
        )}
      </div>
      <span className="text-2xl">{isAttack ? "⚔️" : "🛡️"}</span>
    </button>
  );
}

// ─── Visual effects (queued, activate at question start) ─────
function usePowerEffects(powerEffect: any, playerId: string) {
  const [flip, setFlip] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [blind, setBlind] = useState<number | null>(null);
  const [shuffle, setShuffle] = useState<number[] | null>(null);
  const [incoming, setIncoming] = useState<PowerType | null>(null); // notification

  useEffect(() => {
    if (!powerEffect || powerEffect.targetPlayerId !== playerId) return;
    const t = powerEffect.type as PowerType;
    setIncoming(t);
    setTimeout(() => setIncoming(null), 3000);

    if (t === "flip") {
      setFlip(true);
      setTimeout(() => setFlip(false), 5000);
    }
    if (t === "freeze") {
      setFreeze(true);
      setTimeout(() => setFreeze(false), 4000);
    }
    if (t === "blind") {
      setBlind(powerEffect.hiddenChoiceIndex ?? 0);
      setTimeout(() => setBlind(null), 8000);
    }
    if (t === "shuffle") {
      setShuffle(powerEffect.newChoiceOrder ?? null);
      setTimeout(() => setShuffle(null), 6000);
    }
  }, [powerEffect, playerId]);

  return { flip, freeze, blind, shuffle, incoming };
}

// ─── Lobby ───────────────────────────────────────────────────
function Lobby({
  roomCode,
  playerId,
  pseudo,
  avatar,
  players,
  connected,
  teams,
  config,
  onLeave,
}: any) {
  const profile = loadProfile();
  const myTeamId = players.find((p: any) => p.id === playerId)?.teamId as
    | TeamId
    | undefined;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-sm flex justify-between items-center">
        <div
          className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
            connected
              ? "bg-green-500/20 text-green-300"
              : "bg-red-500/20 text-red-300 animate-pulse"
          }`}
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

      <div className="text-6xl animate-popIn">{AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-2xl font-extrabold text-white animate-slideDown">
        {pseudo}
      </h1>

      {myTeamId && (
        <div
          className={`px-4 py-2 rounded-xl text-sm font-bold ${TEAM_BADGE[myTeamId]} animate-scaleIn`}
        >
          {myTeamId === "red" ? "🔴 Équipe Rouge" : "🔵 Équipe Bleue"}
        </div>
      )}

      <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1 animate-slideUp">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          Partie
        </p>
        <p className="text-2xl font-bold text-white tracking-widest">
          {roomCode}
        </p>
        {config && (
          <p className="text-indigo-400 text-xs">
            {config.mode === "teams"
              ? "Équipes"
              : config.mode === "tournament"
                ? "Tournoi"
                : "Classique"}
            {config.powersEnabled ? " · ⚡ Pouvoirs" : ""}
          </p>
        )}
      </div>

      <p className="text-indigo-300 text-base animate-pulse">
        En attente du début…
      </p>

      {profile && profile.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-indigo-800/60 border border-indigo-600 rounded-2xl px-4 py-3 animate-slideUp delay-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-white font-extrabold text-lg">
                {profile.gamesPlayed}
              </p>
              <p className="text-indigo-400 text-xs">Parties</p>
            </div>
            <div>
              <p className="text-yellow-400 font-extrabold text-lg">
                {profile.wins}
              </p>
              <p className="text-indigo-400 text-xs">Victoires</p>
            </div>
            <div>
              <p className="text-green-400 font-extrabold text-lg">
                {profile.totalScore.toLocaleString()}
              </p>
              <p className="text-indigo-400 text-xs">Score total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Question screen ─────────────────────────────────────────
function QuestionScreen({
  roomCode,
  question,
  paused,
  pausedTimeLeft,
  myPower,
  powerEffect,
  players,
  playerId,
  sessionToken,
  onUsePower,
}: any) {
  const timeLeft = useTimer(question.startedAt, question.timeLimit, paused);
  const display = paused ? pausedTimeLeft : timeLeft;
  const pct = Math.max(0, (display / question.timeLimit) * 100);
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  const timerAnim = display <= 5 && !paused ? "animate-timerPulse" : "";
  const { status, submitAnswer } = useAnswer();
  const answered = status === "sent" || status === "already";
  const [lastAnswer, setLastAnswer] = useState<{
    index: number;
    correct: boolean;
  } | null>(null);
  const lastBeep = useRef(-1);
  const effects = usePowerEffects(powerEffect, playerId);
  const [prevQ, setPrevQ] = useState(question.id);
  const [visible, setVisible] = useState(true);

  // Animate screen transition when question changes
  useEffect(() => {
    if (question.id !== prevQ) {
      setVisible(false);
      setTimeout(() => {
        setPrevQ(question.id);
        setVisible(true);
      }, 200);
    }
  }, [question.id]);

  useEffect(() => {
    if (
      !paused &&
      display <= 5 &&
      display > 0 &&
      display !== lastBeep.current
    ) {
      lastBeep.current = display;
      playTickBeep();
      vibrate(50);
    }
  }, [display, paused]);

  const displayChoices = effects.shuffle
    ? effects.shuffle.map((i: number) => ({
        text: question.choices[i],
        origIndex: i,
      }))
    : question.choices.map((t: string, i: number) => ({
        text: t,
        origIndex: i,
      }));

  return (
    <div
      className={`h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-4 overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      } ${effects.flip ? "flip-180" : ""}`}
    >
      {/* Freeze overlay */}
      {effects.freeze && (
        <div className="absolute inset-0 freeze-overlay z-40 flex items-center justify-center pointer-events-none animate-fadeInFast">
          <div className="text-center animate-popIn">
            <p className="text-7xl">❄️</p>
            <p className="text-white font-bold text-xl">Gelé !</p>
          </div>
        </div>
      )}

      {/* Incoming power notification */}
      {effects.incoming && (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-30 pointer-events-none animate-slideDown">
          <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
            ⚔️ {powerEffect.fromPseudo} t'a utilisé{" "}
            {POWER_LABELS[effects.incoming]}
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="w-full max-w-sm pt-2 animate-fadeIn">
        <div className="flex justify-between text-indigo-300 text-sm mb-1">
          <div className="flex items-center gap-2">
            <span>
              M{question.round}/{question.totalRounds} · Q{question.index + 1}
            </span>
            <span className="text-indigo-500">
              {DIFF_STARS[question.difficulty as Difficulty]}
            </span>
          </div>
          <span
            className={`font-bold tabular-nums transition-colors ${
              display <= 5 && !paused
                ? "text-red-400 " + timerAnim
                : "text-white"
            }`}
          >
            {paused ? "⏸ " : ""}
            {display}s
          </span>
        </div>
        <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
          <div
            className={`${timerColor} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {paused && (
        <div className="bg-indigo-700/80 rounded-2xl px-6 py-2 text-white font-bold text-center text-sm animate-scaleIn">
          ⏸ Partie en pause
        </div>
      )}

      {/* Question + image */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm px-2 gap-3">
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="question"
            loading="lazy"
            className="rounded-2xl shadow-lg max-h-36 object-contain animate-scaleIn"
          />
        )}
        <p className="text-white text-lg font-bold text-center leading-snug animate-fadeIn">
          {question.text}
        </p>
      </div>

      {/* Status */}
      <div className="w-full max-w-sm min-h-8 flex items-center justify-center">
        {answered && !paused && (
          <p className="text-indigo-300 text-sm font-semibold text-center animate-fadeInFast">
            ⏳ Réponse envoyée — en attente des autres
          </p>
        )}
        {status === "error" && (
          <p className="text-red-400 text-sm animate-shake">
            Erreur — réessaie
          </p>
        )}
      </div>

      {/* Power */}
      {myPower && !answered && (
        <div className="w-full max-w-sm animate-slideUp">
          <PowerPanel
            myPower={myPower}
            players={players}
            playerId={playerId}
            onUsePower={onUsePower}
          />
        </div>
      )}

      {/* Choices */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm pb-2">
        {displayChoices.map(
          (
            { text, origIndex }: { text: string; origIndex: number },
            di: number,
          ) => {
            const isHidden = effects.blind === origIndex;
            const isDisabled =
              answered ||
              status === "sending" ||
              paused ||
              effects.freeze ||
              isHidden;
            return (
              <button
                key={origIndex}
                disabled={isDisabled}
                onClick={() => submitAnswer(roomCode, question.id, origIndex)}
                className={`${
                  isHidden
                    ? "bg-indigo-700 opacity-30"
                    : answered
                      ? COLORS_SENT[origIndex % 4] + " opacity-60"
                      : isDisabled
                        ? COLORS_SENT[origIndex % 4] + " opacity-50"
                        : COLORS[origIndex % 4]
                } disabled:cursor-not-allowed text-white font-bold rounded-2xl px-3 py-4 text-left transition-all active:scale-95 flex flex-col gap-1 select-none animate-slideUp`}
                style={{ animationDelay: `${di * 0.05}s` }}
              >
                {isHidden ? (
                  <>
                    <span className="text-xl">❓</span>
                    <span className="text-xs">Caché</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">{SHAPES[origIndex % 4]}</span>
                    <span className="text-xs leading-tight">{text}</span>
                  </>
                )}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

// ─── Reveal screen ────────────────────────────────────────────
function RevealScreen({
  reveal,
  question,
  playerId,
  pseudo,
  avatar,
  teams,
  config,
}: any) {
  const sorted = [...reveal.scores]
    .filter((p: any) => !p.isEliminated)
    .sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore = reveal.scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const myChoice = reveal.playerAnswers?.[playerId];
  const correct = myChoice === reveal.correctIndex;
  const myTeamId = reveal.scores.find((p: any) => p.id === playerId)?.teamId as
    | TeamId
    | undefined;
  const ptsThisQ = reveal.pointsEarned?.[playerId] ?? 0;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center gap-3 p-5 overflow-y-auto">
      {/* My result card */}
      <div
        className={`w-full max-w-sm rounded-2xl px-5 py-3 flex items-center gap-3 mt-2 animate-scaleIn ${
          myChoice !== undefined
            ? correct
              ? "bg-green-500/20 border border-green-400"
              : "bg-red-500/20 border border-red-400"
            : "bg-indigo-700"
        }`}
      >
        <div className="text-4xl">{AVATAR_EMOJI[avatar]}</div>
        <div className="flex flex-col flex-1">
          <span className="text-white font-bold">{pseudo}</span>
          {myTeamId && (
            <span
              className={`text-xs font-semibold ${myTeamId === "red" ? "text-red-300" : "text-blue-300"}`}
            >
              {myTeamId === "red" ? "🔴 Rouge" : "🔵 Bleue"}
            </span>
          )}
          {myChoice !== undefined ? (
            <span
              className={`text-sm font-semibold ${correct ? "text-green-300" : "text-red-300"}`}
            >
              {correct ? "✅ Bonne réponse !" : "❌ Mauvaise réponse"}
            </span>
          ) : (
            <span className="text-indigo-400 text-sm">Pas répondu</span>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-0.5">
          {ptsThisQ > 0 && (
            <span className="text-green-400 font-bold text-sm animate-scorePop">
              +{ptsThisQ.toLocaleString()} pts
            </span>
          )}
          <span className="text-yellow-400 font-extrabold text-xl">
            {myScore.toLocaleString()}
          </span>
          <span className="text-indigo-400 text-xs">#{myRank} · total</span>
        </div>
      </div>

      {/* Équipes */}
      {config?.mode === "teams" && teams && (
        <div className="w-full max-w-sm flex gap-2 animate-slideDown delay-100">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div
              key={tid}
              className={`flex-1 rounded-xl px-3 py-2 text-center ${
                tid === "red" ? "bg-red-500/20" : "bg-blue-500/20"
              }`}
            >
              <p
                className={`text-xs font-bold ${tid === "red" ? "text-red-300" : "text-blue-300"}`}
              >
                {tid === "red" ? "🔴" : "🔵"} {teams[tid].name}
              </p>
              <p className="text-yellow-400 font-extrabold">
                {teams[tid].score.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Image */}
      {question?.imageUrl && (
        <img
          src={question.imageUrl}
          alt="question"
          className="rounded-2xl max-h-28 object-contain animate-scaleIn"
        />
      )}

      {/* Answers breakdown */}
      {question && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {question.choices.map((choice: string, i: number) => {
            const isCorrect = i === reveal.correctIndex;
            const iMine = myChoice === i;
            const voters = reveal.scores.filter(
              (p: any) => reveal.playerAnswers?.[p.id] === i,
            );
            return (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 flex flex-col gap-1 transition-all animate-slideUp ${
                  isCorrect
                    ? "ring-2 ring-green-400 bg-indigo-700"
                    : "bg-indigo-800/50"
                } ${iMine && !isCorrect ? "ring-2 ring-red-400" : ""}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{SHAPES[i]}</span>
                  <span className="text-white text-sm font-semibold flex-1">
                    {choice}
                  </span>
                  {isCorrect && (
                    <span className="text-green-300 text-sm">✅</span>
                  )}
                  {iMine && !isCorrect && (
                    <span className="text-red-300 text-sm">← toi</span>
                  )}
                  {iMine && isCorrect && (
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
        En attente de la suite…
      </p>
    </div>
  );
}

// ─── Round end ────────────────────────────────────────────────
function RoundEndScreen({
  roundEnd,
  playerId,
  pseudo,
  avatar,
  teams,
  config,
}: any) {
  const myScore =
    roundEnd.scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const amElim = roundEnd.eliminatedPlayerId === playerId;
  const myTeamId = roundEnd.scores.find((p: any) => p.id === playerId)
    ?.teamId as TeamId | undefined;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto animate-fadeIn">
      {amElim ? (
        <>
          <div className="text-7xl animate-popIn">💀</div>
          <h1 className="text-3xl font-extrabold text-red-400 animate-slideDown">
            Éliminé !
          </h1>
          <p className="text-indigo-300 text-center animate-fadeIn delay-200">
            Tu as été éliminé à la manche {roundEnd.round}.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-extrabold text-white animate-slideDown">
            📊 Fin de la manche {roundEnd.round}
          </h2>
          {roundEnd.eliminatedPseudo && (
            <div className="bg-red-500/20 border border-red-400 rounded-xl px-4 py-2 text-center animate-scaleIn">
              <p className="text-red-300 text-sm">Éliminé cette manche</p>
              <p className="text-white font-bold">
                💀 {roundEnd.eliminatedPseudo}
              </p>
            </div>
          )}
          <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1 animate-popIn delay-100">
            <p className="text-indigo-400 text-xs">{pseudo}</p>
            <p className="text-3xl font-extrabold text-yellow-400">
              {myScore.toLocaleString()} pts
            </p>
          </div>
          {config?.mode === "teams" && myTeamId && teams && (
            <div
              className={`px-4 py-2 rounded-xl text-sm font-bold animate-scaleIn delay-200 ${TEAM_BADGE[myTeamId]}`}
            >
              Ton équipe : {teams[myTeamId].name} —{" "}
              {teams[myTeamId].score.toLocaleString()} pts
            </div>
          )}
        </>
      )}
      <p className="text-indigo-300 text-sm animate-pulse">
        En attente de la prochaine manche…
      </p>
    </div>
  );
}

// ─── Finished ─────────────────────────────────────────────────
function FinishedScreen({
  finished,
  playerId,
  pseudo,
  avatar,
  teams,
  config,
  onLeave,
}: any) {
  const sorted = [...finished.scores]
    .filter((p: any) => !p.isEliminated)
    .sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore =
    finished.scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const isTeams = config?.mode === "teams";
  const myTeamId = finished.scores.find((p: any) => p.id === playerId)
    ?.teamId as TeamId | undefined;
  const profile = loadProfile();

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto animate-fadeIn">
      <div className="text-6xl animate-popIn">
        {MEDALS[myRank] ?? AVATAR_EMOJI[avatar]}
      </div>
      <h1 className="text-3xl font-extrabold text-white animate-slideDown">
        Partie terminée !
      </h1>

      {isTeams && myTeamId && finished.winnerTeamId && (
        <div
          className={`px-5 py-2 rounded-xl text-sm font-bold animate-scaleIn ${TEAM_BADGE[myTeamId]}`}
        >
          {finished.winnerTeamId === myTeamId
            ? "🏆 Ton équipe a gagné !"
            : "😢 L'équipe adverse a gagné"}
        </div>
      )}

      <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1 animate-popIn delay-100">
        <p className="text-indigo-400 text-xs">{pseudo}</p>
        <p className="text-3xl font-extrabold text-yellow-400">
          {myScore.toLocaleString()} pts
        </p>
        {!isTeams && (
          <p className="text-indigo-300 text-sm">#{myRank} au classement</p>
        )}
      </div>

      {isTeams && teams && (
        <div className="w-full max-w-sm flex flex-col gap-2 animate-slideUp delay-200">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div
              key={tid}
              className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${
                tid === "red"
                  ? "border-red-400 bg-red-500/10"
                  : "border-blue-400 bg-blue-500/10"
              }`}
            >
              <span className="text-white font-bold flex-1">
                {teams[tid].name}
              </span>
              <span className="text-yellow-400 font-extrabold text-xl">
                {teams[tid].score.toLocaleString()}
              </span>
              {finished.winnerTeamId === tid && <span>🏆</span>}
            </div>
          ))}
        </div>
      )}

      {profile && profile.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-indigo-700/60 border border-indigo-500 rounded-2xl px-4 py-3 animate-slideUp delay-300">
          <p className="text-indigo-400 text-xs uppercase tracking-widest mb-2 text-center">
            Mes stats totales
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-white font-extrabold text-xl">
                {profile.gamesPlayed}
              </p>
              <p className="text-indigo-400 text-xs">Parties</p>
            </div>
            <div>
              <p className="text-yellow-400 font-extrabold text-xl">
                {profile.wins}
              </p>
              <p className="text-indigo-400 text-xs">Victoires</p>
            </div>
            <div>
              <p className="text-green-400 font-extrabold text-xl">
                {profile.totalScore.toLocaleString()}
              </p>
              <p className="text-indigo-400 text-xs">Score total</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm overflow-y-auto max-h-52 animate-slideUp delay-400">
        <Scoreboard
          players={finished.scores.filter((p: any) => !p.isEliminated)}
          currentPlayerId={playerId}
        />
      </div>

      <button
        onClick={onLeave}
        className="bg-indigo-600 active:bg-indigo-500 active:scale-95 text-white font-bold text-lg px-10 py-3 rounded-2xl shadow-lg transition-all"
      >
        Retour à l'accueil
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function PlayerScreen({
  roomCode,
  playerId,
  sessionToken,
  pseudo,
  avatar,
  onLeave,
  onRoomClosed,
}: Props) {
  const statsUpdated = useRef(false);

  const {
    state,
    connected,
    roomClosed,
    kicked,
    question,
    reveal,
    roundEnd,
    finished,
    paused,
    pausedTimeLeft,
    myPower,
    powerEffect,
    teams,
    leave,
    usePower,
  } = useRoom({ role: "player", roomCode, playerId, sessionToken });

  const config = state?.config;
  const players = state?.players ?? [];

  useEffect(() => {
    if (!finished || statsUpdated.current) return;
    statsUpdated.current = true;
    const isTeams = config?.mode === "teams";
    const myTeamId = finished.scores.find((p: any) => p.id === playerId)
      ?.teamId as TeamId | undefined;
    const myScore =
      finished.scores.find((p: any) => p.id === playerId)?.score ?? 0;
    const isWin = isTeams
      ? myTeamId
        ? finished.winnerTeamId === myTeamId
        : false
      : [...finished.scores]
          .filter((p: any) => !p.isEliminated)
          .sort((a: any, b: any) => b.score - a.score)[0]?.id === playerId;
    updateStats(myScore, isWin);
  }, [finished, playerId, config]);

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

  const isEliminated = state?.eliminatedPlayerIds?.includes(playerId);

  if (finished)
    return (
      <>
        <ConnBadge connected={connected} />
        <FinishedScreen
          finished={finished}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
          teams={teams}
          config={config}
          onLeave={handleLeave}
        />
      </>
    );
  if (roundEnd)
    return (
      <>
        <ConnBadge connected={connected} />
        <RoundEndScreen
          roundEnd={roundEnd}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
          teams={teams}
          config={config}
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
          teams={teams}
          config={config}
        />
      </>
    );
  if (question && !isEliminated)
    return (
      <>
        <ConnBadge connected={connected} />
        <QuestionScreen
          roomCode={roomCode}
          question={question}
          paused={paused}
          pausedTimeLeft={pausedTimeLeft}
          myPower={myPower}
          powerEffect={powerEffect}
          players={players}
          playerId={playerId}
          sessionToken={sessionToken}
          onUsePower={usePower}
        />
      </>
    );

  return (
    <>
      <ConnBadge connected={connected} />
      {isEliminated ? (
        <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 animate-fadeIn">
          <div className="text-7xl">👀</div>
          <p className="text-white text-2xl font-bold">Mode spectateur</p>
          <p className="text-indigo-300">
            Tu as été éliminé — regarde la suite !
          </p>
        </div>
      ) : (
        <Lobby
          roomCode={roomCode}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
          players={players}
          connected={connected}
          teams={teams}
          config={config}
          onLeave={handleLeave}
        />
      )}
    </>
  );
}
