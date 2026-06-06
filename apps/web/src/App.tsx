import { useEffect } from "react";
import type { RoomJoined } from "@fish/shared";
import { useGameStore } from "./store.js";
import { emitWithAck } from "./socket.js";
import { Lobby } from "./components/Lobby.js";
import { Table } from "./components/Table.js";

export default function App() {
  const { connected, roomId, playerId, state, hand, error } = useGameStore();

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

  // Clear transient errors after a moment.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => useGameStore.getState().clearError(), 3500);
    return () => clearTimeout(t);
  }, [error]);

  function onJoined(res: RoomJoined) {
    sessionStorage.setItem("fish-session", JSON.stringify(res));
    useGameStore.getState().setSession(res.roomId, res.playerId);
  }

  const inGame = state && state.phase !== "lobby" && roomId && playerId;

  return (
    <>
      {inGame ? (
        <Table
          state={state}
          hand={hand?.cards ?? []}
          myId={playerId}
          roomId={roomId}
          connected={connected}
        />
      ) : (
        <Lobby roomId={roomId} myId={playerId} state={state} onJoined={onJoined} />
      )}

      {error && (
        <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-rose-700 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </>
  );
}
