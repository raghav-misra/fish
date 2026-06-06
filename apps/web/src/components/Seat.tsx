import { motion } from "framer-motion";
import type { Player } from "@fish/shared";
import { teamStyle } from "../lib/ui.js";

interface SeatProps {
  player: Player;
  count: number;
  isTurn: boolean;
  /** Highlight as a selectable ask target. */
  selectable?: boolean;
  onSelect?: () => void;
}

/** A non-local player around the table: name, card count, and a face-down fan. */
export function Seat({ player, count, isTurn, selectable, onSelect }: SeatProps) {
  const team = teamStyle(player.team);
  const fan = Math.min(count, 9);

  return (
    <motion.div
      layout
      className={`flex flex-col items-center gap-1 ${selectable ? "cursor-pointer" : ""}`}
      onClick={selectable ? onSelect : undefined}
      whileHover={selectable ? { scale: 1.05 } : undefined}
    >
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-2 ${
          isTurn ? "ring-amber-400 bg-amber-400/10" : `${team.ring} bg-slate-800/80`
        } ${selectable ? "ring-emerald-400" : ""}`}
      >
        <span className={`h-2 w-2 rounded-full ${player.connected ? team.dot : "bg-slate-600"}`} />
        <span className="text-slate-100">{player.name}</span>
        {player.isHost && <span title="host">♛</span>}
        <span className="text-slate-400">{count}</span>
      </div>
      <div className="flex">
        {Array.from({ length: fan }).map((_, i) => (
          <div
            key={i}
            className="-ml-3 first:ml-0 h-10 w-7 rounded bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-400/40 shadow"
          />
        ))}
        {fan === 0 && <span className="text-xs text-slate-500 italic">empty</span>}
      </div>
    </motion.div>
  );
}
