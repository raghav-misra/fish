import { useState } from "react";
import { LayoutGroup } from "framer-motion";
import type { Card, PublicGameState } from "@fish/shared";
import { useGameStore } from "../store.js";
import { seatPosition, teamStyle } from "../lib/ui.js";
import { Seat } from "./Seat.js";
import { OwnHand } from "./OwnHand.js";
import { CenterClaims } from "./CenterClaims.js";
import { StatusBar } from "./StatusBar.js";
import { ActivityLog } from "./ActivityLog.js";
import { AskModal } from "./AskModal.js";
import { CallModal } from "./CallModal.js";

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
  const setHandOrder = useGameStore((s) => s.setHandOrder);
  const [modal, setModal] = useState<null | "ask" | "call">(null);

  const me = state.players.find((p) => p.id === myId) ?? null;
  const myTeam = me?.team ?? null;
  const myTurn = state.currentTurn === myId && state.phase === "playing";

  // Rotate seat order so the local player sits at the bottom (index 0),
  // preserving the alternating-by-team order around the circle.
  const order = state.players;
  const myIndex = Math.max(0, order.findIndex((p) => p.id === myId));
  const rotated = [...order.slice(myIndex), ...order.slice(0, myIndex)];
  const others = rotated.slice(1);

  return (
    <LayoutGroup>
      <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
        <StatusBar state={state} myId={myId} connected={connected} />

        <div className="flex flex-1 overflow-hidden">
          {/* Table */}
          <div className="relative flex-1">
            {/* Opponent / teammate seats around the circle */}
            {others.map((p, i) => {
              const pos = seatPosition(i + 1, 6);
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
                  />
                </div>
              );
            })}

            {/* Center: claimed half suits */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <CenterClaims state={state} />
            </div>

            {/* My label */}
            {me && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-2 ${
                    myTurn ? "ring-amber-400 bg-amber-400/10" : teamStyle(myTeam).ring
                  }`}
                >
                  {me.name} (you) · Team {(myTeam ?? 0) + 1}
                </span>
              </div>
            )}
          </div>

          {/* Activity log */}
          <aside className="w-64 border-l border-slate-800 bg-slate-950/60 p-3">
            <ActivityLog log={log} players={state.players} />
          </aside>
        </div>

        {/* My hand + actions */}
        <div className="border-t border-slate-800 bg-slate-950/80 py-3">
          <div className="mb-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setModal("ask")}
              disabled={!myTurn}
              className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Ask
            </button>
            <button
              onClick={() => setModal("call")}
              disabled={state.phase !== "playing"}
              className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Call
            </button>
          </div>
          {hand.length > 0 ? (
            <OwnHand cards={hand} onReorder={setHandOrder} />
          ) : (
            <p className="text-center text-sm text-slate-500">You have no cards.</p>
          )}
        </div>

        {modal === "ask" && (
          <AskModal
            state={state}
            hand={hand}
            myTeam={myTeam}
            roomId={roomId}
            onClose={() => setModal(null)}
          />
        )}
        {modal === "call" && (
          <CallModal
            state={state}
            myTeam={myTeam}
            roomId={roomId}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </LayoutGroup>
  );
}
