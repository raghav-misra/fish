import { AnimatePresence, motion } from "framer-motion";
import type { Player } from "@fish/shared";
import { teamStyle } from "../lib/ui.js";

interface SeatProps {
  player: Player;
  count: number;
  isTurn: boolean;
  myTeam: number | null;
  selectable?: boolean;
  dimmed?: boolean;
  onSelect?: () => void;
}

/** A non-local player around the table: name above, card fan with count badge. */
export function Seat({ player, count, isTurn, myTeam, selectable, dimmed, onSelect }: SeatProps) {
  const team = teamStyle(player.team, myTeam);
  const fan = Math.min(count, 9);

  return (
    <motion.div
      layout
      className={`flex flex-col items-center transition-all duration-200 ${selectable ? "cursor-pointer scale-110" : ""} ${dimmed ? "opacity-40 scale-75" : ""}`}
      onClick={selectable ? onSelect : undefined}
      whileHover={selectable ? { scale: 1.05 } : undefined}
    >
      {/* Name label */}
      <div
        className={`mb-3 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-2 transition-all duration-200 ${
          isTurn ? "ring-amber-400 bg-amber-400/10" : `${team.ring} bg-slate-800/80`
        } ${selectable ? "ring-emerald-400 scale-110 shadow-lg shadow-emerald-500/20 animate-select-pulse" : ""}`}
      >
        <span className={`h-2 w-2 rounded-full ${player.connected ? team.dot : "bg-slate-600"}`} />
        <span className="text-slate-100">{player.name}</span>
        {player.isHost && <span title="host">♛</span>}
      </div>

      {/* Card fan with count badge overlaid */}
      <div className="relative">
        <div className="flex">
          {Array.from({ length: fan }).map((_, i) => (
            <div
              key={i}
              className="-ml-3 first:ml-0 h-10 w-7 rounded bg-linear-to-br from-indigo-600 to-indigo-800 border border-indigo-400/40 shadow flex items-center justify-center text-[10px]"
            >🐟</div>
          ))}
          {fan === 0 && <span className="text-xs text-slate-500 italic">empty</span>}
        </div>
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-100 ring-1 ring-slate-600">
            {count}
          </span>
        )}
      </div>
    </motion.div>
  );
}
