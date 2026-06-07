import type { Room, CallRecord } from "../rooms.js";
import type { Card, HalfSuitId, PendingAction, Player, GameSummary } from "@fish/shared";
import { redis } from "./redis.js";

const ROOM_PREFIX = "room:";

// ─── Serialization ──────────────────────────────────────────────────────────

interface RoomJSON {
  id: string;
  phase: Room["phase"];
  players: [string, Player][];
  hands: [string, Card[]][];
  currentTurn: string | null;
  claims: [HalfSuitId, number][];
  winner: number | null;
  pendingAction: PendingAction | null;
  calls: CallRecord[];
  hoard: [string, number][];
  summary: GameSummary | null;
  createdAt: number;
}

function serialize(room: Room): string {
  const data: RoomJSON = {
    id: room.id,
    phase: room.phase,
    players: [...room.players.entries()],
    hands: [...room.hands.entries()],
    currentTurn: room.currentTurn,
    claims: [...room.claims.entries()],
    winner: room.winner,
    pendingAction: room.pendingAction,
    calls: room.calls,
    hoard: [...room.hoard.entries()],
    summary: room.summary,
    createdAt: room.createdAt,
  };
  return JSON.stringify(data);
}

function deserialize(json: string): Room {
  const data: RoomJSON = JSON.parse(json);
  return {
    id: data.id,
    phase: data.phase,
    players: new Map(data.players),
    hands: new Map(data.hands),
    currentTurn: data.currentTurn,
    claims: new Map(data.claims),
    winner: data.winner,
    pendingAction: data.pendingAction,
    calls: data.calls,
    hoard: new Map(data.hoard),
    summary: data.summary,
    createdAt: data.createdAt,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Persist a room's full state to Redis. */
export async function saveRoom(room: Room): Promise<void> {
  await redis.set(ROOM_PREFIX + room.id, serialize(room));
}

/** Load a single room by ID. Returns null if not found. */
export async function loadRoom(roomId: string): Promise<Room | null> {
  const raw = await redis.get(ROOM_PREFIX + roomId);
  if (!raw) return null;
  return deserialize(raw);
}

/** Load all persisted rooms (for startup recovery). */
export async function loadAllRooms(): Promise<Room[]> {
  const keys = await redis.keys(ROOM_PREFIX + "*");
  if (keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return values
    .filter((v): v is string => v !== null)
    .map(deserialize);
}

/** Delete a room from Redis. */
export async function deleteRoom(roomId: string): Promise<void> {
  await redis.del(ROOM_PREFIX + roomId);
}

/** Connect to Redis. Call at startup. */
export async function connectStorage(): Promise<void> {
  await redis.connect();
}
