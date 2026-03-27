import { AVATAR_EMOJI } from "../types";
import type { PublicPlayer } from "../socket-events";

interface Props {
  players: PublicPlayer[];
  currentPlayerId?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Scoreboard({ players, currentPlayerId }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      {sorted.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
            p.id === currentPlayerId
              ? "bg-yellow-400/20 border border-yellow-400"
              : "bg-indigo-800"
          } ${!p.connected ? "opacity-50" : ""}`}
        >
          <span className="text-2xl w-8 text-center">
            {MEDALS[i] ?? (
              <span className="text-indigo-400 font-bold text-sm">
                #{i + 1}
              </span>
            )}
          </span>
          <span className="text-2xl">{AVATAR_EMOJI[p.avatar]}</span>
          <span className="text-white font-semibold flex-1">{p.pseudo}</span>
          <span className="text-yellow-400 font-bold text-lg">{p.score}</span>
        </div>
      ))}
    </div>
  );
}
