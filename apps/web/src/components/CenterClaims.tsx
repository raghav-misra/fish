import type { PublicGameState } from "@fish/shared";
import { HALF_SUIT_IDS, halfSuitLabel } from "@fish/shared";

/** Center of the table: every half suit and which team has claimed it. */
export function CenterClaims({ state }: { state: PublicGameState }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-900/70 p-3 backdrop-blur">
      {HALF_SUIT_IDS.map((id) => {
        const team = state.claims[id];
        const claimed = team !== undefined;
        const color =
          team === 0
            ? "bg-sky-500/80 text-white"
            : team === 1
              ? "bg-rose-500/80 text-white"
              : "bg-slate-800/60 text-slate-500";
        return (
          <div
            key={id}
            className={`flex h-10 w-24 items-center justify-center rounded-md text-center text-[11px] font-medium leading-tight ${color}`}
          >
            {claimed ? (
              <span>
                {halfSuitLabel(id)}
                <br />
                <span className="opacity-80">Team {team! + 1}</span>
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
