import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import type {
  Card,
  GameLogEntry,
  HalfSuitId,
  PublicGameState,
} from "@fish/shared";
import { halfSuitLabel } from "@fish/shared";
import { useGameStore } from "../store.js";
import { emitWithAck } from "../socket.js";
import { cardFace, seatPosition } from "../lib/ui.js";
import { Seat } from "./Seat.js";
import { PlayerChip } from "./PlayerChip.js";
import { OwnHand } from "./OwnHand.js";
import { CenterClaims } from "./CenterClaims.js";
import { StatusBar } from "./StatusBar.js";
import { ActionOverlay } from "./ActionOverlay.js";
import { GameOverOverlay } from "./GameOverOverlay.js";

interface TableProps {
  state: PublicGameState;
  hand: Card[];
  myId: string;
  roomId: string;
  connected: boolean;
}

/** The in-game table: 6 players in a circle, claims in the center, my hand below. */
export function Table({ state, hand, myId, roomId, connected }: TableProps) {
  const log = useGameStore((s) => s.log);
  const pendingAction = useGameStore((s) => s.pendingAction);
  const setHandOrder = useGameStore((s) => s.setHandOrder);
  const [mode, setMode] = useState<null | "ask" | "call">(null);

  const me = state.players.find((p) => p.id === myId) ?? null;
  const myTeam = me?.team ?? null;
  const myTurn = state.currentTurn === myId && state.phase === "playing";
  const busy = pendingAction !== null;
  const scores = [0, 0];
  for (const team of Object.values(state.claims)) scores[team] += 1;
  const lastEvent = log[0]
    ? describeEvent(
        log[0],
        (id) => state.players.find((p) => p.id === id)?.name ?? "Someone",
      )
    : null;

  // Rotate seat order so the local player sits at the bottom (index 0),
  // preserving the alternating-by-team order around the circle.
  const order = state.players;
  const myIndex = Math.max(
    0,
    order.findIndex((p) => p.id === myId),
  );
  const rotated = [...order.slice(myIndex), ...order.slice(0, myIndex)];
  const others = rotated.slice(1);

  async function pickTarget(targetId: string) {
    setMode(null);
    await emitWithAck("game:ask:begin", { roomId, targetId });
  }

  async function pickHalfSuit(halfSuit: HalfSuitId) {
    setMode(null);
    await emitWithAck("game:call:begin", { roomId, halfSuit });
  }

  return (
    <LayoutGroup>
      <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
        <StatusBar state={state} myId={myId} connected={connected} />

        {/* Running history: only the most recent turn is visible. */}
        <div className="flex justify-center py-1.5">
          <span className="rounded-full bg-slate-950/70 px-3 py-1 text-slate-400 mt-5">
            {lastEvent ?? "Game on — make your move."}
          </span>
        </div>

        <div
          className="flex flex-1 items-end overflow-hidden"
          style={{ perspective: "900px" }}
        >
          <div
            className="relative h-[82%] w-full rounded-t-xl rounded-b-none bg-emerald-950/40 border border-emerald-900/30 shadow-inner"
            style={{
              transform: "perspective(900px) rotateX(5deg)",
              transformOrigin: "bottom center",
            }}
          >
            {others.map((p, i) => {
              const pos = seatPosition(i + 1, 6);
              const isOpponent = p.team !== myTeam;
              const askable =
                mode === "ask" &&
                isOpponent &&
                (state.handCounts[p.id] ?? 0) > 0;
              const dimmed = mode === "ask" && !isOpponent;
              return (
                <div
                  key={p.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.left, top: pos.top }}
                >
                  <Seat
                    player={p}
                    count={state.handCounts[p.id] ?? 0}
                    isTurn={state.currentTurn === p.id}
                    myTeam={myTeam}
                    selectable={askable}
                    dimmed={dimmed}
                    onSelect={askable ? () => pickTarget(p.id) : undefined}
                  />
                </div>
              );
            })}

            <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
              <div className="flex gap-3">
                <span className="text-emerald-300">
                  You · {scores[myTeam ?? 0]}
                </span>
                <span className="text-rose-300">
                  Them · {scores[1 - (myTeam ?? 0)]}
                </span>
              </div>
              <CenterClaims
                state={state}
                myTeam={myTeam}
                selectable={mode === "call"}
                onSelect={mode === "call" ? pickHalfSuit : undefined}
              />
            </div>

            {/* Local player's name chip at the bottom of the table */}
            {me && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <PlayerChip
                  player={me}
                  myTeam={myTeam}
                  isTurn={myTurn}
                  isMe
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/80 pb-3">
          <div className="mb-2 mt-2 flex items-center justify-center gap-2">
            <AnimatePresence mode="wait">
              {mode ? (
                <motion.button
                  key="cancel"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setMode(null)}
                  className="rounded bg-slate-700 px-4 py-1.5 text-sm"
                >
                  Cancel
                </motion.button>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-2"
                >
                  <button
                    onClick={() => setMode("ask")}
                    disabled={!myTurn || busy}
                    className="rounded bg-emerald-600 px-4 py-1.5 text-sm disabled:opacity-40"
                  >
                    Ask
                  </button>
                  <button
                    onClick={() => setMode("call")}
                    disabled={state.phase !== "playing" || busy}
                    className="rounded bg-amber-600 px-4 py-1.5 text-sm disabled:opacity-40"
                  >
                    Call
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {hand.length > 0 ? (
            <OwnHand cards={hand} onReorder={setHandOrder} />
          ) : (
            <p className="text-center text-sm text-slate-500">
              You have no cards.
            </p>
          )}
        </div>

        {pendingAction && (
          <ActionOverlay
            action={pendingAction}
            state={state}
            hand={hand}
            myId={myId}
            roomId={roomId}
          />
        )}

        {state.phase === "finished" && !pendingAction && (
          <GameOverOverlay state={state} myId={myId} />
        )}
      </div>
    </LayoutGroup>
  );
}

/** One-line summary of the most recent ask/call for the running history. */
function describeEvent(
  entry: GameLogEntry,
  nameOf: (id: string) => string,
): string {
  if (entry.kind === "ask") {
    const { text } = cardFace(entry.card);
    return entry.success
      ? `${nameOf(entry.askerId)} took ${text} from ${nameOf(entry.targetId)}.`
      : `${nameOf(entry.targetId)} had no ${text} for ${nameOf(entry.askerId)}.`;
  }
  return entry.success
    ? `${nameOf(entry.callerId)} claimed ${halfSuitLabel(entry.halfSuit)}.`
    : `${nameOf(entry.callerId)} miscalled ${halfSuitLabel(entry.halfSuit)}.`;
}
