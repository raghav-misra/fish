import { useState } from "react";
import type { PublicGameState } from "@fish/shared";
import { emitWithAck } from "../socket.js";
import { teamStyle } from "../lib/ui.js";
import { Backdrop } from "./Backdrop.js";
import { GameButton } from "./GameButton.js";

interface AskModalProps {
  state: PublicGameState;
  myTeam: number | null;
  roomId: string;
  onClose: () => void;
}

/** Step 1 of an ask: choose which opponent to ask. The card is chosen later,
 *  in the shared overlay, so the whole room watches the suspense. */
export function AskModal({ state, myTeam, roomId, onClose }: AskModalProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const opponents = state.players.filter(
    (p) => p.team !== myTeam && (state.handCounts[p.id] ?? 0) > 0,
  );

  async function pick(targetId: string) {
    setBusy(true);
    setErr(null);
    try {
      await emitWithAck("game:ask:begin", { roomId, targetId });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Backdrop onClose={onClose} width="max-w-md">
      <h2 className="mb-1 text-lg font-semibold">Ask an opponent</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Pick who to ask — you'll choose the card next.
      </p>
      <div className="flex flex-wrap gap-2">
        {opponents.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => pick(p.id)}
            className={`rounded-full px-4 py-2 text-sm ring-2 disabled:opacity-50 ${teamStyle(p.team, myTeam).ring}`}
          >
            {p.name} · {state.handCounts[p.id]}
          </button>
        ))}
        {opponents.length === 0 && (
          <span className="text-sm text-zinc-500">No opponents have cards.</span>
        )}
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
      <div className="mt-4 flex justify-end">
        <GameButton variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </GameButton>
      </div>
    </Backdrop>
  );
}
