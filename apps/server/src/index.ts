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
  AskPayloadSchema,
  CallPayloadSchema,
} from "@fish/shared";
import { config } from "./config.js";
import { RoomManager, type Room } from "./rooms.js";
import { startGame, applyAsk, applyCall } from "./game.js";

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

  socket.on("game:ask", (raw, ack) => {
    const parsed = AskPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
    }
    const result = applyAsk(
      room,
      socket.data.playerId,
      parsed.data.targetId,
      parsed.data.card,
    );
    if (!result.ok) {
      return ack({ ok: false, error: { code: result.code, message: result.message } });
    }
    ack({ ok: true, data: null });
    broadcastRoom(room);
    emitLogs(room, result.logs);
  });

  socket.on("game:call", (raw, ack) => {
    const parsed = CallPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return ack({ ok: false, error: { code: "BAD_INPUT", message: "Invalid payload" } });
    }
    const room = rooms.getRoom(parsed.data.roomId);
    if (!room || !socket.data.playerId) {
      return ack({ ok: false, error: { code: "NOT_FOUND", message: "Room not found" } });
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
    ack({ ok: true, data: null });
    broadcastRoom(room);
    emitLogs(room, result.logs);
  });

  socket.on("disconnect", () => {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;
    const room = rooms.getRoom(roomId);
    if (!room) return;
    // Keep the player around so they can resume; just mark them offline.
    rooms.setConnected(room, playerId, false);
    broadcastRoom(room);
  });
});

const address = await fastify.listen({ port: config.port, host: config.host });
fastify.log.info(`Fish server listening on ${address}`);
