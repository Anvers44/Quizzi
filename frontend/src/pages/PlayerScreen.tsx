/**
 * PlayerScreen.tsx — version complète avec bluff intégré
 * Les écrans bluff sont insérés dans le flux principal.
 */

import { useState, useEffect, useRef } from "react";
import { useRoom } from "../hooks/useRoom";
import { useAnswer } from "../hooks/useAnswer";
import { useTimer } from "../hooks/useTimer";
import { clearSession } from "../lib/session";
import { loadProfile, updateStats } from "../lib/profile";
import {
  AVATAR_EMOJI,
  POWER_LABELS,
  POWER_DESC,
  TEAM_META,
  ALL_TEAM_IDS,
  THEME_LABELS,
} from "../types";
import {
  playTickBeep,
  playUrgentBeep,
  playPowerSound,
  playCountdownStart,
  vibrate,
  unlockAudio,
} from "../lib/sound";
import Scoreboard from "../components/Scoreboard";
import {
  BluffInputScreen,
  BluffVoteScreen,
  BluffRevealScreen,
} from "../components/BluffScreens";
import type { Avatar, AttackPower, DefensePower, Difficulty } from "../types";
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
  "bg-red-900",
  "bg-blue-900",
  "bg-yellow-900",
  "bg-green-900",
];
const SHAPES = ["▲", "◆", "●", "■"];
const DIFF_STARS: Record<Difficulty, string> = {
  easy: "⭐",
  medium: "⭐⭐",
  hard: "⭐⭐⭐",
};

// ── Helpers ───────────────────────────────────────────────────

function ConnBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`fixed top-3 right-3 text-xs px-2 py-1 rounded-full font-semibold z-50 ${
        connected
          ? "bg-green-500/20 text-green-300"
          : "bg-red-500/20 text-red-300 animate-pulse"
      }`}
    >
      {connected ? "●" : "○"}
    </div>
  );
}

function CountdownOverlay({ n, round }: { n: number; round: number }) {
  return (
    <div className="absolute inset-0 bg-indigo-900/96 z-50 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
      <p className="text-indigo-300 text-sm uppercase tracking-widest mb-2">
        Manche {round}
      </p>
      <p className="text-indigo-400 text-sm mb-6">Prépare-toi !</p>
      <span
        key={n}
        className="text-9xl font-extrabold text-white animate-popIn"
      >
        {n}
      </span>
    </div>
  );
}

// ── Power panel ───────────────────────────────────────────────

function PowerRevealPanel({
  attackPower,
  defensePower,
  attackUsed,
  defenseUsed,
  players,
  playerId,
  onUseAttack,
  onUseDefense,
}: any) {
  const [targeting, setTargeting] = useState(false);
  const targets = players.filter(
    (p: any) => p.id !== playerId && p.connected && !p.isEliminated,
  );

  if (targeting)
    return (
      <div className="w-full max-w-sm bg-indigo-800 border border-red-400 rounded-2xl p-3 animate-slideUp">
        <p className="text-red-300 text-sm font-bold mb-2 text-center">
          ⚔️ Choisir une cible :
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          {targets.map((p: any) => (
            <button
              key={p.id}
              onClick={() => {
                onUseAttack(p.id);
                setTargeting(false);
                playPowerSound();
              }}
              className="flex items-center gap-2 bg-indigo-700 active:bg-indigo-600 text-white px-3 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
            >
              <span>{AVATAR_EMOJI[p.avatar as Avatar] || p.avatar}</span>
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
    <div className="w-full max-w-sm flex flex-col gap-2">
      <p className="text-indigo-400 text-xs text-center uppercase tracking-widest">
        Tes pouvoirs
      </p>
      <div className="flex gap-2">
        {attackPower ? (
          <button
            onClick={() => {
              if (!attackUsed) setTargeting(true);
            }}
            disabled={attackUsed}
            className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
              attackUsed
                ? "bg-indigo-800 text-indigo-600 opacity-50 cursor-not-allowed"
                : "bg-red-600 active:bg-red-500 text-white"
            }`}
          >
            <span className="text-2xl">⚔️</span>
            <span className="text-xs">{POWER_LABELS[attackPower]}</span>
            <span className="text-xs opacity-70">
              {POWER_DESC[attackPower]}
            </span>
            {attackUsed && <span className="text-xs">Utilisé</span>}
          </button>
        ) : (
          <div className="flex-1 bg-indigo-800/40 rounded-2xl px-3 py-3 flex items-center justify-center text-indigo-600 text-xs">
            Pas d'attaque
          </div>
        )}
        {defensePower ? (
          <button
            onClick={() => {
              if (!defenseUsed) {
                onUseDefense();
                playPowerSound();
              }
            }}
            disabled={defenseUsed}
            className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
              defenseUsed
                ? "bg-indigo-800 text-indigo-600 opacity-50 cursor-not-allowed"
                : "bg-blue-600 active:bg-blue-500 text-white"
            }`}
          >
            <span className="text-2xl">🛡️</span>
            <span className="text-xs">{POWER_LABELS[defensePower]}</span>
            <span className="text-xs opacity-70">
              {POWER_DESC[defensePower]}
            </span>
            {defenseUsed && <span className="text-xs">Utilisé</span>}
          </button>
        ) : (
          <div className="flex-1 bg-indigo-800/40 rounded-2xl px-3 py-3 flex items-center justify-center text-indigo-600 text-xs">
            Pas de défense
          </div>
        )}
      </div>
    </div>
  );
}

// ── Question screen ───────────────────────────────────────────

function QuestionScreen({
  roomCode,
  question,
  paused,
  pausedTimeLeft,
  countdown,
  powerEffect,
  onPowerEffectHandled,
  players,
  playerId,
  specialtyTheme,
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
  const { status, submitAnswer } = useAnswer();
  const answered = status === "sent" || status === "already";
  const lastBeep = useRef(-1);
  const lastCdBeep = useRef(-1);

  // ✅ useState / useEffect importés en haut du fichier, utilisés directement
  const [flipR, setFlipR] = useState(false);
  const [freezeR, setFreezeR] = useState(false);
  const [blindR, setBlindR] = useState<number | null>(null);
  const [shuffleR, setShuffleR] = useState<number[] | null>(null);

  // Dans QuestionScreen, le useEffect existant :
  useEffect(() => {
    console.log(
      "[QuestionScreen] powerEffect =",
      powerEffect,
      "| playerId =",
      playerId,
    );
    if (!powerEffect || powerEffect.targetPlayerId !== playerId) return;
    console.log("[QuestionScreen] APPLYING effect", powerEffect.type);
    onPowerEffectHandled?.(); // ✅ clear dès traitement
    const t = powerEffect.type;
    playPowerSound();
    if (t === "flip") {
      setFlipR(true);
      setTimeout(() => setFlipR(false), 5000);
    }
    if (t === "freeze") {
      setFreezeR(true);
      setTimeout(() => setFreezeR(false), 4000);
    }
    if (t === "blind") {
      setBlindR(powerEffect.hiddenChoiceIndex ?? 0);
      setTimeout(() => setBlindR(null), 8000);
    }
    if (t === "shuffle") {
      setShuffleR(powerEffect.newChoiceOrder ?? null);
      setTimeout(() => setShuffleR(null), 6000);
    }
  }, [powerEffect, playerId]);

  useEffect(() => {
    if (countdown > 0 && countdown !== lastCdBeep.current) {
      lastCdBeep.current = countdown;
      if (countdown === 3) playCountdownStart();
      else playTickBeep();
    }
  }, [countdown]);

  useEffect(() => {
    if (
      !paused &&
      !countdown &&
      display <= 5 &&
      display > 0 &&
      display !== lastBeep.current
    ) {
      lastBeep.current = display;
      if (display === 1) playUrgentBeep();
      else playTickBeep();
      vibrate(50);
    }
  }, [display, paused, countdown]);

  const isSpecialtyQ =
    specialtyTheme &&
    specialtyTheme !== "none" &&
    question.theme === specialtyTheme;

  const displayChoices = shuffleR
    ? shuffleR.map((i: number) => ({ text: question.choices[i], origIndex: i }))
    : question.choices.map((t: string, i: number) => ({
        text: t,
        origIndex: i,
      }));

  return (
    <div
      className={`relative h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-4 overflow-hidden ${
        flipR ? "flip-180" : ""
      }`}
    >
      {countdown > 0 && (
        <CountdownOverlay n={countdown} round={question.round} />
      )}
      {freezeR && (
        <div className="absolute inset-0 freeze-overlay z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-popIn">
            <p className="text-7xl">❄️</p>
            <p className="text-white font-bold text-xl">Gelé !</p>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm pt-2 animate-fadeIn">
        <div className="flex justify-between text-indigo-300 text-sm mb-1">
          <div className="flex items-center gap-2">
            <span>
              M{question.round}/{question.totalRounds} · Q{question.index + 1}
            </span>
            <span className="text-indigo-500">
              {DIFF_STARS[question.difficulty as Difficulty]}
            </span>
            {isSpecialtyQ && (
              <span className="text-yellow-400 text-xs">⭐</span>
            )}
          </div>
          <span
            className={`font-bold tabular-nums ${
              display <= 5 && !paused && !countdown
                ? "text-red-400 animate-timerPulse"
                : "text-white"
            }`}
          >
            {paused ? "⏸ " : ""}
            {countdown > 0 ? `⏳ ${countdown}` : `${display}s`}
          </span>
        </div>
        <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
          <div
            className={`${timerColor} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {isSpecialtyQ && !answered && (
        <div className="bg-yellow-400/20 border border-yellow-400 rounded-xl px-3 py-1.5 text-yellow-300 text-xs font-bold animate-slideDown">
          ⭐ Question spécialité ! +20% si correct · −100 si faux
        </div>
      )}
      {paused && (
        <div className="bg-indigo-700/80 rounded-2xl px-6 py-2 text-white font-bold text-sm">
          ⏸ Partie en pause
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm px-2 gap-3">
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt=""
            loading="lazy"
            className="rounded-2xl shadow-lg max-h-36 object-contain animate-scaleIn"
          />
        )}
        <p className="text-white text-lg font-bold text-center leading-snug animate-fadeIn">
          {question.text}
        </p>
      </div>
      <div className="w-full max-w-sm min-h-8 flex items-center justify-center">
        {answered && !paused && (
          <p className="text-indigo-300 text-sm font-semibold text-center animate-fadeInFast">
            ⏳ Réponse envoyée !
          </p>
        )}
        {status === "error" && (
          <p className="text-red-400 text-sm animate-shake">
            Erreur — réessaie
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm pb-2">
        {displayChoices.map(
          (
            { text, origIndex }: { text: string; origIndex: number },
            di: number,
          ) => {
            const isHidden = blindR === origIndex;
            const isDisabled =
              answered ||
              status === "sending" ||
              paused ||
              freezeR ||
              isHidden ||
              countdown > 0;
            return (
              <button
                key={origIndex}
                disabled={isDisabled}
                onClick={() => {
                  submitAnswer(roomCode, question.id, origIndex);
                  vibrate(30);
                }}
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
  const specialtyTheme = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("quiz_session") || "{}")
          ?.specialtyTheme || null
      );
    } catch {
      return null;
    }
  })();

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
    countdown,
    attackPower,
    defensePower,
    attackUsed,
    defenseUsed,
    powerEffect,
    teams,
    bluffInput,
    bluffVote,
    bluffReveal,
    bluffSubmitCount,
    bluffSubmitTotal,
    bluffVotedCount,
    leave,
    useAttack,
    useDefense,
    clearPowerEffect,
    submitBluff,
    voteBluff,
  } = useRoom({ role: "player", roomCode, playerId, sessionToken });

  const config = state?.config;
  const players = state?.players ?? [];

  useEffect(() => {
    unlockAudio();
  }, []);

  useEffect(() => {
    if (!finished || statsUpdated.current) return;
    statsUpdated.current = true;
    const isTeams = config?.mode === "teams";
    const myTeamId = finished.scores.find(
      (p: any) => p.id === playerId,
    )?.teamId;
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

  // ── Bluff phases ──────────────────────────────────────────

  if (bluffReveal)
    return (
      <>
        <ConnBadge connected={connected} />
        <BluffRevealScreen
          payload={bluffReveal}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
        />
        {/* ✅ Pouvoirs disponibles après bluff aussi */}
        {config?.powersEnabled && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-50">
            <PowerRevealPanel
              attackPower={attackPower}
              defensePower={defensePower}
              attackUsed={attackUsed}
              defenseUsed={defenseUsed}
              players={players}
              playerId={playerId}
              onUseAttack={useAttack}
              onUseDefense={useDefense}
            />
          </div>
        )}
      </>
    );

  if (bluffVote) {
    return (
      <>
        <ConnBadge connected={connected} />
        <BluffVoteScreen
          payload={bluffVote}
          question={bluffVote.question} // ✅ plus besoin de bluffInput
          playerId={playerId}
          votedCount={bluffVotedCount}
          totalPlayers={
            players.filter((p: any) => p.connected && !p.isEliminated).length
          }
          onVote={voteBluff}
          mySubmittedText={undefined}
        />
      </>
    );
  }

  if (bluffInput)
    return (
      <>
        <ConnBadge connected={connected} />
        <BluffInputScreen
          payload={bluffInput}
          playerId={playerId}
          submitCount={bluffSubmitCount}
          submitTotal={bluffSubmitTotal}
          onSubmit={submitBluff}
          countdown={countdown}
        />
      </>
    );

  // ── Standard phases ───────────────────────────────────────

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
          attackPower={attackPower}
          defensePower={defensePower}
          attackUsed={attackUsed}
          defenseUsed={defenseUsed}
          players={players}
          onUseAttack={useAttack}
          onUseDefense={useDefense}
          specialtyTheme={specialtyTheme}
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
          countdown={countdown}
          powerEffect={powerEffect}
          onPowerEffectHandled={clearPowerEffect}
          players={players}
          playerId={playerId}
          sessionToken={sessionToken}
          specialtyTheme={specialtyTheme}
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
        <LobbyScreen
          roomCode={roomCode}
          playerId={playerId}
          pseudo={pseudo}
          avatar={avatar}
          players={players}
          connected={connected}
          teams={teams}
          config={config}
          specialtyTheme={specialtyTheme}
          onLeave={handleLeave}
        />
      )}
    </>
  );
}

// ─── Sub-screens ──────────────────────────────────────────────

function LobbyScreen({
  roomCode,
  playerId,
  pseudo,
  avatar,
  players,
  connected,
  teams,
  config,
  specialtyTheme,
  onLeave,
}: any) {
  const myTeamId = players.find((p: any) => p.id === playerId)?.teamId;
  const myTeam = myTeamId && TEAM_META[myTeamId as keyof typeof TEAM_META];
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-sm flex justify-between items-center">
        <div
          className={`text-xs px-3 py-1 rounded-full font-semibold ${
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
      {specialtyTheme && specialtyTheme !== "none" && (
        <div className="bg-yellow-400/20 border border-yellow-400 rounded-xl px-3 py-1 text-xs font-bold text-yellow-300">
          ⭐ Spécialité : {THEME_LABELS[specialtyTheme] || specialtyTheme}
        </div>
      )}
      {myTeam && (
        <div
          className={`px-4 py-2 rounded-xl text-sm font-bold ${myTeam.light} border ${myTeam.border} ${myTeam.text} animate-scaleIn`}
        >
          {myTeam.emoji} Équipe {myTeam.label}
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
          <p className="text-indigo-400 text-xs flex gap-2">
            <span>
              {config.mode === "teams"
                ? "Équipes"
                : config.mode === "tournament"
                  ? "Tournoi"
                  : "Classique"}
            </span>
            {config.powersEnabled && <span>· ⚡</span>}
            {config.bluffEnabled && <span>· 🎭 Bluff</span>}
          </p>
        )}
      </div>
      <p className="text-indigo-300 text-base animate-pulse">
        En attente du début…
      </p>
    </div>
  );
}

function RevealScreen({
  reveal,
  question,
  playerId,
  pseudo,
  avatar,
  teams,
  config,
  attackPower,
  defensePower,
  attackUsed,
  defenseUsed,
  players,
  onUseAttack,
  onUseDefense,
  specialtyTheme,
}: any) {
  const sorted = [...reveal.scores]
    .filter((p: any) => !p.isEliminated)
    .sort((a: any, b: any) => b.score - a.score);
  const myRank = sorted.findIndex((p: any) => p.id === playerId) + 1;
  const myScore = reveal.scores.find((p: any) => p.id === playerId)?.score ?? 0;
  const myChoice = reveal.playerAnswers?.[playerId];
  const correct = myChoice !== undefined && myChoice === reveal.correctIndex;
  const myTeamId = reveal.scores.find((p: any) => p.id === playerId)?.teamId;
  const myTeam = myTeamId && TEAM_META[myTeamId as keyof typeof TEAM_META];
  const ptsThisQ = reveal.pointsEarned?.[playerId] ?? 0;
  const myTime = reveal.timeTaken?.[playerId];
  const isSpecialty =
    specialtyTheme &&
    specialtyTheme !== "none" &&
    reveal.questionTheme === specialtyTheme;
  const SHAPES2 = ["▲", "◆", "●", "■"];

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center gap-3 p-5 overflow-y-auto">
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
          {myTeam && (
            <span className={`text-xs font-semibold ${myTeam.text}`}>
              {myTeam.emoji} Équipe {myTeam.label}
            </span>
          )}
          {myChoice !== undefined ? (
            <>
              <span
                className={`text-sm font-semibold ${
                  correct ? "text-green-300" : "text-red-300"
                }`}
              >
                {correct ? "✅ Bonne réponse !" : "❌ Mauvaise réponse"}
              </span>
              {isSpecialty && (
                <span className="text-yellow-400 text-xs">
                  {correct ? "⭐ Bonus spécialité +20%" : "⭐ Pénalité −100"}
                </span>
              )}
            </>
          ) : (
            <span className="text-indigo-400 text-sm">
              ⏰ Pas répondu — 0 pts
            </span>
          )}
          {myTime !== undefined && (
            <span className="text-indigo-400 text-xs">
              {myTime.toFixed(1)}s
            </span>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-0.5">
          {ptsThisQ > 0 && (
            <span className="text-green-400 font-bold text-sm animate-scorePop">
              +{ptsThisQ.toLocaleString()}
            </span>
          )}
          {ptsThisQ < 0 && (
            <span className="text-red-400 font-bold text-sm animate-scorePop">
              {ptsThisQ}
            </span>
          )}
          <span className="text-yellow-400 font-extrabold text-xl">
            {myScore.toLocaleString()}
          </span>
          <span className="text-indigo-400 text-xs">#{myRank} total</span>
        </div>
      </div>
      {config?.mode === "teams" && teams && (
        <div className="w-full max-w-sm grid grid-cols-2 gap-2 animate-slideDown delay-100">
          {ALL_TEAM_IDS.filter((id) => teams[id]).map((id) => (
            <div
              key={id}
              className={`rounded-xl px-3 py-2 text-center ${TEAM_META[id].light}`}
            >
              <p className={`text-xs font-bold ${TEAM_META[id].text}`}>
                {TEAM_META[id].emoji} {teams[id].name}
              </p>
              <p className="text-yellow-400 font-extrabold">
                {teams[id].score.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
      {question?.imageUrl && (
        <img
          src={question.imageUrl}
          alt=""
          className="rounded-2xl max-h-24 object-contain animate-scaleIn"
        />
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
                className={`rounded-xl px-4 py-3 flex flex-col gap-1 animate-slideUp ${
                  isCorrect
                    ? "ring-2 ring-green-400 bg-indigo-700"
                    : "bg-indigo-800/50"
                } ${iMine && !isCorrect ? "ring-2 ring-red-400" : ""}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{SHAPES2[i]}</span>
                  <span className="text-white text-sm font-semibold flex-1">
                    {choice}
                  </span>
                  {isCorrect && <span className="text-green-300">✅</span>}
                  {iMine && !isCorrect && (
                    <span className="text-red-300 text-sm">← toi</span>
                  )}
                  {iMine && isCorrect && (
                    <span className="text-green-300 text-sm">← toi ✅</span>
                  )}
                </div>
                {voters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    {voters.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1 text-sm"
                      >
                        <span title={p.pseudo}>
                          {AVATAR_EMOJI[p.avatar as Avatar] || p.avatar}
                        </span>
                        {reveal.timeTaken?.[p.id] !== undefined && (
                          <span className="text-indigo-400 text-xs">
                            {reveal.timeTaken[p.id].toFixed(1)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {config?.powersEnabled && (
        <PowerRevealPanel
          attackPower={attackPower}
          defensePower={defensePower}
          attackUsed={attackUsed}
          defenseUsed={defenseUsed}
          players={players}
          playerId={playerId}
          onUseAttack={onUseAttack}
          onUseDefense={onUseDefense}
        />
      )}
      <p className="text-indigo-300 text-sm animate-pulse pb-2">
        En attente de la suite…
      </p>
    </div>
  );
}

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
  const myTeamId = roundEnd.scores.find((p: any) => p.id === playerId)?.teamId;
  const myTeam = myTeamId && TEAM_META[myTeamId as keyof typeof TEAM_META];
  const myBonus = roundEnd.perfectBonuses?.[playerId] ?? 0;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto animate-fadeIn">
      {amElim ? (
        <>
          <div className="text-7xl animate-popIn">💀</div>
          <h1 className="text-3xl font-extrabold text-red-400 animate-slideDown">
            Éliminé !
          </h1>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-extrabold text-white animate-slideDown">
            📊 Fin de la manche {roundEnd.round}
          </h2>
          {roundEnd.eliminatedPseudo && (
            <div className="bg-red-500/20 border border-red-400 rounded-xl px-4 py-2 text-center animate-scaleIn">
              <p className="text-red-300 text-sm">Éliminé</p>
              <p className="text-white font-bold">
                💀 {roundEnd.eliminatedPseudo}
              </p>
            </div>
          )}
          {myBonus > 0 && (
            <div className="bg-yellow-400/20 border border-yellow-400 rounded-xl px-5 py-3 text-center animate-popIn">
              <p className="text-yellow-300 font-bold">⭐ Manche parfaite !</p>
              <p className="text-yellow-400 font-extrabold text-xl">
                +{myBonus} pts bonus
              </p>
            </div>
          )}
          <div className="bg-indigo-800 rounded-2xl px-8 py-3 flex flex-col items-center gap-1 animate-popIn delay-100">
            <p className="text-indigo-400 text-xs">{pseudo}</p>
            <p className="text-3xl font-extrabold text-yellow-400">
              {myScore.toLocaleString()} pts
            </p>
          </div>
          {myTeam && teams?.[myTeamId] && (
            <div
              className={`px-4 py-2 rounded-xl text-sm font-bold ${myTeam.light} border ${myTeam.border} ${myTeam.text}`}
            >
              {myTeam.emoji} {teams[myTeamId].name} —{" "}
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
  const MEDALS2: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const isTeams = config?.mode === "teams";
  const myTeamId = finished.scores.find((p: any) => p.id === playerId)?.teamId;
  const myTeam = myTeamId && TEAM_META[myTeamId as keyof typeof TEAM_META];

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-4 p-6 overflow-y-auto animate-fadeIn">
      <div className="text-6xl animate-popIn">
        {MEDALS2[myRank] ?? AVATAR_EMOJI[avatar]}
      </div>
      <h1 className="text-3xl font-extrabold text-white animate-slideDown">
        Partie terminée !
      </h1>
      {isTeams && myTeam && finished.winnerTeamId && (
        <div
          className={`px-5 py-2 rounded-xl text-sm font-bold ${myTeam.light} border ${myTeam.border} ${myTeam.text} animate-scaleIn`}
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
      <div className="w-full max-w-sm overflow-y-auto max-h-52">
        <Scoreboard players={sorted} currentPlayerId={playerId} />
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
