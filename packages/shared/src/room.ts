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


/** A superlative handed out on the end screen: a player plus the tally behind it. */
export const AwardSchema = z.object({
  playerId: z.string(),
  value: z.number().int(),
});
export type Award = z.infer<typeof AwardSchema>;

/** End-of-game superlatives. Each award is null when nobody clearly earns it. */
export const GameSummarySchema = z.object({
  bestCaller: AwardSchema.nullable(),
  saboteur: AwardSchema.nullable(),
  hoarder: AwardSchema.nullable(),
});
export type GameSummary = z.infer<typeof GameSummarySchema>;

export const PublicGameStateSchema = z.object({
  phase: RoomPhaseSchema,
  players: z.array(PlayerSchema),
  currentTurn: z.string().nullable(),
  handCounts: z.record(z.string(), z.number().int()),
  /** Half suits that have been claimed, mapped to the team (0 | 1) that won them. */
  claims: z.record(z.string(), z.number().int()),
  /** Winning team once the game is finished, else null. */
  winner: z.number().int().nullable(),
  /** Superlatives, populated once the game is finished. */
  summary: GameSummarySchema.nullable(),
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
