import type { Card, Suit } from "@fish/shared";

export const SUIT_GLYPH: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

/** Short label for a card face, e.g. "A\u2660" or "Joker". */
export function cardFace(card: Card): { text: string; red: boolean } {
  if (card.kind === "joker") {
    return { text: "Joker", red: card.color === "red" };
  }
  return { text: `${card.rank}${SUIT_GLYPH[card.suit]}`, red: isRedSuit(card.suit) };
}

/** Tailwind accent classes: green = your team, red = their team. */
const TEAM_COLORS = {
  mine: { ring: "ring-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500", dot: "bg-emerald-400" },
  theirs: { ring: "ring-rose-400", text: "text-rose-300", bg: "bg-rose-500", dot: "bg-rose-400" },
} as const;

type TeamColors = { ring: string; text: string; bg: string; dot: string };

/**
 * Returns accent classes for a player/team relative to the local player.
 * Same team → green; opposing team → red.
 */
export function teamStyle(team: number | null, myTeam: number | null): TeamColors {
  if (team === null || myTeam === null) return TEAM_COLORS.mine;
  return team === myTeam ? TEAM_COLORS.mine : TEAM_COLORS.theirs;
}

/** Label a team relative to the user. */
export function teamLabel(team: number | null, myTeam: number | null): string {
  if (team === null || myTeam === null) return "Unknown";
  return team === myTeam ? "Your team" : "Their team";
}

/**
 * Position the 6 seats evenly on an ellipse with the local player at the bottom.
 * `index` is the seat offset from the local player (0 = me).
 * Returns CSS percentage coordinates for absolute placement.
 */
export function seatPosition(index: number, total: number): { left: string; top: string } {
  // 90deg = bottom of the circle (screen y grows downward).
  const angle = (Math.PI / 2) + (index / total) * Math.PI * 2;
  const rx = 32;
  const ry = 30;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  return { left: `${left}%`, top: `${top}%` };
}
