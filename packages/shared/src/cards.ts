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

export const SuitSchema = z.enum(SUITS);
export const RankSchema = z.enum(RANKS);

export const CardSchema = z.object({
  suit: SuitSchema,
  rank: RankSchema,
});

export type Suit = z.infer<typeof SuitSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type Card = z.infer<typeof CardSchema>;

export function cardId(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}
