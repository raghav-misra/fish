import { z } from "zod";
import { CardSchema } from "./cards.js";

export const RoomPhaseSchema = z.enum(["lobby", "playing", "finished"]);
export type RoomPhase = z.infer<typeof RoomPhaseSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  team: z.number().int().nullable(),
  connected: z.boolean(),
  isHost: z.boolean(),
});
export type Player = z.infer<typeof PlayerSchema>;


export const PublicGameStateSchema = z.object({
  phase: RoomPhaseSchema,
  players: z.array(PlayerSchema),
  currentTurn: z.string().nullable(),
  handCounts: z.record(z.string(), z.number().int()),
});
export type PublicGameState = z.infer<typeof PublicGameStateSchema>;

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
