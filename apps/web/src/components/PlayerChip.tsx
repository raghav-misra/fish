import type { Player } from "@fish/shared";
import { teamStyle } from "../lib/ui.js";

interface PlayerChipProps {
  player: Pick<Player, "name" | "connected" | "isHost" | "team">;
  myTeam: number | null;
  isTurn?: boolean;
  isMe?: boolean;
  selectable?: boolean;
  className?: string;
}

/** Unified name pill used for both remote seats and the local player. */
export function PlayerChip({
  player,
  myTeam,
  isTurn = false,
  isMe = false,
  selectable = false,
  className = "",
}: PlayerChipProps) {
  const team = teamStyle(player.team, myTeam);

  const ringClass = isTurn
    ? "ring-amber-400 bg-amber-400/10"
    : `${team.ring} bg-zinc-800/80`;

  const turnPulse = isTurn && isMe ? "animate-turn-pulse" : "";
  const selectClass = selectable
    ? "ring-emerald-400 scale-110 shadow-lg shadow-emerald-500/20 animate-select-pulse"
    : "";

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1 ring-2 transition-all duration-200 ${ringClass} ${selectClass} ${turnPulse} ${className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${player.connected ? team.dot : "bg-zinc-600"}`}
      />
      <span className="text-zinc-100">
        {player.name}
        {isMe && " (you)"}
      </span>
      {player.isHost && <span title="host">👑</span>}
    </div>
  );
}
