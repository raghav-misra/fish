import type { HalfSuitId, PublicGameState } from "@fish/shared";
import { HALF_SUIT_IDS, halfSuitLabel } from "@fish/shared";

interface CenterClaimsProps {
  state: PublicGameState;
  myTeam: number | null;
  selectable?: boolean;
  onSelect?: (id: HalfSuitId) => void;
}

/** Center of the table: every half suit and which team has claimed it. */
export function CenterClaims({ state, myTeam, selectable, onSelect }: CenterClaimsProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-900/70 p-3 backdrop-blur">
      {HALF_SUIT_IDS.map((id) => {
        const team = state.claims[id];
        const claimed = team !== undefined;
        const isMine = team === myTeam;
        const canSelect = selectable && !claimed;
        const color = claimed
          ? isMine
            ? "bg-emerald-500/80 text-white"
            : "bg-rose-500/80 text-white"
          : canSelect
            ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400 cursor-pointer hover:bg-amber-500/30 transition-all duration-200 scale-105"
            : "bg-slate-800/60 text-slate-500 transition-all duration-200";
        return (
          <div
            key={id}
            onClick={canSelect ? () => onSelect?.(id) : undefined}
            className={`flex h-10 w-24 items-center justify-center rounded-md text-center text-[11px] font-medium leading-tight ${color}`}
          >
            {claimed ? (
              <span>
                {halfSuitLabel(id)}
                <br />
                <span className="opacity-80">{isMine ? "Yours" : "Theirs"}</span>
              </span>
            ) : (
              halfSuitLabel(id)
            )}
          </div>
        );
      })}
    </div>
  );
}
