import { useState } from "react";
import type { HalfSuitId, PublicGameState } from "@fish/shared";
import { HALF_SUIT_IDS, halfSuitLabel } from "@fish/shared";
import { emitWithAck } from "../socket.js";
import { Backdrop } from "./Backdrop.js";

interface CallModalProps {
  state: PublicGameState;
  roomId: string;
  onClose: () => void;
}

/** Step 1 of a call: confirm intent and pick which half suit to claim. The
 *  per-card placement happens afterwards in the shared overlay so the rest of
 *  the room can watch it fill in live. */
export function CallModal({ state, roomId, onClose }: CallModalProps) {
  const [halfSuit, setHalfSuit] = useState<HalfSuitId | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = HALF_SUIT_IDS.filter((id) => state.claims[id] === undefined);

  async function begin() {
    if (!halfSuit) return;
    setBusy(true);
    setErr(null);
    try {
      await emitWithAck("game:call:begin", { roomId, halfSuit });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Backdrop onClose={onClose} width="max-w-md">
      <h2 className="mb-1 text-lg font-semibold">Are you sure you want to call?</h2>
      <p className="mb-4 text-xs text-slate-500">
        Pick the half suit to claim. You'll place each card next — get one wrong
        and it goes to the other team.
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {open.map((id) => (
          <button
            key={id}
            onClick={() => setHalfSuit(id)}
            className={`rounded px-2.5 py-1 text-xs ring-2 ${
              halfSuit === id ? "ring-amber-400 bg-amber-400/10" : "ring-slate-700"
            }`}
          >
            {halfSuitLabel(id)}
          </button>
        ))}
      </div>

      {err && <p className="mb-2 text-sm text-rose-400">{err}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-400">
          Cancel
        </button>
        <button
          onClick={begin}
          disabled={!halfSuit || busy}
          className="rounded bg-amber-600 px-4 py-1.5 text-sm disabled:opacity-40"
        >
          Call {halfSuit ? halfSuitLabel(halfSuit) : ""}
        </button>
      </div>
    </Backdrop>
  );
}
