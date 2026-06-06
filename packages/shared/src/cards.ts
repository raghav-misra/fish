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

export const StandardCardSchema = z.object({
  kind: z.literal("standard"),
  suit: SuitSchema,
  rank: RankSchema,
});

export const JokerCardSchema = z.object({
  kind: z.literal("joker"),
  color: JokerColorSchema,
});

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

/**
 * Parse a card id string (the inverse of {@link cardId}) into a Card.
 * Accepts `joker-red` / `joker-black` or `<rank>-<suit>` (e.g. `A-spades`,
 * `10-hearts`). Returns null for anything that isn't a real card.
 */
export function parseCard(id: string): Card | null {
  const dash = id.indexOf("-");
  if (dash < 0) return null;
  const head = id.slice(0, dash);
  const tail = id.slice(dash + 1);
  if (head === "joker") {
    return tail === "red" || tail === "black"
      ? { kind: "joker", color: tail }
      : null;
  }
  if (!(RANKS as readonly string[]).includes(head)) return null;
  if (!(SUITS as readonly string[]).includes(tail)) return null;
  return { kind: "standard", rank: head as Rank, suit: tail as Suit };
}

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
