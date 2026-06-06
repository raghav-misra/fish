import { Reorder } from "framer-motion";
import type { Card } from "@fish/shared";
import { cardId } from "@fish/shared";
import { cardFace } from "../lib/ui.js";

interface OwnHandProps {
  cards: Card[];
  onReorder: (cards: Card[]) => void;
  /** When asking, clicking a card isn't used; selection happens in the modal. */
  onCardClick?: (card: Card) => void;
}

/** The local player's hand: face-up, larger, hover-lift, drag-to-reorder. */
export function OwnHand({ cards, onReorder, onCardClick }: OwnHandProps) {
  return (
    <Reorder.Group
      axis="x"
      values={cards}
      onReorder={onReorder}
      className="flex items-end justify-center gap-1 px-4"
    >
      {cards.map((card) => {
        const { text, red } = cardFace(card);
        return (
          <Reorder.Item
            key={cardId(card)}
            value={card}
            whileDrag={{ scale: 1.1, zIndex: 50 }}
            whileHover={{ y: -16 }}
            onClick={() => onCardClick?.(card)}
            className={`flex h-28 w-20 cursor-grab items-center justify-center rounded-lg bg-white text-2xl font-semibold shadow-lg active:cursor-grabbing ${
              red ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {text}
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
