import { z } from "zod";
import { CardSchema } from "./cards.js";

/** Lifecycle of a room/match. */
export const RoomPhaseSchema = z.enum(["lobby", "playing", "finished"]);
export type RoomPhase = z.infer<typeof RoomPhaseSchema>;

/** A connected participant. */
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  /** Team assignment is game-specific; null until assigned. */
  team: z.number().int().nullable(),
  connected: z.boolean(),
  isHost: z.boolean(),
});
export type Player = z.infer<typeof PlayerSchema>;

/**
 * Public game state broadcast to everyone in the room.
 * Hands are intentionally NOT here (each player gets their own private hand).
 * The detailed Fish rules/state will be filled in once we define them.
 */
export const PublicGameStateSchema = z.object({
  phase: RoomPhaseSchema,
  players: z.array(PlayerSchema),
  /** Id of the player whose turn it is, if any. */
  currentTurn: z.string().nullable(),
  /** Number of cards each player is holding, keyed by player id. */
  handCounts: z.record(z.string(), z.number().int()),
});
export type PublicGameState = z.infer<typeof PublicGameStateSchema>;

/** Private state delivered only to the owning player. */
export const PrivateHandSchema = z.object({
  cards: z.array(CardSchema),
});
export type PrivateHand = z.infer<typeof PrivateHandSchema>;

export const RoomSummarySchema = z.object({
  roomId: z.string(),
  playerCount: z.number().int(),
  phase: RoomPhaseSchema,
});
export type RoomSummary = z.infer<typeof RoomSummarySchema>;
