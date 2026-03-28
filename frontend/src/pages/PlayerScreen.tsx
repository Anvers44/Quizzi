import { useEffect, useRef, useState } from "react";
import { useRoom } from "../hooks/useRoom";
import { useAnswer } from "../hooks/useAnswer";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { loadProfile, updateStats } from "../lib/profile";
import { AVATAR_EMOJI, POWER_LABELS, POWER_DESC } from "../types";
import { playTickBeep, vibrate } from "../lib/sound";
import Scoreboard from "../components/Scoreboard";
import type { Avatar, TeamId, PowerType } from "../types";
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
const COLORS_DIM = [
  "bg-red-500/30",
  "bg-blue-500/30",
  "bg-yellow-500/30",
  "bg-green-500/30",
];
const SHAPES = ["▲", "◆", "●", "■"];

const TEAM_BADGES: Record<TeamId, string> = {
  red: "bg-red-500/20 border border-red-400 text-red-300",
  blue: "bg-blue-500/20 border border-blue-400 text-blue-300",
};

function ConnBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`fixed top-3 right-3 text-xs px-2 py-1 rounded-full font-semibold z-50 ${connected ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300 animate-pulse"}`}
    >
      {connected ? "●" : "○"}
    </div>
  );
}

// ─── Power overlay (visual effects) ─────────────────────────
interface EffectState {
  flip: boolean;
  freeze: boolean;
  blind: number | null; // hidden choice index
  shuffle: number[] | null; // new order
}

function usePowerEffects(powerEffect: any, playerId: string): EffectState {
  const [effects, setEffects] = useState<EffectState>({
    flip: false,
    freeze: false,
    blind: null,
    shuffle: null,
  });

  useEffect(() => {
    if (!powerEffect || powerEffect.targetPlayerId !== playerId) return;
    const t = powerEffect.type as PowerType;
    if (t === "flip") {
      setEffects((e) => ({ ...e, flip: true }));
      setTimeout(() => setEffects((e) => ({ ...e, flip: false })), 5000);
    } else if (t === "freeze") {
      setEffects((e) => ({ ...e, freeze: true }));
      setTimeout(() => setEffects((e) => ({ ...e, freeze: false })), 4000);
    } else if (t === "blind") {
      setEffects((e) => ({
        ...e,
        blind: powerEffect.hiddenChoiceIndex ?? null,
      }));
      setTimeout(() => setEffects((e) => ({ ...e, blind: null })), 8000);
    } else if (t === "shuffle") {
      setEffects((e) => ({
        ...e,
        shuffle: powerEffect.newChoiceOrder ?? null,
      }));
      setTimeout(() => setEffects((e) => ({ ...e, shuffle: null })), 6000);
    }
  }, [powerEffect, playerId]);

  return effects;
}

// ─── Power button ────────────────────────────────────────────
function PowerPanel({
  myPower,
  players,
  playerId,
  onUsePower,
}: {
  myPower: PowerType | null;
  players: PublicPlayer[];
  playerId: string;
  onUsePower: (targetId: string) => void;
}) {
  const [targeting, setTargeting] = useState(false);
  if (!myPower) return null;

  const isAttack = ["blind", "freeze", "flip", "shuffle"].includes(myPower);
  const targets = isAttack
    ? players.filter((p) => p.id !== playerId && p.connected && !p.isEliminated)
    : [];

  if (targeting && isAttack) {
    return (
      <div className="w-full max-w-sm bg-indigo-800 border border-yellow-400 rounded-2xl p-3">
        <p className="text-yellow-400 text-sm font-bold mb-2 text-center">
          Choisir une cible :
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          {targets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onUsePower(p.id);
                setTargeting(false);
              }}
              className="flex items-center gap-2 bg-indigo-700 active:bg-indigo-600 text-white px-3 py-2 rounded-xl font-semibold text-sm"
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
  }

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => (isAttack ? setTargeting(true) : onUsePower(playerId))}
        className="w-full bg-purple-600 active:bg-purple-500 text-white font-bold rounded-2xl px-4 py-3 flex items-center gap-3"
      >
        <div className="text-left flex-1">
          <p className="text-base">{POWER_LABELS[myPower]}</p>
          <p className="text-xs opacity-70">{POWER_DESC[myPower]}</p>
        </div>
        <span className="text-2xl">{isAttack ? "⚔️" : "🛡️"}</span>
      </button>
    </div>
  );
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
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto">
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

      {myTeamId && (
        <div
          className={`px-4 py-2 rounded-xl text-sm font-bold ${TEAM_BADGES[myTeamId]}`}
        >
          {myTeamId === "red" ? "🔴 Équipe Rouge" : "🔵 Équipe Bleue"}
        </div>
      )}

      <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          Partie
        </p>
        <p className="text-2xl font-bold text-white tracking-widest">
          {roomCode}
        </p>
        <p className="text-indigo-400 text-xs">
          {config?.mode === "teams"
            ? "Mode Équipes"
            : config?.mode === "tournament"
              ? "Mode Tournoi"
              : "Mode Classique"}
          {config?.powersEnabled ? " · ⚡ Pouvoirs" : ""}
        </p>
      </div>

      <p className="text-indigo-300 text-base animate-pulse">
        En attente du début…
      </p>

      {profile && profile.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-indigo-800/60 border border-indigo-600 rounded-2xl px-4 py-3">
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
                {profile.totalScore}
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
  const { status, submitAnswer } = useAnswer();
  const answered = status === "sent" || status === "already";
  const lastBeep = useRef(-1);
  const effects = usePowerEffects(powerEffect, playerId);

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

  // Shuffle choices
  const displayChoices = effects.shuffle
    ? effects.shuffle.map((i) => ({ text: question.choices[i], origIndex: i }))
    : question.choices.map((t: string, i: number) => ({
        text: t,
        origIndex: i,
      }));

  const wrapperStyle = effects.flip
    ? { transform: "rotate(180deg)", transition: "transform 0.3s" }
    : {};

  return (
    <div
      className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-4 overflow-hidden"
      style={wrapperStyle}
    >
      {/* Freeze overlay */}
      {effects.freeze && (
        <div className="absolute inset-0 bg-blue-500/30 backdrop-blur-sm z-40 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="text-center">
            <p className="text-6xl">❄️</p>
            <p className="text-white font-bold text-xl">Gelé !</p>
          </div>
        </div>
      )}

      {/* Attacked notification */}
      {powerEffect && powerEffect.targetPlayerId === playerId && (
        <div className="w-full max-w-sm bg-red-500/20 border border-red-400 rounded-xl px-3 py-2 text-center text-sm text-red-300 font-semibold">
          ⚔️ {powerEffect.fromPseudo} t'a utilisé{" "}
          {POWER_LABELS[powerEffect.type as PowerType]}!
        </div>
      )}

      {/* Timer */}
      <div className="w-full max-w-sm pt-2">
        <div className="flex justify-between text-indigo-300 text-sm mb-1">
          <span>
            M{question.round}/{question.totalRounds} · Q
            {(question.index % 99) + 1}
          </span>
          <span
            className={`font-bold tabular-nums ${display <= 5 && !paused ? "text-red-400 animate-pulse" : "text-white"}`}
          >
            {paused ? "⏸ " : ""}
            {display}s
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

      {/* Status */}
      <div className="w-full max-w-sm min-h-8 flex items-center justify-center">
        {answered && !paused && (
          <p className="text-indigo-300 text-sm font-semibold text-center">
            ⏳ Réponse envoyée
          </p>
        )}
        {status === "error" && (
          <p className="text-red-400 text-sm">Erreur — réessaie</p>
        )}
      </div>

      {/* Power button */}
      {myPower && !answered && (
        <PowerPanel
          myPower={myPower}
          players={players}
          playerId={playerId}
          onUsePower={onUsePower}
        />
      )}

      {/* Choices */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm pb-2">
        {displayChoices.map(
          (
            { text, origIndex }: { text: string; origIndex: number },
            displayI: number,
          ) => {
            const isHidden = effects.blind === origIndex;
            return (
              <button
                key={origIndex}
                disabled={
                  answered ||
                  status === "sending" ||
                  paused ||
                  effects.freeze ||
                  isHidden
                }
                onClick={() => submitAnswer(roomCode, question.id, origIndex)}
                className={`${
                  isHidden
                    ? "bg-indigo-700 opacity-30"
                    : answered
                      ? COLORS_SENT[origIndex % 4] + " opacity-60"
                      : paused || effects.freeze
                        ? COLORS_SENT[origIndex % 4] + " opacity-50"
                        : COLORS[origIndex % 4]
                } disabled:cursor-not-allowed text-white font-bold rounded-2xl px-3 py-4 text-left transition flex flex-col gap-1 select-none`}
              >
                {isHidden ? (
                  <>
                    <span className="text-xl">?</span>
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

// ─── Reveal screen ───────────────────────────────────────────
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

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center gap-3 p-5 overflow-y-auto">
      <div
        className={`w-full max-w-sm rounded-2xl px-5 py-3 flex items-center gap-3 mt-2 ${
          myChoice !== undefined
            ? correct
              ? "bg-green-500/20 border border-green-400"
              : "bg-red-500/20 border border-red-400"
            : "bg-indigo-700"
        }`}
      >
        <div className="text-4xl">{AVATAR_EMOJI[avatar]}</div>
        <div className="flex flex-col">
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
        <div className="ml-auto text-right">
          <p className="text-yellow-400 font-extrabold text-xl">{myScore}</p>
          <p className="text-indigo-400 text-xs">#{myRank}</p>
        </div>
      </div>

      {/* Team bar in teams mode */}
      {config?.mode === "teams" && teams && (
        <div className="w-full max-w-sm">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div key={tid} className="flex justify-between text-sm py-1">
              <span
                className={tid === "red" ? "text-red-300" : "text-blue-300"}
              >
                {tid === "red" ? "🔴" : "🔵"} {teams[tid].name}
              </span>
              <span className="text-yellow-400 font-bold">
                {teams[tid].score}
              </span>
            </div>
          ))}
        </div>
      )}

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
                className={`rounded-xl px-4 py-3 flex flex-col gap-1 ${isCorrect ? "ring-2 ring-green-400 bg-indigo-700" : "bg-indigo-800/50"} ${iMine && !isCorrect ? "ring-2 ring-red-400" : ""}`}
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

// ─── Round end screen ────────────────────────────────────────
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
  const amEliminated = roundEnd.eliminatedPlayerId === playerId;
  const myTeamId = roundEnd.scores.find((p: any) => p.id === playerId)
    ?.teamId as TeamId | undefined;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto">
      {amEliminated ? (
        <>
          <div className="text-7xl">💀</div>
          <h1 className="text-3xl font-extrabold text-red-400">Éliminé !</h1>
          <p className="text-indigo-300 text-center">
            Tu as été éliminé à la manche {roundEnd.round}.<br />
            Continue à regarder la partie !
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-extrabold text-white">
            📊 Fin de la manche {roundEnd.round}
          </h2>
          {roundEnd.eliminatedPseudo && (
            <div className="bg-red-500/20 border border-red-400 rounded-xl px-4 py-2 text-center">
              <p className="text-red-300 text-sm">Éliminé cette manche</p>
              <p className="text-white font-bold">
                💀 {roundEnd.eliminatedPseudo}
              </p>
            </div>
          )}
          <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1">
            <p className="text-indigo-400 text-xs uppercase tracking-widest">
              {pseudo}
            </p>
            <p className="text-3xl font-extrabold text-yellow-400">
              {myScore} pts
            </p>
          </div>
          {config?.mode === "teams" && myTeamId && teams && (
            <div
              className={`px-4 py-2 rounded-xl text-sm font-bold ${TEAM_BADGES[myTeamId]}`}
            >
              Ton équipe : {teams[myTeamId].name} — {teams[myTeamId].score} pts
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

// ─── Finished screen ─────────────────────────────────────────
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
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto">
      <div className="text-6xl">{MEDALS[myRank] ?? AVATAR_EMOJI[avatar]}</div>
      <h1 className="text-3xl font-extrabold text-white">Partie terminée !</h1>

      {isTeams && myTeamId && finished.winnerTeamId && (
        <div
          className={`px-5 py-2 rounded-xl text-sm font-bold ${TEAM_BADGES[myTeamId]}`}
        >
          {finished.winnerTeamId === myTeamId
            ? "🏆 Ton équipe a gagné !"
            : "😢 L'équipe adverse a gagné"}
        </div>
      )}

      <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1">
        <p className="text-indigo-400 text-xs uppercase tracking-widest">
          {pseudo}
        </p>
        <p className="text-3xl font-extrabold text-yellow-400">{myScore} pts</p>
        {!isTeams && (
          <p className="text-indigo-300 text-sm">#{myRank} au classement</p>
        )}
      </div>

      {isTeams && teams && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {(["red", "blue"] as TeamId[]).map((tid) => (
            <div
              key={tid}
              className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${tid === "red" ? "border-red-400 bg-red-500/10" : "border-blue-400 bg-blue-500/10"}`}
            >
              <span className="text-white font-bold flex-1">
                {teams[tid].name}
              </span>
              <span className="text-yellow-400 font-extrabold text-xl">
                {teams[tid].score}
              </span>
              {finished.winnerTeamId === tid && <span>🏆</span>}
            </div>
          ))}
        </div>
      )}

      {profile && profile.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-indigo-700/60 border border-indigo-500 rounded-2xl px-4 py-3">
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
                {profile.totalScore}
              </p>
              <p className="text-indigo-400 text-xs">Score total</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm overflow-y-auto max-h-52">
        <Scoreboard
          players={finished.scores.filter((p: any) => !p.isEliminated)}
          currentPlayerId={playerId}
        />
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

// ─── Main PlayerScreen ───────────────────────────────────────
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

  // Stats update on finish
  useEffect(() => {
    if (!finished || statsUpdated.current) return;
    statsUpdated.current = true;
    const isTeams = config?.mode === "teams";
    if (isTeams) {
      const myTeamId = finished.scores.find((p) => p.id === playerId)
        ?.teamId as TeamId | undefined;
      const isWin = myTeamId ? finished.winnerTeamId === myTeamId : false;
      const myScore =
        finished.scores.find((p) => p.id === playerId)?.score ?? 0;
      updateStats(myScore, isWin);
    } else {
      const sorted = [...finished.scores]
        .filter((p) => !p.isEliminated)
        .sort((a, b) => b.score - a.score);
      const isWin = sorted[0]?.id === playerId;
      const myScore =
        finished.scores.find((p) => p.id === playerId)?.score ?? 0;
      updateStats(myScore, isWin);
    }
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

  // Lobby / waiting / eliminated spectator
  return (
    <>
      <ConnBadge connected={connected} />
      {isEliminated ? (
        <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6">
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
