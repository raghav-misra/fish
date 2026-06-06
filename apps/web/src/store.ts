import { create } from "zustand";
import type {
  Card,
  GameLogEntry,
  PendingAction,
  PublicGameState,
  PrivateHand,
} from "@fish/shared";
import { socket, connectWithKey } from "./socket.js";

interface GameStore {
  connected: boolean;
  roomId: string | null;
  playerId: string | null;
  state: PublicGameState | null;
  hand: PrivateHand | null;
  /** Most-recent-first activity feed. */
  log: GameLogEntry[];
  /** The live ask/call being narrated to the room, or null when idle. */
  pendingAction: PendingAction | null;
  error: string | null;

  setSession: (roomId: string, playerId: string) => void;
  setHandOrder: (cards: Card[]) => void;
  clearError: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  roomId: null,
  playerId: null,
  state: null,
  hand: null,
  log: [],
  pendingAction: null,
  error: null,

  setSession: (roomId, playerId) => set({ roomId, playerId }),
  setHandOrder: (cards) => set({ hand: { cards } }),
  clearError: () => set({ error: null }),
  reset: () =>
    set({ roomId: null, playerId: null, state: null, hand: null, log: [], pendingAction: null }),
}));

/** Wire Socket.IO lifecycle + server events into the store. Call once at startup. */
export function bindSocket() {
  socket.on("connect", () => useGameStore.setState({ connected: true }));
  socket.on("disconnect", () => useGameStore.setState({ connected: false }));
  socket.on("game:state", (state) => useGameStore.setState({ state }));
  socket.on("game:hand", (hand) => useGameStore.setState({ hand }));
  socket.on("game:log", (entry) =>
    useGameStore.setState((s) => ({ log: [entry, ...s.log].slice(0, 50) })),
  );
  socket.on("game:action", (action) =>
    useGameStore.setState({ pendingAction: action }),
  );
  socket.on("server:error", (error) =>
    useGameStore.setState({ error: error.message }),
  );

  // Connect with stored key (or empty if no gate configured).
  const key = sessionStorage.getItem("fish-key") ?? "";
  connectWithKey(key);
}
