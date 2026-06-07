import {
  type Card,
  type GameLogEntry,
  type GameSummary,
  type Award,
  type HalfSuitId,
  type CardPlacement,
  HALF_SUIT_COUNT,
  MAJORITY,
  cardsEqual,
  freshDeck,
  halfSuitMembers,
  halfSuitOf,
} from "@fish/shared";
import type { Room } from "./rooms.js";

/**
 * Authoritative Fish game engine.
 *
 * Pure(-ish) functions that mutate a Room in place and return either an
 * error (rejected action) or a list of log entries describing what happened.
 * All rules live here so the server stays the single source of truth.
 */

export type EngineResult =
  | { ok: true; logs: GameLogEntry[] }
  | { ok: false; code: string; message: string };

export type Check = { ok: true } | { ok: false; code: string; message: string };

const PLAYER_COUNT = 6;

/** Validate that `askerId` may begin asking `targetId` (before a card is chosen). */
export function canBeginAsk(
  room: Room,
  askerId: string,
  targetId: string,
): Check {
  if (room.phase !== "playing") {
    return { ok: false, code: "NOT_PLAYING", message: "Game is not in progress" };
  }
  if (room.currentTurn !== askerId) {
    return { ok: false, code: "NOT_YOUR_TURN", message: "It is not your turn" };
  }
  const asker = room.players.get(askerId);
  const target = room.players.get(targetId);
  if (!asker || !target) {
    return { ok: false, code: "NOT_FOUND", message: "Player not found" };
  }
  if (asker.team === null || target.team === null || asker.team === target.team) {
    return { ok: false, code: "OPPONENT_ONLY", message: "You must ask an opponent" };
  }
  if ((room.hands.get(targetId)?.length ?? 0) === 0) {
    return { ok: false, code: "EMPTY_TARGET", message: "That player has no cards" };
  }
  return { ok: true };
}

export function canBeginCall(
  room: Room,
  callerId: string,
  halfSuit: HalfSuitId,
): Check {
  if (room.phase !== "playing") {
    return { ok: false, code: "NOT_PLAYING", message: "Game is not in progress" };
  }
  const caller = room.players.get(callerId);
  if (!caller || caller.team === null) {
    return { ok: false, code: "NOT_FOUND", message: "Caller not found" };
  }
  if (room.claims.has(halfSuit)) {
    return { ok: false, code: "OUT_OF_PLAY", message: "That half suit is already claimed" };
  }
  return { ok: true };
}

/** Deal 9 cards each, assign teams, pick a random starter, begin play. */
export function startGame(room: Room): EngineResult {
  const ids = [...room.players.keys()];
  if (ids.length !== PLAYER_COUNT) {
    return {
      ok: false,
      code: "NEED_SIX",
      message: "Fish needs exactly 6 players to start",
    };
  }

  // Teams alternate by seat order, giving a clean 3-3 split.
  ids.forEach((id, i) => {
    const player = room.players.get(id);
    if (player) player.team = i % 2;
  });

  const deck = shuffle(freshDeck());
  for (const id of ids) room.hands.set(id, []);
  deck.forEach((card, i) => {
    const hand = room.hands.get(ids[i % PLAYER_COUNT]);
    if (hand) hand.push(card);
  });

  room.claims = new Map();
  room.winner = null;
  room.calls = [];
  room.hoard = new Map();
  room.summary = null;
  room.phase = "playing";
  room.currentTurn = ids[Math.floor(Math.random() * ids.length)];

  return { ok: true, logs: [] };
}

/** Resolve an ask: a hit steals the card and keeps the turn; a miss passes it. */
export function applyAsk(
  room: Room,
  askerId: string,
  targetId: string,
  card: Card,
): EngineResult {
  if (room.phase !== "playing") {
    return { ok: false, code: "NOT_PLAYING", message: "Game is not in progress" };
  }
  if (room.currentTurn !== askerId) {
    return { ok: false, code: "NOT_YOUR_TURN", message: "It is not your turn" };
  }

  const asker = room.players.get(askerId);
  const target = room.players.get(targetId);
  if (!asker || !target) {
    return { ok: false, code: "NOT_FOUND", message: "Player not found" };
  }
  if (askerId === targetId) {
    return { ok: false, code: "SELF", message: "You cannot ask yourself" };
  }
  if (asker.team === null || target.team === null || asker.team === target.team) {
    return { ok: false, code: "OPPONENT_ONLY", message: "You must ask an opponent" };
  }

  const targetHand = room.hands.get(targetId) ?? [];
  if (targetHand.length === 0) {
    return { ok: false, code: "EMPTY_TARGET", message: "That player has no cards" };
  }

  const hs = halfSuitOf(card);
  if (room.claims.has(hs)) {
    return { ok: false, code: "OUT_OF_PLAY", message: "That half suit is out of play" };
  }

  const askerHand = room.hands.get(askerId) ?? [];
  if (askerHand.some((c) => cardsEqual(c, card))) {
    return { ok: false, code: "ALREADY_HAVE", message: "You already hold that card" };
  }
  if (!askerHand.some((c) => halfSuitOf(c) === hs)) {
    return {
      ok: false,
      code: "NEED_HALFSUIT",
      message: "You must hold a card from that half suit",
    };
  }

  const idx = targetHand.findIndex((c) => cardsEqual(c, card));
  if (idx >= 0) {
    const [moved] = targetHand.splice(idx, 1);
    askerHand.push(moved);
    // Hit: asker keeps the turn.
    return {
      ok: true,
      logs: [{ kind: "ask", askerId, targetId, card, success: true }],
    };
  }

  // Miss: the asked player (who always has cards) takes the turn.
  room.currentTurn = targetId;
  return {
    ok: true,
    logs: [{ kind: "ask", askerId, targetId, card, success: false }],
  };
}

/**
 * Resolve a call (claim of a half suit).
 *
 * The caller maps each of the half suit's 6 cards to a teammate. The call
 * succeeds only if the mapping is exact AND every card actually sits with the
 * named teammate. Any error hands the half suit to the opposing team. Either
 * way the half suit leaves circulation.
 */
export function applyCall(
  room: Room,
  callerId: string,
  halfSuit: HalfSuitId,
  placement: CardPlacement[],
): EngineResult {
  if (room.phase !== "playing") {
    return { ok: false, code: "NOT_PLAYING", message: "Game is not in progress" };
  }
  const caller = room.players.get(callerId);
  if (!caller || caller.team === null) {
    return { ok: false, code: "NOT_FOUND", message: "Caller not found" };
  }
  if (room.claims.has(halfSuit)) {
    return { ok: false, code: "OUT_OF_PLAY", message: "That half suit is already claimed" };
  }

  const callerTeam = caller.team;
  const opposingTeam = callerTeam === 0 ? 1 : 0;

  // A call is "correct" only when the placement (a) covers exactly the 6 member
  // cards, (b) names only the caller's teammates, and (c) matches reality.
  let correct = true;
  const covered = new Set<string>();
  for (const { card, playerId } of placement) {
    if (halfSuitOf(card) !== halfSuit) {
      correct = false;
      break;
    }
    covered.add(memberKey(card));
    const named = room.players.get(playerId);
    if (!named || named.team !== callerTeam) {
      correct = false;
      break;
    }
    const hand = room.hands.get(playerId) ?? [];
    if (!hand.some((c) => cardsEqual(c, card))) {
      correct = false;
      break;
    }
  }
  if (correct && covered.size !== halfSuitMembers(halfSuit).length) {
    correct = false;
  }

  const winningTeam = correct ? callerTeam : opposingTeam;
  const preTurn = room.currentTurn;

  room.claims.set(halfSuit, winningTeam);

  // Credit each holder of this half suit before the cards leave their hands.
  for (const [pid, hand] of room.hands) {
    const held = hand.filter((c) => halfSuitOf(c) === halfSuit).length;
    if (held > 0) room.hoard.set(pid, (room.hoard.get(pid) ?? 0) + held);
  }
  room.calls.push({ callerId, callerTeam, winningTeam, success: correct });

  for (const [pid, hand] of room.hands) {
    room.hands.set(
      pid,
      hand.filter((c) => halfSuitOf(c) !== halfSuit),
    );
  }

  // Calling runs async of turns: the turn returns to whoever held it. But if
  // that player was emptied by this call, hand off to a random teammate.
  room.currentTurn = resolveTurnAfterCall(room, preTurn);

  const counts = [0, 0];
  for (const team of room.claims.values()) counts[team] += 1;
  if (
    counts[0] >= MAJORITY ||
    counts[1] >= MAJORITY ||
    room.claims.size === HALF_SUIT_COUNT
  ) {
    room.phase = "finished";
    room.winner = counts[0] > counts[1] ? 0 : 1;
    room.currentTurn = null;
    room.summary = computeSummary(room, room.winner);
  }

  return {
    ok: true,
    logs: [
      { kind: "call", callerId, halfSuit, success: correct, team: winningTeam },
    ],
  };
}

function resolveTurnAfterCall(room: Room, preTurn: string | null): string | null {
  const hasCards = (id: string) => (room.hands.get(id)?.length ?? 0) > 0;
  if (preTurn && hasCards(preTurn)) return preTurn;

  const holder = preTurn ? room.players.get(preTurn) : undefined;
  const team = holder?.team ?? null;

  const teammates = [...room.players.values()].filter(
    (p) => p.team === team && hasCards(p.id),
  );
  if (teammates.length) return pickRandom(teammates).id;

  // Degenerate fallback: the whole team is empty.
  const anyone = [...room.players.values()].filter((p) => hasCards(p.id));
  return anyone.length ? pickRandom(anyone).id : null;
}

function memberKey(card: Card): string {
  return card.kind === "joker" ? `joker-${card.color}` : `${card.rank}-${card.suit}`;
}

/**
 * End-of-game superlatives:
 *  - bestCaller: winning-team player with the most calls (only if a clear lead).
 *  - saboteur: opponent whose failed calls gifted the winners the most sets.
 *  - hoarder: whoever held the most cards across all claimed half suits.
 */
function computeSummary(room: Room, winner: number): GameSummary {
  const callsByWinner = new Map<string, number>();
  const sabotage = new Map<string, number>();
  for (const c of room.calls) {
    if (c.callerTeam === winner) {
      callsByWinner.set(c.callerId, (callsByWinner.get(c.callerId) ?? 0) + 1);
    } else if (!c.success && c.winningTeam === winner) {
      sabotage.set(c.callerId, (sabotage.get(c.callerId) ?? 0) + 1);
    }
  }
  return {
    bestCaller: topAward(callsByWinner, true),
    saboteur: topAward(sabotage, false),
    hoarder: topAward(room.hoard, false),
  };
}

/** Highest-tallied player as an Award, or null. With `requireClear`, ties yield null. */
function topAward(tally: Map<string, number>, requireClear: boolean): Award | null {
  let best: Award | null = null;
  let tied = false;
  for (const [playerId, value] of tally) {
    if (value <= 0) continue;
    if (!best || value > best.value) {
      best = { playerId, value };
      tied = false;
    } else if (value === best.value) {
      tied = true;
    }
  }
  if (!best || (requireClear && tied)) return null;
  return best;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
