import { z } from "zod";

export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

/** Fish uses two jokers; they must be distinguishable so they can be asked for. */
export const JOKER_COLORS = ["red", "black"] as const;

export const SuitSchema = z.enum(SUITS);
export const RankSchema = z.enum(RANKS);
export const JokerColorSchema = z.enum(JOKER_COLORS);

/** A standard suited card. */
export const StandardCardSchema = z.object({
  kind: z.literal("standard"),
  suit: SuitSchema,
  rank: RankSchema,
});

/** One of the two jokers. */
export const JokerCardSchema = z.object({
  kind: z.literal("joker"),
  color: JokerColorSchema,
});

/** A card is either a standard suited card or a joker. */
export const CardSchema = z.discriminatedUnion("kind", [
  StandardCardSchema,
  JokerCardSchema,
]);

export type Suit = z.infer<typeof SuitSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type JokerColor = z.infer<typeof JokerColorSchema>;
export type StandardCard = z.infer<typeof StandardCardSchema>;
export type JokerCard = z.infer<typeof JokerCardSchema>;
export type Card = z.infer<typeof CardSchema>;

export function cardId(card: Card): string {
  return card.kind === "joker"
    ? `joker-${card.color}`
    : `${card.rank}-${card.suit}`;
}

/** A fresh 54-card deck: 52 standard cards + 2 jokers. */
export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ kind: "standard", suit, rank });
    }
  }
  for (const color of JOKER_COLORS) {
    deck.push({ kind: "joker", color });
  }
  return deck;
}
