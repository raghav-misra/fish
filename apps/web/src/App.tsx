import { useEffect, useState } from "react";
import { useGameStore } from "./store.js";
import { emitWithAck } from "./socket.js";
import type { RoomJoined } from "@fish/shared";

export default function App() {
  const { connected, roomId, playerId, state, hand, error } = useGameStore();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Restore a previous session after a refresh / reconnect.
  useEffect(() => {
    const saved = sessionStorage.getItem("fish-session");
    if (saved) {
      const { roomId, playerId } = JSON.parse(saved) as RoomJoined;
      emitWithAck<RoomJoined>("room:resume", { roomId, playerId })
        .then((res) => useGameStore.getState().setSession(res.roomId, res.playerId))
        .catch(() => sessionStorage.removeItem("fish-session"));
    }
  }, []);

  function persist(res: RoomJoined) {
    sessionStorage.setItem("fish-session", JSON.stringify(res));
    useGameStore.getState().setSession(res.roomId, res.playerId);
  }

  async function createRoom() {
    const res = await emitWithAck<RoomJoined>("room:create", { playerName: name });
    persist(res);
  }

  async function joinRoom() {
    const res = await emitWithAck<RoomJoined>("room:join", {
      roomId: joinCode.toUpperCase(),
      playerName: name,
    });
    persist(res);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Game area */}
      <main className="flex-1 p-8">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">🐟 Fish</h1>
          <span
            className={`text-sm px-2 py-1 rounded ${
              connected ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {connected ? "online" : "offline"}
          </span>
        </header>

        {error && (
          <div className="mb-4 rounded bg-rose-800/60 px-4 py-2 text-sm">{error}</div>
        )}

        {!roomId ? (
          <div className="max-w-sm space-y-4">
            <input
              className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="w-full rounded bg-indigo-600 px-3 py-2 font-medium disabled:opacity-40"
              disabled={!name}
              onClick={createRoom}
            >
              Create room
            </button>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded bg-slate-800 px-3 py-2 uppercase outline-none"
                placeholder="Room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button
                className="rounded bg-slate-700 px-3 py-2 font-medium disabled:opacity-40"
                disabled={!name || !joinCode}
                onClick={joinRoom}
              >
                Join
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Room <span className="font-mono text-slate-100">{roomId}</span> · you are{" "}
              <span className="font-mono text-slate-100">{playerId?.slice(0, 6)}</span>
            </p>
            <div>
              <h2 className="font-semibold mb-2">Players</h2>
              <ul className="space-y-1">
                {state?.players.map((p) => (
                  <li key={p.id} className="text-sm">
                    {p.name} {p.isHost && "👑"}{" "}
                    {!p.connected && <span className="text-rose-400">(offline)</span>}
                  </li>
                ))}
              </ul>
            </div>
            {state?.phase === "lobby" && (
              <button
                className="rounded bg-emerald-600 px-4 py-2 font-medium"
                onClick={() => roomId && emitStart(roomId)}
              >
                Start game
              </button>
            )}
            <div>
              <h2 className="font-semibold mb-2">Your hand ({hand?.cards.length ?? 0})</h2>
              <div className="flex flex-wrap gap-1">
                {hand?.cards.map((c) => (
                  <span
                    key={`${c.rank}-${c.suit}`}
                    className="rounded bg-white text-slate-900 px-2 py-3 text-sm font-medium"
                  >
                    {c.rank} {c.suit[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Video/voice side panel — wired to LiveKit/Daily later. */}
      <aside className="w-72 bg-slate-950 border-l border-slate-800 p-4">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Video chat</h2>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-video rounded bg-slate-800 flex items-center justify-center text-xs text-slate-500"
            >
              camera {i + 1}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

import { socket } from "./socket.js";
function emitStart(roomId: string) {
  socket.emit("game:start", { roomId });
}
