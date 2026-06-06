import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  Card,
  PendingAction,
  PendingAsk,
  PendingCall,
  PublicGameState,
} from "@fish/shared";
import {
  cardId,
  cardsEqual,
  halfSuitLabel,
  halfSuitMembers,
  halfSuitOf,
} from "@fish/shared";
import { socket, emitWithAck } from "../socket.js";
import { cardFace, teamLabel, teamStyle } from "../lib/ui.js";

interface OverlayProps {
  action: PendingAction;
  state: PublicGameState;
  hand: Card[];
  myId: string;
  roomId: string;
}

/** Full-screen, suspenseful narration of the current ask/call, shown on every
 *  player's screen and driven entirely by the server's pending action. */
export function ActionOverlay({ action, state, hand, myId, roomId }: OverlayProps) {
  const myTeam = state.players.find((p) => p.id === myId)?.team ?? null;
  const nameOf = (id: string) =>
    state.players.find((p) => p.id === id)?.name ?? "Someone";

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      >
        <motion.div
          key={action.kind}
          initial={{ scale: 0.9, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 p-8 text-center shadow-2xl"
        >
          {action.kind === "ask" ? (
            <AskView
              action={action}
              state={state}
              hand={hand}
              myId={myId}
              myTeam={myTeam}
              roomId={roomId}
              nameOf={nameOf}
            />
          ) : (
            <CallView
              key={`${action.callerId}-${action.halfSuit}`}
              action={action}
              state={state}
              myId={myId}
              myTeam={myTeam}
              roomId={roomId}
              nameOf={nameOf}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------------------------------- Ask ---------------------------------- */

function AskView({
  action,
  state,
  hand,
  myId,
  myTeam,
  roomId,
  nameOf,
}: {
  action: PendingAsk;
  state: PublicGameState;
  hand: Card[];
  myId: string;
  myTeam: number | null;
  roomId: string;
  nameOf: (id: string) => string;
}) {
  const asker = nameOf(action.askerId);
  const target = nameOf(action.targetId);
  const iAmAsker = action.askerId === myId;

  // Legal cards: members of half suits I hold (still in play) that I lack.
  const askable = useMemo(() => {
    const mine = new Set(hand.map(halfSuitOf));
    const out: Card[] = [];
    for (const hs of mine) {
      if (state.claims[hs] !== undefined) continue;
      for (const member of halfSuitMembers(hs)) {
        if (!hand.some((c) => cardsEqual(c, member))) out.push(member);
      }
    }
    return out;
  }, [hand, state.claims]);

  const [busy, setBusy] = useState(false);

  async function commit(card: Card) {
    setBusy(true);
    try {
      await emitWithAck("game:ask:commit", { roomId, card });
    } catch {
      setBusy(false);
    }
  }

  if (action.result !== "pending" && action.card) {
    const success = action.result === "success";
    const { text, red } = cardFace(action.card);
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <CardChip text={text} red={red} big />
        <h2
          className={`mt-5 text-3xl font-bold ${success ? "text-emerald-400" : "text-rose-400"}`}
        >
          {success ? "They got it!" : "Miss!"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {success
            ? `${target} handed it over to ${asker}.`
            : `${target} didn't have it. Turn passes.`}
        </p>
      </motion.div>
    );
  }

  // Card chosen, awaiting reveal: suspense.
  if (action.card) {
    const { text, red } = cardFace(action.card);
    return (
      <div>
        <p className="text-sm text-slate-400">
          {asker} asks {target}
        </p>
        <p className="mb-4 text-lg">Do you have…</p>
        <motion.div
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="inline-block"
        >
          <CardChip text={text} red={red} big />
        </motion.div>
        <p className="mt-4 text-xs text-slate-500">Waiting…</p>
      </div>
    );
  }

  // No card yet: asker is choosing.
  if (iAmAsker) {
    return (
      <div>
        <p className="mb-1 text-sm text-slate-400">You're asking</p>
        <h2 className={`mb-4 text-2xl font-bold ${teamStyle(state.players.find((p) => p.id === action.targetId)?.team ?? null, myTeam).text}`}>
          {target}
        </h2>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          Pick the card
        </p>
        <div className="mx-auto grid max-h-56 max-w-md grid-cols-6 gap-1 overflow-y-auto">
          {askable.map((c) => {
            const { text, red } = cardFace(c);
            return (
              <button
                key={cardId(c)}
                disabled={busy}
                onClick={() => commit(c)}
                className={`flex h-12 items-center justify-center rounded bg-white text-sm font-semibold disabled:opacity-50 ${
                  red ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => socket.emit("game:action:cancel", { roomId })}
          className="mt-4 text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Spectator: asker still choosing.
  return (
    <div>
      <h2 className="text-2xl font-bold">
        <span className={teamStyle(state.players.find((p) => p.id === action.askerId)?.team ?? null, myTeam).text}>{asker}</span>{" "}
        is asking{" "}
        <span className={teamStyle(state.players.find((p) => p.id === action.targetId)?.team ?? null, myTeam).text}>{target}</span>
        …
      </h2>
      <ThinkingDots />
    </div>
  );
}

/* --------------------------------- Call ---------------------------------- */

function CallView({
  action,
  state,
  myId,
  myTeam,
  roomId,
  nameOf,
}: {
  action: PendingCall;
  state: PublicGameState;
  myId: string;
  myTeam: number | null;
  roomId: string;
  nameOf: (id: string) => string;
}) {
  const caller = nameOf(action.callerId);
  const label = halfSuitLabel(action.halfSuit);
  const iAmCaller = action.callerId === myId;
  const callerTeam = state.players.find((p) => p.id === action.callerId)?.team ?? 0;
  const teammates = state.players.filter((p) => p.team === callerTeam);
  const members = useMemo(() => halfSuitMembers(action.halfSuit), [action.halfSuit]);

  const [assign, setAssign] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (action.result !== "pending") {
    const success = action.result === "success";
    const winningTeam = success ? callerTeam : 1 - callerTeam;
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <h2
          className={`text-3xl font-bold ${success ? "text-emerald-400" : "text-rose-400"}`}
        >
          {success ? "Correct call!" : "Wrong call!"}
        </h2>
        <p className="mt-2 text-lg">
          <span className={teamStyle(winningTeam, myTeam).text}>{teamLabel(winningTeam, myTeam)}</span>{" "}
          claims {label}.
        </p>
      </motion.div>
    );
  }

  // Caller is placing cards.
  if (iAmCaller && !action.committed) {
    function place(card: Card, playerId: string) {
      const next = { ...assign, [cardId(card)]: playerId };
      setAssign(next);
      const placement = members
        .filter((c) => next[cardId(c)])
        .map((c) => ({ card: c, playerId: next[cardId(c)] }));
      socket.emit("game:call:progress", { roomId, placement });
    }

    const allAssigned = members.every((c) => assign[cardId(c)]);

    async function commit() {
      if (!allAssigned) return;
      const placement = members.map((c) => ({ card: c, playerId: assign[cardId(c)] }));
      setBusy(true);
      try {
        await emitWithAck("game:call:commit", { roomId, halfSuit: action.halfSuit, placement });
      } catch {
        setBusy(false);
      }
    }

    return (
      <div className="text-left">
        <h2 className="mb-1 text-center text-xl font-bold">Calling {label}</h2>
        <p className="mb-4 text-center text-xs text-slate-500">
          Assign every card to a teammate. This is irreversible.
        </p>
        <div className="space-y-1.5">
          {members.map((card) => {
            const { text, red } = cardFace(card);
            return (
              <div key={cardId(card)} className="flex items-center gap-2">
                <CardChip text={text} red={red} />
                <div className="flex flex-wrap gap-1">
                  {teammates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => place(card, p.id)}
                      className={`rounded px-2 py-0.5 text-xs ring-1 ${
                        assign[cardId(card)] === p.id
                          ? "bg-emerald-500/20 ring-emerald-400"
                          : "text-slate-300 ring-slate-700"
                      }`}
                    >
                      {p.id === myId ? "Me" : p.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => socket.emit("game:action:cancel", { roomId })}
            className="rounded px-3 py-1.5 text-sm text-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={commit}
            disabled={!allAssigned || busy}
            className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            Lock in call
          </button>
        </div>
      </div>
    );
  }

  // Spectators (and the caller after committing): watch the placement fill in.
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold">
        <span className={teamStyle(callerTeam, myTeam).text}>{caller}</span>{" "}
        {action.committed ? "called" : "would like to call"}
      </h2>
      <p className="mb-4 text-lg">{label}</p>
      <div className="mx-auto max-w-sm space-y-1.5 text-left">
        {members.map((card) => {
          const { text, red } = cardFace(card);
          const placed = action.placement.find((pl) => cardsEqual(pl.card, card));
          return (
            <div key={cardId(card)} className="flex items-center gap-2">
              <CardChip text={text} red={red} />
              <motion.span
                key={placed?.playerId ?? "none"}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-slate-300"
              >
                {placed ? `→ ${nameOf(placed.playerId)}` : "→ …"}
              </motion.span>
            </div>
          );
        })}
      </div>
      {action.committed && <p className="mt-4 text-xs text-slate-500">Locking it in…</p>}
    </div>
  );
}

/* ------------------------------- Primitives ------------------------------ */

function CardChip({ text, red, big }: { text: string; red: boolean; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white font-bold ${
        red ? "text-rose-600" : "text-slate-900"
      } ${big ? "h-24 w-20 text-2xl" : "h-9 w-9 text-sm"}`}
    >
      {text}
    </span>
  );
}

function ThinkingDots() {
  return (
    <div className="mt-4 flex justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-slate-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
