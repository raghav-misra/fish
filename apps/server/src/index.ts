import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as SocketIOServer } from "socket.io";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
  type GameLogEntry,
  CreateRoomPayloadSchema,
  JoinRoomPayloadSchema,
  LeaveRoomPayloadSchema,
  StartGamePayloadSchema,
  ResumePayloadSchema,
  AskBeginPayloadSchema,
  AskCommitPayloadSchema,
  CallBeginPayloadSchema,
  CallProgressPayloadSchema,
  CallCommitPayloadSchema,
  CancelActionPayloadSchema,
} from "@fish/shared";
import { config } from "./config.js";
import { RoomManager, type Room } from "./rooms.js";
import {
  startGame,
  applyAsk,
  applyCall,
  canBeginAsk,
  canBeginCall,
} from "./game.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: config.corsOrigins });

fastify.get("/health", async () => ({ status: "ok" }));

// Socket.IO shares Fastify's underlying HTTP server.
const io = new SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(fastify.server, {
  cors: { origin: config.corsOrigins },
});

const rooms = new RoomManager();

function broadcastRoom(room: Room) {
  io.to(room.id).emit("game:state", rooms.toPublicState(room));
  for (const [playerId, cards] of room.hands) {
    io.to(`player:${playerId}`).emit("game:hand", { cards });
  }
}

function emitLogs(room: Room, logs: GameLogEntry[]) {
  for (const entry of logs) io.to(room.id).emit("game:log", entry);
}

/** Broadcast the current in-flight ask/call (or null when idle). */
function broadcastAction(room: Room) {
  io.to(room.id).emit("game:action", room.pendingAction);
}

/** True while `room` is still the live instance registered in the manager. */
function alive(room: Room): boolean {
  return rooms.getRoom(room.id) === room;
}

/** Timings (ms) for the shared suspense reveal. */
const SUSPENSE_MS = 1300;
const CLEAR_MS = 2400;

/**
 * After a commit, narrate the reveal: hold the card/placement in suspense,
 * then flip the result and only THEN release the updated game state (so hand
 * counts and turn changes don't leak the outcome early). Finally clear.
 */
function revealAndClear(room: Room, success: boolean, logs: GameLogEntry[]) {
  const pending = room.pendingAction;
  if (!pending) return;
  setTimeout(() => {
    if (!alive(room) || room.pendingAction !== pending) return;
    pending.result = success ? "success" : "fail";
    broadcastAction(room);
    broadcastRoom(room);
    emitLogs(room, logs);
    setTimeout(() => {
      if (!alive(room) || room.pendingAction !== pending) return;
      room.pendingAction = null;
      broadcastAction(room);
    }, CLEAR_MS);
  }, SUSPENSE_MS);
}

io.on("connection", (socket) => {
  fastify.log.info({ id: socket.id }, "socket connected");

  socket.on("room:create", (raw, ack) => {
    const parsed = CreateRoomPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const { room, player } = rooms.createRoom({ playerName: parsed.data.playerName });
    void socket.join(room.id);
    void socket.join(`player:${player.id}`);
    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    ack({ ok: true, data: { roomId: room.id, playerId: player.id } });
    broadcastRoom(room);
  });

  socket.on("room:join", (raw, ack) => {
    const parsed = JoinRoomPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
    }
    const player = rooms.addPlayer(room, parsed.data.playerName);
    void socket.join(room.id);
    void socket.join(`player:${player.id}`);
    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    ack({ ok: true, data: { roomId: room.id, playerId: player.id } });
    broadcastRoom(room);
  });

  socket.on("room:resume", (raw, ack) => {
    const parsed = ResumePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !room.players.has(parsed.data.playerId)) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Cannot resume session" } });
    }
    rooms.setConnected(room, parsed.data.playerId, true);
    void socket.join(room.id);
    void socket.join(`player:${parsed.data.playerId}`);
    socket.data.roomId = room.id;
    socket.data.playerId = parsed.data.playerId;
    ack({ ok: true, data: { roomId: room.id, playerId: parsed.data.playerId } });
    broadcastRoom(room);
    socket.emit("game:action", room.pendingAction);
  });

  socket.on("room:leave", (raw) => {
    const parsed = LeaveRoomPayloadSchema.safeParse(raw);
    if (!parsed.success) return;
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) return;
    rooms.removePlayer(room, socket.data.playerId);
    void socket.leave(room.id);
    if (rooms.getRoom(room.id)) broadcastRoom(room);
  });

  socket.on("game:start", (raw) => {
    const parsed = StartGamePayloadSchema.safeParse(raw);
    if (!parsed.success) return;
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room) return;
    const player = socket.data.playerId ? room.players.get(socket.data.playerId) : undefined;
    if (!player?.isHost) {
      return socket.emit("server:error", { code: "FORBIDDEN", message: "Only the host can start" });
    }
    const result = startGame(room);
    if (!result.ok) {
      return socket.emit("server:error", { code: result.code, message: result.message });
    }
    broadcastRoom(room);
    emitLogs(room, result.logs);
  });

  socket.on("game:ask:begin", (raw, ack) => {
    const parsed = AskBeginPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
    }
    if (room.pendingAction) {
      return ack({ ok: false, error: { code: "BUSY", message: "Another action is in progress" } });
    }
    const check = canBeginAsk(room, socket.data.playerId, parsed.data.targetId);
    if (!check.ok) {
      return ack({ ok: false, error: { code: check.code, message: check.message } });
    }
    room.pendingAction = {
      kind: "ask",
      askerId: socket.data.playerId,
      targetId: parsed.data.targetId,
      card: null,
      result: "pending",
    };
    ack({ ok: true, data: null });
    broadcastAction(room);
  });

  socket.on("game:ask:commit", (raw, ack) => {
    const parsed = AskCommitPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
    }
    const pending = room.pendingAction;
    if (
      !pending ||
      pending.kind !== "ask" ||
      pending.askerId !== socket.data.playerId ||
      pending.card
    ) {
      return ack({ ok: false, error: { code: "NO_PENDING", message: "No ask to commit" } });
    }
    const result = applyAsk(room, socket.data.playerId, pending.targetId, parsed.data.card);
    if (!result.ok) {
      // Keep the pending ask open so the asker can pick a different card.
      return ack({ ok: false, error: { code: result.code, message: result.message } });
    }
    const log = result.logs[0];
    const success = log?.kind === "ask" ? log.success : false;
    pending.card = parsed.data.card; // result stays "pending" until the reveal
    ack({ ok: true, data: null });
    broadcastAction(room);
    revealAndClear(room, success, result.logs);
  });

  socket.on("game:call:begin", (raw, ack) => {
    const parsed = CallBeginPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
    }
    if (room.pendingAction) {
      return ack({ ok: false, error: { code: "BUSY", message: "Another action is in progress" } });
    }
    const check = canBeginCall(room, socket.data.playerId, parsed.data.halfSuit);
    if (!check.ok) {
      return ack({ ok: false, error: { code: check.code, message: check.message } });
    }
    room.pendingAction = {
      kind: "call",
      callerId: socket.data.playerId,
      halfSuit: parsed.data.halfSuit,
      placement: [],
      committed: false,
      result: "pending",
    };
    ack({ ok: true, data: null });
    broadcastAction(room);
  });

  socket.on("game:call:progress", (raw) => {
    const parsed = CallProgressPayloadSchema.safeParse(raw);
    if (!parsed.success) return;
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) return;
    const pending = room.pendingAction;
    if (
      !pending ||
      pending.kind !== "call" ||
      pending.callerId !== socket.data.playerId ||
      pending.committed
    ) {
      return;
    }
    pending.placement = parsed.data.placement;
    broadcastAction(room);
  });

  socket.on("game:call:commit", (raw, ack) => {
    const parsed = CallCommitPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
    }
    const pending = room.pendingAction;
    if (
      !pending ||
      pending.kind !== "call" ||
      pending.callerId !== socket.data.playerId ||
      pending.committed
    ) {
      return ack({ ok: false, error: { code: "NO_PENDING", message: "No call to commit" } });
    }
    const result = applyCall(
      room,
      socket.data.playerId,
      parsed.data.halfSuit,
      parsed.data.placement,
    );
    if (!result.ok) {
      return ack({ ok: false, error: { code: result.code, message: result.message } });
    }
    const log = result.logs[0];
    const success = log?.kind === "call" ? log.success : false;
    pending.placement = parsed.data.placement;
    pending.committed = true; // result stays "pending" until the reveal
    ack({ ok: true, data: null });
    broadcastAction(room);
    revealAndClear(room, success, result.logs);
  });

  socket.on("game:action:cancel", (raw) => {
    const parsed = CancelActionPayloadSchema.safeParse(raw);
    if (!parsed.success) return;
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) return;
    const pending = room.pendingAction;
    if (!pending) return;
    const initiator = pending.kind === "ask" ? pending.askerId : pending.callerId;
    if (initiator !== socket.data.playerId) return;
    // Only abortable before the reveal (card chosen / call committed).
    if (pending.kind === "ask" && pending.card) return;
    if (pending.kind === "call" && pending.committed) return;
    room.pendingAction = null;
    broadcastAction(room);
  });

  socket.on("disconnect", () => {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;
    const room = rooms.getRoom(roomId);
    if (!room) return;
    // If this player had a not-yet-revealed action open, release the lock.
    const pending = room.pendingAction;
    if (pending) {
      const initiator = pending.kind === "ask" ? pending.askerId : pending.callerId;
      const preReveal =
        pending.kind === "ask" ? !pending.card : !pending.committed;
      if (initiator === playerId && preReveal) {
        room.pendingAction = null;
        broadcastAction(room);
      }
    }
    // Keep the player around so they can resume; just mark them offline.
    rooms.setConnected(room, playerId, false);
    broadcastRoom(room);
  });
});

const address = await fastify.listen({ port: config.port, host: config.host });
fastify.log.info(`Fish server listening on ${address}`);
