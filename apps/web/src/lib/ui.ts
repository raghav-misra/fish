import type { Card, Suit } from "@fish/shared";

/** Suit glyphs and colors for rendering standard cards. */
export const SUIT_GLYPH: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

/** Short label for a card face, e.g. "A\u2660" or "Joker". */
export function cardFace(card: Card): { text: string; red: boolean } {
  if (card.kind === "joker") {
    return { text: "Joker", red: card.color === "red" };
  }
  return { text: `${card.rank}${SUIT_GLYPH[card.suit]}`, red: isRedSuit(card.suit) };
}

/** Tailwind accent classes per team. */
export const TEAM = {
  0: { ring: "ring-sky-400", text: "text-sky-300", bg: "bg-sky-500", dot: "bg-sky-400" },
  1: { ring: "ring-rose-400", text: "text-rose-300", bg: "bg-rose-500", dot: "bg-rose-400" },
} as const;

export function teamStyle(team: number | null) {
  return team === 0 || team === 1 ? TEAM[team] : TEAM[0];
}

/**
 * Position the 6 seats evenly on an ellipse with the local player at the bottom.
 * `index` is the seat offset from the local player (0 = me).
 * Returns CSS percentage coordinates for absolute placement.
 */
export function seatPosition(index: number, total: number): { left: string; top: string } {
  // 90deg = bottom of the circle (screen y grows downward).
  const angle = (Math.PI / 2) + (index / total) * Math.PI * 2;
  const rx = 42;
  const ry = 38;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  return { left: `${left}%`, top: `${top}%` };
}
