import { Reorder } from "framer-motion";
import type { Card } from "@fish/shared";
import { cardId } from "@fish/shared";
import { cardFace, SUIT_GLYPH } from "../lib/ui.js";

interface OwnHandProps {
  cards: Card[];
  onReorder: (cards: Card[]) => void;
  /** When asking, clicking a card isn't used; selection happens in the modal. */
  onCardClick?: (card: Card) => void;
}

/** The local player's hand: face-up, fanned like a real hand with tilt and overlap. */
export function OwnHand({ cards, onReorder, onCardClick }: OwnHandProps) {
  const count = cards.length;
  // Fan parameters
  const maxSpread = 40; // max total rotation spread in degrees
  const totalAngle = Math.min(maxSpread, count * 5);
  const step = count > 1 ? totalAngle / (count - 1) : 0;
  const startAngle = -totalAngle / 2;

  return (
    <Reorder.Group
      axis="x"
      values={cards}
      onReorder={onReorder}
      className="flex items-end justify-center gap-1 px-4"
    >
      {cards.map((card, i) => { 
        const { red } = cardFace(card);
        const isJoker = card.kind === "joker";
        const rank = isJoker ? "★" : card.rank;
        const suit = isJoker ? (card.color === "red" ? "♦" : "♣") : SUIT_GLYPH[card.suit];
        const color = red ? "text-rose-600" : "text-zinc-900";
        const angle = startAngle + step * i;
        // Vertical offset: cards at edges dip down (arc effect)
        const normalized = count > 1 ? (i - (count - 1) / 2) / ((count - 1) / 2) : 0;
        const translateY = normalized * normalized * 18; // quadratic arc

        return (
          <Reorder.Item
            key={cardId(card)}
            value={card}
            whileDrag={{ scale: 1.15, zIndex: 50, rotate: 0 }}
            whileHover={{ y: -24, zIndex: 40, scale: 1.08 }}
            onClick={() => onCardClick?.(card)}
            className={`relative flex h-28 w-20 cursor-grab flex-col rounded-lg border border-zinc-300 bg-white shadow active:cursor-grabbing ${color}`}
            style={{
              marginLeft: i === 0 ? 0 : "-1.5rem",
              rotate: `${angle}deg`,
              translateY: `${translateY}px`,
              transformOrigin: "bottom center",
              zIndex: i,
            }}
          >
            <span className="absolute top-1 left-1.5 leading-tight">
              {rank}
            </span>
            <span className="m-auto text-3xl">{suit}</span>
            <span className="absolute bottom-1 right-1.5 rotate-180 leading-tight">
              {rank}
            </span>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
