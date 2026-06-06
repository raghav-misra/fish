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
        const { red } = cardFace(card);
        const isJoker = card.kind === "joker";
        const rank = isJoker ? "★" : card.rank;
        const suit = isJoker ? (card.color === "red" ? "♦" : "♣") : SUIT_GLYPH[card.suit];
        const color = red ? "text-rose-600" : "text-slate-900";
        return (
          <Reorder.Item
            key={cardId(card)}
            value={card}
            whileDrag={{ scale: 1.1, zIndex: 50 }}
            whileHover={{ y: -16 }}
            onClick={() => onCardClick?.(card)}
            className={`relative flex h-28 w-20 cursor-grab flex-col rounded-lg border border-slate-200 bg-white shadow-lg active:cursor-grabbing ${color}`}
          >
            <span className="absolute top-1 left-1.5 text-[11px] font-bold leading-tight">
              {rank}<br/>{suit}
            </span>
            <span className="m-auto text-3xl">{suit}</span>
            <span className="absolute bottom-1 right-1.5 rotate-180 text-[11px] font-bold leading-tight">
              {rank}<br/>{suit}
            </span>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
