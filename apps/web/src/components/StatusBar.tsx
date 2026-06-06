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
  const me = state.players.find((p) => p.id === myId);
  const myTeam = me?.team ?? 0;

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 text-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="tracking-tight">🐟 Fish</span>
      </div>

      <div className="font-medium">
        {state.phase === "finished" ? (
          <span className="text-amber-300">
            🏆{" "}
            {state.winner === myTeam ? "Your team wins!" : "Their team wins!"}
          </span>
        ) : myTurn ? (
          <span className="text-amber-300">Your turn</span>
        ) : (
          <span className="text-zinc-300">
            {turnPlayer ? `${turnPlayer.name}'s turn` : "—"}
          </span>
        )}
      </div>

      <span className={connected ? "text-emerald-400" : "text-rose-400"}>
        {connected ? "online" : "reconnecting…"}
      </span>
    </div>
  );
}
