import { nanoid } from "nanoid";
import {
  type Card,
  type HalfSuitId,
  type Player,
  type PublicGameState,
  type RoomSummary,
} from "@fish/shared";

/** Server-side room record. Holds both public state and private hands. */
export interface Room {
  id: string;
  phase: PublicGameState["phase"];
  players: Map<string, Player>;
  /** Private hands, keyed by player id. Never broadcast wholesale. */
  hands: Map<string, Card[]>;
  currentTurn: string | null;
  /** Half suits claimed so far, mapped to the team (0 | 1) that won them. */
  claims: Map<HalfSuitId, number>;
  /** Winning team once finished, else null. */
  winner: number | null;
  createdAt: number;
}

/**
 * In-memory room store. Backed by a single Node process for now;
 * swap for Redis + the Socket.IO Redis adapter to scale horizontally.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();

  private newRoomId(): string {
    let id: string;
    do {
      id = nanoid(6).toUpperCase();
    } while (this.rooms.has(id));
    return id;
  }

  createRoom(host: { playerName: string }): { room: Room; player: Player } {
    const room: Room = {
      id: this.newRoomId(),
      phase: "lobby",
      players: new Map(),
      hands: new Map(),
      currentTurn: null,
      claims: new Map(),
      winner: null,
      createdAt: Date.now(),
    };
    const player = this.addPlayer(room, host.playerName, true);
    this.rooms.set(room.id, room);
    return { room, player };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addPlayer(room: Room, name: string, isHost = false): Player {
    const player: Player = {
      id: nanoid(),
      name,
      team: null,
      connected: true,
      isHost,
    };
    room.players.set(player.id, player);
    room.hands.set(player.id, []);
    return player;
  }

  removePlayer(room: Room, playerId: string): void {
    room.players.delete(playerId);
    room.hands.delete(playerId);
    if (room.players.size === 0) {
      this.rooms.delete(room.id);
    }
  }

  /** Marks a player disconnected without removing them (allows resume). */
  setConnected(room: Room, playerId: string, connected: boolean): void {
    const player = room.players.get(playerId);
    if (player) player.connected = connected;
  }

  /** Public state safe to broadcast to everyone in the room. */
  toPublicState(room: Room): PublicGameState {
    const handCounts: Record<string, number> = {};
    for (const [pid, cards] of room.hands) handCounts[pid] = cards.length;
    const claims: Record<string, number> = {};
    for (const [hs, team] of room.claims) claims[hs] = team;
    return {
      phase: room.phase,
      players: [...room.players.values()],
      currentTurn: room.currentTurn,
      handCounts,
      claims,
      winner: room.winner,
    };
  }

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()].map((r) => ({
      roomId: r.id,
      playerCount: r.players.size,
      phase: r.phase,
    }));
  }
}
