import type { PublicGameState } from "@fish/shared";

interface StatusBarProps {
  state: PublicGameState;
  myId: string | null;
  connected: boolean;
}

/** Top bar: turn indicator, team scores, connection state. */
export function StatusBar({ state, myId, connected }: StatusBarProps) {
  const turnPlayer = state.players.find((p) => p.id === state.currentTurn);
  const myTurn = state.currentTurn === myId;
  const scores = [0, 0];
  for (const team of Object.values(state.claims)) scores[team] += 1;

  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2 text-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-bold tracking-tight">🐟 Fish</span>
        <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-300">
          Team 1 · {scores[0]}
        </span>
        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-rose-300">
          Team 2 · {scores[1]}
        </span>
      </div>

      <div className="font-medium">
        {state.phase === "finished" ? (
          <span className="text-amber-300">
            🏆 Team {(state.winner ?? 0) + 1} wins!
          </span>
        ) : myTurn ? (
          <span className="text-amber-300">Your turn</span>
        ) : (
          <span className="text-slate-300">
            {turnPlayer ? `${turnPlayer.name}'s turn` : "—"}
          </span>
        )}
      </div>

      <span className={`text-xs ${connected ? "text-emerald-400" : "text-rose-400"}`}>
        {connected ? "online" : "reconnecting…"}
      </span>
    </div>
  );
}
