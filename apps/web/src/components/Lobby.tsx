import { useState } from "react";
import type { PublicGameState, RoomJoined } from "@fish/shared";
import { emitWithAck } from "../socket.js";
import { socket } from "../socket.js";
import { teamStyle } from "../lib/ui.js";

interface LobbyProps {
  roomId: string | null;
  myId: string | null;
  state: PublicGameState | null;
  onJoined: (res: RoomJoined) => void;
}

/** Pre-game: create/join a room, then wait for 6 players and start. */
export function Lobby({ roomId, myId, state, onJoined }: LobbyProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<RoomJoined>) {
    setErr(null);
    try {
      onJoined(await fn());
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="w-80 space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6">
          <h1 className="text-center text-2xl tracking-tight">🐟 Fish</h1>
          <input
            className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="w-full rounded bg-indigo-600 px-3 py-2 disabled:opacity-40"
            disabled={!name}
            onClick={() => run(() => emitWithAck("room:create", { playerName: name }))}
          >
            Create room
          </button>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded bg-slate-800 px-3 py-2 uppercase outline-none"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="rounded bg-slate-700 px-3 py-2 disabled:opacity-40"
              disabled={!name || !code}
              onClick={() =>
                run(() =>
                  emitWithAck("room:join", {
                    roomId: code.toUpperCase(),
                    playerName: name,
                  }),
                )
              }
            >
              Join
            </button>
          </div>
          {err && <p className="text-sm text-rose-400">{err}</p>}
        </div>
      </div>
    );
  }

  const players = state?.players ?? [];
  const me = players.find((p) => p.id === myId);
  const mySlotTeam = me ? players.indexOf(me) % 2 : 0;
  const canStart = me?.isHost && players.length === 6;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-96 space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Room code</p>
          <p className="font-mono text-2xl tracking-widest">{roomId}</p>
        </div>
        <ul className="space-y-1">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${teamStyle(i % 2, mySlotTeam).dot}`} />
              {p.name} {p.isHost && "♛"} {p.id === myId && <span className="text-slate-500">(you)</span>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
            <li key={`e${i}`} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-700" />
              waiting…
            </li>
          ))}
        </ul>
        <p className="text-center text-xs text-slate-500">{players.length} / 6 players</p>
        {me?.isHost ? (
          <button
            className="w-full rounded bg-emerald-600 px-3 py-2 disabled:opacity-40"
            disabled={!canStart}
            onClick={() => socket.emit("game:start", { roomId })}
          >
            {canStart ? "Start game" : "Need 6 players"}
          </button>
        ) : (
          <p className="text-center text-sm text-slate-400">Waiting for host to start…</p>
        )}
      </div>
    </div>
  );
}
