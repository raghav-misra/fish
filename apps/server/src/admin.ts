import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  type Card,
  type CardPlacement,
  type GameLogEntry,
  type HalfSuitId,
  HalfSuitIdSchema,
  cardId,
  parseCard,
} from "@fish/shared";
import type { Room, RoomManager } from "./rooms.js";
import { startGame } from "./game.js";

/**
 * Dependencies the admin API borrows from the main server so its mutations
 * reach connected sockets exactly like a real player's would. `stagedAsk` and
 * `stagedCall` run the same announce → suspense → reveal → clear sequence a UI
 * player triggers, so bot turns animate identically and resolve before the
 * promise settles.
 */
export interface AdminDeps {
  rooms: RoomManager;
  adminToken: string;
  broadcastRoom: (room: Room) => void;
  emitLogs: (room: Room, logs: GameLogEntry[]) => void;
  stagedAsk: (
    room: Room,
    askerId: string,
    targetId: string,
    card: Card,
  ) => Promise<{ ok: true; success: boolean } | { ok: false; code: string; message: string }>;
  stagedCall: (
    room: Room,
    callerId: string,
    halfSuit: HalfSuitId,
    placement: CardPlacement[],
  ) => Promise<
    | { ok: true; success: boolean; team: number | null }
    | { ok: false; code: string; message: string }
  >;
}

const MAX_PLAYERS = 6;

const AddPlayerBody = z.object({
  name: z.string().min(1).max(24).optional(),
});

const FillBody = z.object({
  target: z.number().int().min(1).max(MAX_PLAYERS).optional(),
  prefix: z.string().min(1).max(16).optional(),
});

const CreateRoomBody = z.object({
  hostName: z.string().min(1).max(24).optional(),
});

const AskBody = z.object({
  askerId: z.string().min(1),
  targetId: z.string().min(1),
  card: z.string().min(1),
});

const PlacementItem = z.object({
  playerId: z.string().min(1),
  card: z.string().min(1),
});

const CallBody = z.object({
  callerId: z.string().min(1),
  halfSuit: HalfSuitIdSchema,
  placement: z.array(PlacementItem).length(MAX_PLAYERS),
});

/** Full, hands-revealing snapshot of a room for the testing agent. */
function snapshot(room: Room) {
  const turn = room.currentTurn ? room.players.get(room.currentTurn) : null;
  return {
    roomId: room.id,
    phase: room.phase,
    playerCount: room.players.size,
    currentTurn: turn ? { id: turn.id, name: turn.name, team: turn.team } : null,
    winner: room.winner,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      connected: p.connected,
      isHost: p.isHost,
      handCount: room.hands.get(p.id)?.length ?? 0,
    })),
    claims: Object.fromEntries(room.claims),
    pendingAction: room.pendingAction,
    /** Private hands, as card-id strings (e.g. "A-spades", "joker-red"). */
    hands: Object.fromEntries(
      [...room.hands].map(([id, cards]) => [id, cards.map(cardId)]),
    ),
  };
}

/**
 * Registers the /admin testing API. These endpoints are server-authoritative
 * shortcuts (no socket identity) intended to drive bots and inspect rooms
 * while testing. Guarded by a shared `x-admin-token` header.
 */
export function registerAdminRoutes(app: FastifyInstance, deps: AdminDeps): void {
  void app.register(async (admin) => {
    admin.addHook("onRequest", async (req, reply) => {
      if (req.headers["x-admin-token"] !== deps.adminToken) {
        return reply
          .code(401)
          .send({ error: "unauthorized", message: "Missing or invalid x-admin-token" });
      }
    });

    const getRoom = (reply: FastifyReply, roomId: string): Room | null => {
      const room = deps.rooms.getRoom(roomId);
      if (!room) {
        void reply.code(404).send({ error: "not_found", message: `Room ${roomId} not found` });
        return null;
      }
      return room;
    };

    admin.get("/admin/rooms", async () => ({ rooms: deps.rooms.listRooms() }));

    admin.get("/admin/rooms/:roomId", async (req, reply) => {
      const { roomId } = req.params as { roomId: string };
      const room = getRoom(reply, roomId);
      if (!room) return;
      return snapshot(room);
    });

    admin.post("/admin/rooms", async (req, reply) => {
      const body = CreateRoomBody.safeParse(req.body ?? {});
      if (!body.success) return reply.code(400).send({ error: "bad_input" });
      const { room } = deps.rooms.createRoom({ playerName: body.data.hostName ?? "Bot Host" });
      deps.broadcastRoom(room);
      return reply.code(201).send(snapshot(room));
    });

    admin.post("/admin/rooms/:roomId/players", async (req, reply) => {
      const { roomId } = req.params as { roomId: string };
      const body = AddPlayerBody.safeParse(req.body ?? {});
      if (!body.success) return reply.code(400).send({ error: "bad_input" });
      const room = getRoom(reply, roomId);
      if (!room) return;
      if (room.phase !== "lobby") {
        return reply.code(409).send({ error: "not_lobby", message: "Players can only join in the lobby" });
      }
      if (room.players.size >= MAX_PLAYERS) {
        return reply.code(409).send({ error: "full", message: "Room already has 6 players" });
      }
      const name = body.data.name ?? `Bot ${room.players.size + 1}`;
      const player = deps.rooms.addPlayer(room, name);
      deps.broadcastRoom(room);
      return reply.code(201).send({ player: { id: player.id, name: player.name }, snapshot: snapshot(room) });
    });

    admin.post("/admin/rooms/:roomId/fill", async (req, reply) => {
      const { roomId } = req.params as { roomId: string };
      const body = FillBody.safeParse(req.body ?? {});
      if (!body.success) return reply.code(400).send({ error: "bad_input" });
      const room = getRoom(reply, roomId);
      if (!room) return;
      if (room.phase !== "lobby") {
        return reply.code(409).send({ error: "not_lobby", message: "Players can only join in the lobby" });
      }
      const target = Math.min(body.data.target ?? MAX_PLAYERS, MAX_PLAYERS);
      const prefix = body.data.prefix ?? "Bot";
      const added: { id: string; name: string }[] = [];
      while (room.players.size < target) {
        const player = deps.rooms.addPlayer(room, `${prefix} ${room.players.size + 1}`);
        added.push({ id: player.id, name: player.name });
      }
      deps.broadcastRoom(room);
      return { added, snapshot: snapshot(room) };
    });

    admin.post("/admin/rooms/:roomId/start", async (req, reply) => {
      const { roomId } = req.params as { roomId: string };
      const room = getRoom(reply, roomId);
      if (!room) return;
      const result = startGame(room);
      if (!result.ok) {
        return reply.code(400).send({ error: result.code, message: result.message });
      }
      deps.broadcastRoom(room);
      deps.emitLogs(room, result.logs);
      return snapshot(room);
    });

    admin.post("/admin/rooms/:roomId/ask", async (req, reply) => {
      const { roomId } = req.params as { roomId: string };
      const body = AskBody.safeParse(req.body ?? {});
      if (!body.success) return reply.code(400).send({ error: "bad_input" });
      const room = getRoom(reply, roomId);
      if (!room) return;
      const card = parseCard(body.data.card);
      if (!card) {
        return reply.code(400).send({ error: "bad_card", message: `Unknown card "${body.data.card}"` });
      }
      const result = await deps.stagedAsk(room, body.data.askerId, body.data.targetId, card);
      if (!result.ok) {
        const status = result.code === "BUSY" ? 409 : 400;
        return reply.code(status).send({ error: result.code, message: result.message });
      }
      return { ok: true, success: result.success, snapshot: snapshot(room) };
    });

    admin.post("/admin/rooms/:roomId/call", async (req, reply) => {
      const { roomId } = req.params as { roomId: string };
      const body = CallBody.safeParse(req.body ?? {});
      if (!body.success) return reply.code(400).send({ error: "bad_input" });
      const room = getRoom(reply, roomId);
      if (!room) return;
      const placement: CardPlacement[] = [];
      for (const item of body.data.placement) {
        const card = parseCard(item.card);
        if (!card) {
          return reply.code(400).send({ error: "bad_card", message: `Unknown card "${item.card}"` });
        }
        placement.push({ card, playerId: item.playerId });
      }
      const result = await deps.stagedCall(room, body.data.callerId, body.data.halfSuit, placement);
      if (!result.ok) {
        const status = result.code === "BUSY" ? 409 : 400;
        return reply.code(status).send({ error: result.code, message: result.message });
      }
      return { ok: true, success: result.success, team: result.team, snapshot: snapshot(room) };
    });
  });
}
