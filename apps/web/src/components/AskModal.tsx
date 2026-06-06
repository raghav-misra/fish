import { useMemo, useState } from "react";
import type { Card, PublicGameState } from "@fish/shared";
import {
  cardId,
  cardsEqual,
  halfSuitMembers,
  halfSuitOf,
} from "@fish/shared";
import { emitWithAck } from "../socket.js";
import { cardFace, teamStyle } from "../lib/ui.js";

interface AskModalProps {
  state: PublicGameState;
  hand: Card[];
  myTeam: number | null;
  roomId: string;
  onClose: () => void;
}

/** Pick an opponent and a legal card to ask for. */
export function AskModal({ state, hand, myTeam, roomId, onClose }: AskModalProps) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Opponents with cards are valid ask targets.
  const opponents = state.players.filter(
    (p) => p.team !== myTeam && (state.handCounts[p.id] ?? 0) > 0,
  );

  // Legal cards: members of half suits I hold (still in play) that I don't have.
  const askable = useMemo(() => {
    const myHalfSuits = new Set(hand.map(halfSuitOf));
    const out: Card[] = [];
    for (const hs of myHalfSuits) {
      if (state.claims[hs] !== undefined) continue;
      for (const member of halfSuitMembers(hs)) {
        if (!hand.some((c) => cardsEqual(c, member))) out.push(member);
      }
    }
    return out;
  }, [hand, state.claims]);

  async function submit() {
    if (!targetId || !card) return;
    setBusy(true);
    setErr(null);
    try {
      await emitWithAck("game:ask", { roomId, targetId, card });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <h2 className="mb-3 text-lg font-semibold">Ask for a card</h2>

      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Opponent</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {opponents.map((p) => (
          <button
            key={p.id}
            onClick={() => setTargetId(p.id)}
            className={`rounded-full px-3 py-1 text-sm ring-2 ${
              targetId === p.id ? "ring-emerald-400 bg-emerald-400/10" : teamStyle(p.team).ring
            }`}
          >
            {p.name} · {state.handCounts[p.id]}
          </button>
        ))}
        {opponents.length === 0 && (
          <span className="text-sm text-slate-500">No opponents have cards.</span>
        )}
      </div>

      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Card</p>
      <div className="mb-4 grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
        {askable.map((c) => {
          const { text, red } = cardFace(c);
          const active = card && cardsEqual(card, c);
          return (
            <button
              key={cardId(c)}
              onClick={() => setCard(c)}
              className={`flex h-12 items-center justify-center rounded bg-white text-sm font-semibold ${
                red ? "text-rose-600" : "text-slate-900"
              } ${active ? "ring-4 ring-amber-400" : ""}`}
            >
              {text}
            </button>
          );
        })}
      </div>

      {err && <p className="mb-2 text-sm text-rose-400">{err}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-400">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!targetId || !card || busy}
          className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </Backdrop>
  );
}

export function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
