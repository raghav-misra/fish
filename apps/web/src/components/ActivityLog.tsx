import type { GameLogEntry, Player } from "@fish/shared";
import { cardFace } from "../lib/ui.js";
import { halfSuitLabel } from "@fish/shared";

interface ActivityLogProps {
  log: GameLogEntry[];
  players: Player[];
}

/** Compact, most-recent-first feed of asks and calls. */
export function ActivityLog({ log, players }: ActivityLogProps) {
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Activity
      </h2>
      <ul className="flex-1 space-y-1 overflow-y-auto text-xs">
        {log.length === 0 && <li className="text-slate-600">No moves yet.</li>}
        {log.map((entry, i) => (
          <li key={i} className="rounded bg-slate-800/60 px-2 py-1 leading-snug">
            {entry.kind === "ask" ? (
              <span>
                <b>{name(entry.askerId)}</b> asked <b>{name(entry.targetId)}</b> for{" "}
                <span className={cardFace(entry.card).red ? "text-rose-400" : "text-slate-200"}>
                  {cardFace(entry.card).text}
                </span>{" "}
                {entry.success ? (
                  <span className="text-emerald-400">✓ got it</span>
                ) : (
                  <span className="text-slate-500">✗ miss</span>
                )}
              </span>
            ) : (
              <span>
                <b>{name(entry.callerId)}</b> called{" "}
                <b>{halfSuitLabel(entry.halfSuit)}</b>{" "}
                {entry.success ? (
                  <span className="text-emerald-400">✓</span>
                ) : (
                  <span className="text-rose-400">✗</span>
                )}{" "}
                <span className="text-slate-500">→ Team {entry.team + 1}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
