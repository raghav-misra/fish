import { useMemo, useState } from "react";
import type { CardPlacement, HalfSuitId, PublicGameState } from "@fish/shared";
import {
  HALF_SUIT_IDS,
  cardId,
  halfSuitLabel,
  halfSuitMembers,
} from "@fish/shared";
import { emitWithAck } from "../socket.js";
import { cardFace } from "../lib/ui.js";
import { Backdrop } from "./AskModal.js";

interface CallModalProps {
  state: PublicGameState;
  myTeam: number | null;
  roomId: string;
  onClose: () => void;
}

/** Claim a half suit by mapping each of its 6 cards to a teammate. */
export function CallModal({ state, myTeam, roomId, onClose }: CallModalProps) {
  const [halfSuit, setHalfSuit] = useState<HalfSuitId | null>(null);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const teammates = state.players.filter((p) => p.team === myTeam);
  const open = HALF_SUIT_IDS.filter((id) => state.claims[id] === undefined);
  const members = useMemo(
    () => (halfSuit ? halfSuitMembers(halfSuit) : []),
    [halfSuit],
  );

  const allAssigned = members.length > 0 && members.every((c) => assign[cardId(c)]);

  async function submit() {
    if (!halfSuit || !allAssigned) return;
    const placement: CardPlacement[] = members.map((card) => ({
      card,
      playerId: assign[cardId(card)],
    }));
    setBusy(true);
    setErr(null);
    try {
      await emitWithAck("game:call", { roomId, halfSuit, placement });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">Call a half suit</h2>
      <p className="mb-3 text-xs text-slate-500">
        Assign all 6 cards to your team. Any mistake hands it to the opponents.
      </p>

      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Half suit</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {open.map((id) => (
          <button
            key={id}
            onClick={() => {
              setHalfSuit(id);
              setAssign({});
            }}
            className={`rounded px-2.5 py-1 text-xs ring-2 ${
              halfSuit === id ? "ring-amber-400 bg-amber-400/10" : "ring-slate-700"
            }`}
          >
            {halfSuitLabel(id)}
          </button>
        ))}
      </div>

      {halfSuit && (
        <div className="mb-4 space-y-1.5">
          {members.map((card) => {
            const { text, red } = cardFace(card);
            return (
              <div key={cardId(card)} className="flex items-center gap-2">
                <span
                  className={`flex h-9 w-8 items-center justify-center rounded bg-white text-sm font-semibold ${
                    red ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {text}
                </span>
                <div className="flex flex-wrap gap-1">
                  {teammates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setAssign((a) => ({ ...a, [cardId(card)]: p.id }))
                      }
                      className={`rounded px-2 py-0.5 text-xs ring-1 ${
                        assign[cardId(card)] === p.id
                          ? "bg-emerald-500/20 ring-emerald-400"
                          : "ring-slate-700 text-slate-300"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {err && <p className="mb-2 text-sm text-rose-400">{err}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-400">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!allAssigned || busy}
          className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Call
        </button>
      </div>
    </Backdrop>
  );
}
