import { create } from "zustand";
import type { PublicGameState, PrivateHand } from "@fish/shared";
import { socket } from "./socket.js";

interface GameStore {
  connected: boolean;
  roomId: string | null;
  playerId: string | null;
  state: PublicGameState | null;
  hand: PrivateHand | null;
  error: string | null;

  setSession: (roomId: string, playerId: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  roomId: null,
  playerId: null,
  state: null,
  hand: null,
  error: null,

  setSession: (roomId, playerId) => set({ roomId, playerId }),
  reset: () => set({ roomId: null, playerId: null, state: null, hand: null }),
}));

/** Wire Socket.IO lifecycle + server events into the store. Call once at startup. */
export function bindSocket() {
  socket.on("connect", () => useGameStore.setState({ connected: true }));
  socket.on("disconnect", () => useGameStore.setState({ connected: false }));
  socket.on("game:state", (state) => useGameStore.setState({ state }));
  socket.on("game:hand", (hand) => useGameStore.setState({ hand }));
  socket.on("server:error", (error) =>
    useGameStore.setState({ error: error.message }),
  );
  socket.connect();
}
