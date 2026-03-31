/**
 * BluffScreens.tsx — les 3 phases du mode Bluff (style Fibbage)
 *
 * 1. BluffInputScreen  – le joueur tape une fausse réponse
 * 2. BluffVoteScreen   – le joueur vote pour une option
 * 3. BluffRevealScreen – révélation avec auteurs et points
 */
import { useState, useEffect, useRef } from "react";
import { useTimer } from "../hooks/useTimer";
import { AVATAR_EMOJI, THEME_LABELS } from "../types";
import {
  vibrate,
  playTickBeep,
  playCorrectSound,
  playWrongSound,
} from "../lib/sound";
import type {
  BluffInputPayload,
  BluffVotePayload,
  BluffRevealPayload,
} from "../socket-events";
import type { Avatar } from "../types";

// ─── Shared countdown bar ─────────────────────────────────────
function TimerBar({
  startedAt,
  timeLimit,
}: {
  startedAt: number;
  timeLimit: number;
}) {
  const left = useTimer(startedAt, timeLimit);
  const pct = Math.max(0, (left / timeLimit) * 100);
  const col =
    pct > 50 ? "bg-green-400" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 bg-indigo-800 rounded-full h-3 overflow-hidden">
        <div
          className={`${col} h-3 rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`font-bold tabular-nums text-sm w-8 text-right ${left <= 5 ? "text-red-400 animate-timerPulse" : "text-white"}`}
      >
        {left}s
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. BLUFF INPUT — joueur tape une fausse réponse
// ═══════════════════════════════════════════════════════════════
interface BluffInputProps {
  payload: BluffInputPayload;
  playerId: string;
  submitCount: number;
  submitTotal: number;
  onSubmit: (text: string) => void;
  countdown: number;
}

export function BluffInputScreen({
  payload,
  playerId,
  submitCount,
  submitTotal,
  onSubmit,
  countdown,
}: BluffInputProps) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sent) inputRef.current?.focus();
  }, [sent]);

  function handleSubmit() {
    const val = text.trim();
    if (!val || sent) return;
    onSubmit(val);
    setSent(true);
    vibrate([60, 30, 60]);
  }

  const themeLabel = THEME_LABELS[payload.theme] ?? payload.theme;

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-4 gap-4 animate-fadeIn">
      {/* Header */}
      <div className="w-full max-w-sm pt-2">
        <div className="flex justify-between items-center mb-2 text-sm text-indigo-300">
          <span>
            🎭 Bluff · M{payload.round}/{payload.totalRounds}
          </span>
          <span>{themeLabel}</span>
        </div>
        {countdown > 0 ? (
          <div className="flex items-center justify-center h-10">
            <span className="text-yellow-300 font-bold text-lg animate-pulse">
              ⏳ {countdown}…
            </span>
          </div>
        ) : (
          <TimerBar
            startedAt={payload.startedAt}
            timeLimit={payload.timeLimit}
          />
        )}
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-4">
        <div className="bg-indigo-800 rounded-2xl px-5 py-4 text-center w-full">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-2">
            🎭 Invente une fausse réponse convaincante !
          </p>
          {payload.imageUrl && (
            <img
              src={payload.imageUrl}
              alt=""
              className="rounded-xl max-h-32 object-contain mx-auto mb-3"
            />
          )}
          <p className="text-white text-xl font-bold leading-snug">
            {payload.text}
          </p>
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-xl px-4 py-2 text-xs text-yellow-300 text-center w-full">
          💡 Les autres joueurs voteront pour la bonne ou ta fausse réponse.
          <br />
          Si quelqu'un vote pour toi → <strong>+300 pts</strong>
        </div>
      </div>

      {/* Input */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {sent ? (
          <div className="bg-green-500/20 border border-green-400 rounded-2xl px-5 py-4 text-center animate-scaleIn">
            <p className="text-green-300 font-bold text-lg">
              ✅ Réponse envoyée !
            </p>
            <p className="text-indigo-300 text-sm mt-1">
              {submitCount}/{submitTotal} joueur{submitCount > 1 ? "s" : ""} ont
              répondu
            </p>
            <p className="text-indigo-400 text-xs mt-1 animate-pulse">
              En attente des autres…
            </p>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              maxLength={80}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ta fausse réponse…"
              className="bg-indigo-800 text-white text-center text-lg font-semibold rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-yellow-400 placeholder-indigo-500 w-full"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="bg-yellow-400 active:bg-yellow-300 disabled:opacity-40 text-indigo-900 font-extrabold text-lg px-8 py-4 rounded-2xl shadow-lg transition active:scale-95 w-full"
            >
              Valider ma réponse
            </button>
            <p className="text-indigo-500 text-xs text-center">
              {submitCount}/{submitTotal} joueur{submitCount > 1 ? "s" : ""} ont
              déjà répondu
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. BLUFF VOTE — joueur vote pour une option
// ═══════════════════════════════════════════════════════════════
interface BluffVoteProps {
  payload: BluffVotePayload;
  question: string;
  playerId: string;
  votedCount: number;
  totalPlayers: number;
  onVote: (letter: string) => void;
  mySubmittedText?: string; // to grey-out my own fake answer
}

const VOTE_COLORS = [
  "bg-red-500 active:bg-red-600",
  "bg-blue-500 active:bg-blue-600",
  "bg-green-500 active:bg-green-600",
  "bg-yellow-500 active:bg-yellow-600",
  "bg-purple-500 active:bg-purple-600",
  "bg-orange-500 active:bg-orange-600",
  "bg-pink-500 active:bg-pink-600",
  "bg-teal-500 active:bg-teal-600",
];
const VOTE_COLORS_DIM = [
  "bg-red-900/50",
  "bg-blue-900/50",
  "bg-green-900/50",
  "bg-yellow-900/50",
  "bg-purple-900/50",
  "bg-orange-900/50",
  "bg-pink-900/50",
  "bg-teal-900/50",
];

export function BluffVoteScreen({
  payload,
  question,
  playerId,
  votedCount,
  totalPlayers,
  onVote,
  mySubmittedText,
}: BluffVoteProps) {
  const [voted, setVoted] = useState<string | null>(null);

  function handleVote(letter: string) {
    if (voted) return;
    setVoted(letter);
    onVote(letter);
    vibrate([40, 20, 40]);
  }

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center p-4 gap-3 overflow-y-auto animate-fadeIn">
      {/* Header */}
      <div className="w-full max-w-sm pt-2">
        <div className="flex justify-between text-indigo-300 text-sm mb-2">
          <span>🗳️ Vote</span>
          <span>
            {votedCount}/{totalPlayers} ont voté
          </span>
        </div>
        <TimerBar startedAt={payload.startedAt} timeLimit={payload.timeLimit} />
      </div>

      {/* Question */}
      <div className="bg-indigo-800 rounded-2xl px-5 py-3 text-center w-full max-w-sm">
        <p className="text-white font-bold text-lg leading-snug">{question}</p>
      </div>

      <div className="bg-indigo-700/50 rounded-xl px-4 py-2 text-xs text-indigo-300 text-center w-full max-w-sm">
        Trouve la <strong className="text-yellow-300">vraie réponse</strong>{" "}
        parmi les propositions.
        <br />
        Ne vote pas pour ta propre réponse !
      </div>

      {voted && (
        <div className="bg-green-500/20 border border-green-400 rounded-xl px-4 py-2 text-green-300 text-sm font-bold text-center w-full max-w-sm animate-scaleIn">
          ✅ Vote envoyé pour <strong>{voted}</strong> · En attente des autres…
        </div>
      )}

      {/* Options */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {payload.options.map((opt, i) => {
          const isMyFake =
            mySubmittedText?.toLowerCase() === opt.text.toLowerCase();
          const isDisabled = !!voted || isMyFake;
          return (
            <button
              key={opt.letter}
              disabled={isDisabled}
              onClick={() => handleVote(opt.letter)}
              className={`
                w-full text-left flex items-start gap-3 px-4 py-4 rounded-2xl font-semibold transition-all
                ${voted === opt.letter ? "ring-4 ring-white " : ""}
                ${
                  isMyFake
                    ? "bg-indigo-800/40 opacity-50 cursor-not-allowed"
                    : voted
                      ? VOTE_COLORS_DIM[i % VOTE_COLORS_DIM.length] +
                        " opacity-60"
                      : VOTE_COLORS[i % VOTE_COLORS.length] +
                        " active:scale-[0.98]"
                }
              `}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="text-2xl font-extrabold text-white/90 w-8 shrink-0 mt-0.5">
                {opt.letter}
              </span>
              <span className="text-white text-base leading-snug flex-1">
                {opt.text}
              </span>
              {isMyFake && (
                <span className="text-xs text-indigo-400 mt-1 shrink-0">
                  (ta réponse)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. BLUFF REVEAL — résultats avec auteurs et points
// ═══════════════════════════════════════════════════════════════
interface BluffRevealProps {
  payload: BluffRevealPayload;
  playerId: string;
  pseudo: string;
  avatar: Avatar;
}

export function BluffRevealScreen({
  payload,
  playerId,
  pseudo,
  avatar,
}: BluffRevealProps) {
  const myVote = payload.votes[playerId];
  const myPoints = payload.pointsEarned[playerId] ?? 0;
  const myOption = myVote
    ? payload.options.find((o) => o.letter === myVote)
    : null;
  const votedReal = myOption?.isReal ?? false;
  const myScore = payload.scores.find((p) => p.id === playerId)?.score ?? 0;

  // Play sound on mount
  useEffect(() => {
    if (myPoints > 0) setTimeout(playCorrectSound, 300);
    else setTimeout(playWrongSound, 300);
  }, []);

  // Count votes per option
  const voteCounts: Record<string, string[]> = {};
  for (const [pid, letter] of Object.entries(payload.votes)) {
    if (!voteCounts[letter]) voteCounts[letter] = [];
    voteCounts[letter].push(pid);
  }

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center p-4 gap-3 overflow-y-auto animate-fadeIn">
      {/* My result */}
      <div
        className={`w-full max-w-sm rounded-2xl px-5 py-4 flex items-center gap-3 mt-2 animate-scaleIn ${
          votedReal
            ? "bg-green-500/20 border border-green-400"
            : myPoints > 0
              ? "bg-purple-500/20 border border-purple-400"
              : "bg-red-500/20 border border-red-400"
        }`}
      >
        <span className="text-4xl">{AVATAR_EMOJI[avatar]}</span>
        <div className="flex-1">
          <p className="text-white font-bold">{pseudo}</p>
          {myVote ? (
            <p
              className={`text-sm font-semibold ${votedReal ? "text-green-300" : myPoints > 0 ? "text-purple-300" : "text-red-300"}`}
            >
              {votedReal
                ? "✅ Bonne réponse trouvée !"
                : myPoints > 0
                  ? "🎭 Ta blague a trompé des gens !"
                  : "❌ Pas trouvé"}
            </p>
          ) : (
            <p className="text-indigo-400 text-sm">⏰ N'a pas voté</p>
          )}
        </div>
        {myPoints > 0 && (
          <span className="text-green-400 font-extrabold text-xl animate-scorePop">
            +{myPoints}
          </span>
        )}
      </div>

      {/* Question + correct answer */}
      <div className="bg-indigo-800 rounded-2xl px-5 py-3 w-full max-w-sm text-center">
        <p className="text-indigo-300 text-xs mb-1">{payload.question}</p>
        <p className="text-yellow-400 font-extrabold text-lg">
          ✅ {payload.correctAnswer}
        </p>
      </div>

      {/* All options with author reveals */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {payload.options.map((opt, i) => {
          const votes = voteCounts[opt.letter] ?? [];
          const authorPseudo = opt.authorId
            ? payload.authorPseudos[opt.authorId]
            : null;
          const iMineVote = myVote === opt.letter;
          return (
            <div
              key={opt.letter}
              className={`rounded-2xl px-4 py-3 w-full animate-slideUp ${
                opt.isReal
                  ? "bg-green-500/20 border-2 border-green-400"
                  : "bg-indigo-800 border border-indigo-700"
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start gap-2 mb-1">
                <span className="font-extrabold text-white/80 text-lg w-7 shrink-0">
                  {opt.letter}
                </span>
                <span className="text-white font-semibold flex-1 leading-snug">
                  {opt.text}
                </span>
                {opt.isReal && (
                  <span className="text-green-300 text-xs font-bold shrink-0">
                    ✅ VRAI
                  </span>
                )}
              </div>

              {/* Author */}
              {!opt.isReal && authorPseudo && (
                <p className="text-purple-300 text-xs ml-9 mb-1">
                  🎭 Inventé par <strong>{authorPseudo}</strong>
                </p>
              )}

              {/* Voters */}
              {votes.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-9">
                  {votes.map((pid) => {
                    const p = payload.scores.find((s) => s.id === pid);
                    if (!p) return null;
                    return (
                      <span
                        key={pid}
                        className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-0.5 text-xs text-white"
                      >
                        {AVATAR_EMOJI[p.avatar as Avatar] || "👤"} {p.pseudo}
                        {opt.isReal && (
                          <span className="text-green-300 font-bold">+800</span>
                        )}
                        {!opt.isReal && opt.authorId && (
                          <span className="text-purple-300 font-bold">
                            → +300
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
              {votes.length === 0 && (
                <p className="text-indigo-600 text-xs ml-9">
                  Personne n'a voté ici
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Scores */}
      <div className="w-full max-w-sm bg-indigo-800 rounded-2xl p-3 mb-2">
        <p className="text-indigo-300 text-xs uppercase tracking-widest mb-2 text-center">
          Classement
        </p>
        {[...payload.scores]
          .filter((p) => !p.isEliminated)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 py-1.5 ${p.id === playerId ? "text-yellow-300" : "text-white"}`}
            >
              <span className="text-sm w-6 text-center">
                {["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`}
              </span>
              <span className="text-lg">
                {AVATAR_EMOJI[p.avatar as Avatar] || "👤"}
              </span>
              <span className="flex-1 font-semibold text-sm truncate">
                {p.pseudo}
              </span>
              <span className="font-bold">{p.score.toLocaleString()}</span>
            </div>
          ))}
      </div>

      <p className="text-indigo-300 text-sm animate-pulse pb-2">
        En attente de la suite…
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOST VIEW: Bluff input phase
// ═══════════════════════════════════════════════════════════════
interface HostBluffInputProps {
  payload: BluffInputPayload;
  submitCount: number;
  submitTotal: number;
  onSkip: () => void;
  countdown: number;
}

export function HostBluffInputView({
  payload,
  submitCount,
  submitTotal,
  onSkip,
  countdown,
}: HostBluffInputProps) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-5 gap-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between text-indigo-300 text-sm mb-2">
          <span>🎭 Phase Bluff — Saisie des réponses</span>
          <span>
            M{payload.round}/{payload.totalRounds}
          </span>
        </div>
        <TimerBar startedAt={payload.startedAt} timeLimit={payload.timeLimit} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full max-w-3xl">
        {countdown > 0 && (
          <div className="text-center">
            <p className="text-indigo-300 text-sm mb-2">
              Manche {payload.round} — Préparez-vous !
            </p>
            <span
              className="text-8xl font-extrabold text-white animate-popIn"
              key={countdown}
            >
              {countdown}
            </span>
          </div>
        )}
        <div className="bg-indigo-800 rounded-2xl px-8 py-6 text-center w-full">
          <p className="text-indigo-300 text-sm mb-3">🎭 Question Bluff</p>
          {payload.imageUrl && (
            <img
              src={payload.imageUrl}
              alt=""
              className="rounded-xl max-h-40 object-contain mx-auto mb-3"
            />
          )}
          <p className="text-white text-2xl font-bold">{payload.text}</p>
        </div>

        <div className="flex items-center gap-4 bg-indigo-800 rounded-2xl px-8 py-4">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-white">{submitCount}</p>
            <p className="text-indigo-400 text-sm">ont répondu</p>
          </div>
          <div className="text-indigo-600 text-3xl">/</div>
          <div className="text-center">
            <p className="text-4xl font-extrabold text-indigo-300">
              {submitTotal}
            </p>
            <p className="text-indigo-400 text-sm">joueurs</p>
          </div>
        </div>
      </div>

      <button
        onClick={onSkip}
        className="bg-white text-indigo-900 font-bold px-8 py-3 rounded-xl"
      >
        ⏭ Passer au vote ({submitCount}/{submitTotal})
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOST VIEW: Bluff voting phase
// ═══════════════════════════════════════════════════════════════
interface HostBluffVoteProps {
  payload: BluffVotePayload;
  question: string;
  votedCount: number;
  totalPlayers: number;
  onSkip: () => void;
}

export function HostBluffVoteView({
  payload,
  question,
  votedCount,
  totalPlayers,
  onSkip,
}: HostBluffVoteProps) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-between p-5 gap-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between text-indigo-300 text-sm mb-2">
          <span>🗳️ Phase Bluff — Vote</span>
          <span>
            {votedCount}/{totalPlayers} ont voté
          </span>
        </div>
        <TimerBar startedAt={payload.startedAt} timeLimit={payload.timeLimit} />
      </div>

      <p className="text-white text-xl font-bold text-center max-w-xl">
        {question}
      </p>

      <div className="grid grid-cols-2 gap-2 w-full max-w-3xl">
        {payload.options.map((opt, i) => (
          <div
            key={opt.letter}
            className={`${VOTE_COLORS_DIM[i % VOTE_COLORS_DIM.length]} rounded-2xl px-4 py-3 flex items-center gap-3`}
          >
            <span className="text-2xl font-extrabold text-white/80 w-8">
              {opt.letter}
            </span>
            <span className="text-white font-semibold text-sm flex-1">
              {opt.text}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="bg-white text-indigo-900 font-bold px-8 py-3 rounded-xl"
      >
        ⏭ Révéler ({votedCount}/{totalPlayers})
      </button>
    </div>
  );
}
