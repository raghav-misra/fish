import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GameSummary, PublicGameState } from "@fish/shared";
import { teamLabel, teamStyle } from "../lib/ui.js";

/** How long the win splash holds before the superlative cards deal in. */
const AWARDS_DELAY_MS = 3400;

interface AwardCard {
  emoji: string;
  title: string;
  player: string;
  blurb: string;
}

/** Celebratory, Jackbox-style end screen: a win splash, then funny award cards. */
export function GameOverOverlay({ state, myId }: { state: PublicGameState; myId: string }) {
  const [showAwards, setShowAwards] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowAwards(true), AWARDS_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const winner = state.winner ?? 0;
  const myTeam = state.players.find((p) => p.id === myId)?.team ?? 0;
  const iWon = winner === myTeam;
  const accent = teamStyle(winner, myTeam);
  const nameOf = (id: string) =>
    state.players.find((p) => p.id === id)?.name ?? "Someone";
  const winners = state.players.filter((p) => p.team === winner);
  const awards = buildAwards(state.summary, nameOf);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-zinc-950/85 p-6 text-center backdrop-blur"
    >
      <Confetti />

      <motion.div layout className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Game over</p>
          <motion.h1
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className={`mt-1 text-5xl font-black drop-shadow ${accent.text}`}
          >
            🎉 {iWon ? "You won!" : "They won!"} 🎉
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-lg text-zinc-200"
        >
          Congrats to {teamLabel(winner, myTeam)}!
        </motion.p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {winners.map((p, i) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.5 + i * 0.12,
                type: "spring",
                stiffness: 320,
                damping: 18,
              }}
              className={`rounded-full bg-zinc-900/70 px-4 py-1.5 text-sm font-semibold ring-2 ${accent.ring} ${accent.text}`}
            >
              {p.name}
            </motion.span>
          ))}
        </div>

        <AnimatePresence>
          {showAwards && awards.length > 0 && (
            <motion.div
              key="awards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8"
            >
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
                Superlatives
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {awards.map((a, i) => (
                  <motion.div
                    key={a.title}
                    initial={{ opacity: 0, y: 24, rotate: -3, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                    transition={{
                      delay: i * 0.45,
                      type: "spring",
                      stiffness: 240,
                      damping: 16,
                    }}
                    className="w-52 rounded-2xl border border-zinc-700 bg-linear-to-b from-zinc-800 to-zinc-900 p-4 shadow-xl"
                  >
                    <div className="text-4xl">{a.emoji}</div>
                    <h3 className="mt-2 text-base text-amber-300">{a.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">{a.player}</p>
                    <p className="mt-1 text-xs text-zinc-400">{a.blurb}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function buildAwards(
  summary: GameSummary | null,
  nameOf: (id: string) => string,
): AwardCard[] {
  if (!summary) return [];
  const plural = (n: number) => (n === 1 ? "" : "s");
  const cards: AwardCard[] = [];
  if (summary.bestCaller) {
    const a = summary.bestCaller;
    cards.push({
      emoji: "📢",
      title: "Best Caller",
      player: nameOf(a.playerId),
      blurb: `Locked in ${a.value} call${plural(a.value)}.`,
    });
  }
  if (summary.saboteur) {
    const a = summary.saboteur;
    cards.push({
      emoji: "🎭",
      title: "The Saboteur",
      player: nameOf(a.playerId),
      blurb: `Gift-wrapped ${a.value} set${plural(a.value)} to the winners.`,
    });
  }
  if (summary.hoarder) {
    const a = summary.hoarder;
    cards.push({
      emoji: "🐉",
      title: "The Hoarder",
      player: nameOf(a.playerId),
      blurb: `Clung to ${a.value} cards in claimed sets.`,
    });
  }
  return cards;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2.6 + Math.random() * 2,
        emoji: ["🎉", "🎊", "✨", "🐟", "⭐"][i % 5],
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-xl"
          style={{ left: `${p.left}%`, top: "-8%" }}
          initial={{ y: "-10vh", opacity: 0, rotate: 0 }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0.6], rotate: 360 }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}
