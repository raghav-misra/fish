import { z } from "zod";
import { type Card, type Suit, SUITS } from "./cards.js";

/**
 * Half-suit definitions for Fish.
 *
 * The 54-card deck partitions into 9 half suits of 6 cards each:
 *  - low  of each suit: A,2,3,4,5,6
 *  - high of each suit: 8,9,10,J,Q,K
 *  - the "special" group: the four 7s + both jokers
 * The 7 is deliberately excluded from its suit's low/high halves.
 */

export const LOW_RANKS = ["A", "2", "3", "4", "5", "6"] as const;
export const HIGH_RANKS = ["8", "9", "10", "J", "Q", "K"] as const;

export const HALF_SUIT_IDS = [
  "clubs-low",
  "clubs-high",
  "diamonds-low",
  "diamonds-high",
  "hearts-low",
  "hearts-high",
  "spades-low",
  "spades-high",
  "special",
] as const;

export type HalfSuitId = (typeof HALF_SUIT_IDS)[number];

export const HalfSuitIdSchema = z.enum(
  HALF_SUIT_IDS as unknown as [HalfSuitId, ...HalfSuitId[]],
);

/** Total half suits, and the majority needed to clinch the game. */
export const HALF_SUIT_COUNT = 9;
export const MAJORITY = 5;

/** Which half suit a given card belongs to. */
export function halfSuitOf(card: Card): HalfSuitId {
  if (card.kind === "joker") return "special";
  if (card.rank === "7") return "special";
  const isLow = (LOW_RANKS as readonly string[]).includes(card.rank);
  return `${card.suit}-${isLow ? "low" : "high"}` as HalfSuitId;
}

/** The exact 6 cards that make up a half suit. */
export function halfSuitMembers(id: HalfSuitId): Card[] {
  if (id === "special") {
    return [
      ...SUITS.map((suit): Card => ({ kind: "standard", suit, rank: "7" })),
      { kind: "joker", color: "red" },
      { kind: "joker", color: "black" },
    ];
  }
  const [suit, half] = id.split("-") as [Suit, "low" | "high"];
  const ranks = half === "low" ? LOW_RANKS : HIGH_RANKS;
  return ranks.map((rank): Card => ({ kind: "standard", suit, rank }));
}

/** Human-readable label for UI. */
export function halfSuitLabel(id: HalfSuitId): string {
  if (id === "special") return "7s + Jokers";
  const [suit, half] = id.split("-");
  const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
  return `${half === "low" ? "Low" : "High"} ${suitName}`;
}

/** Structural equality for cards (handles both jokers and standard cards). */
export function cardsEqual(a: Card, b: Card): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "joker" && b.kind === "joker") return a.color === b.color;
  if (a.kind === "standard" && b.kind === "standard") {
    return a.suit === b.suit && a.rank === b.rank;
  }
  return false;
}
