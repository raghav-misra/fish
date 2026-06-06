import { z } from "zod";
import {
  PublicGameStateSchema,
  PrivateHandSchema,
  RoomSummarySchema,
} from "./room.js";

export const CreateRoomPayloadSchema = z.object({
  playerName: z.string().min(1).max(24),
});
export type CreateRoomPayload = z.infer<typeof CreateRoomPayloadSchema>;

export const JoinRoomPayloadSchema = z.object({
  roomId: z.string().min(1),
  playerName: z.string().min(1).max(24),
});
export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;

export const LeaveRoomPayloadSchema = z.object({
  roomId: z.string().min(1),
});
export type LeaveRoomPayload = z.infer<typeof LeaveRoomPayloadSchema>;

export const StartGamePayloadSchema = z.object({
  roomId: z.string().min(1),
});
export type StartGamePayload = z.infer<typeof StartGamePayloadSchema>;

/** Reconnect after a dropped WebSocket. */
export const ResumePayloadSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});
export type ResumePayload = z.infer<typeof ResumePayloadSchema>;

export const RoomJoinedSchema = z.object({
  roomId: z.string(),
  playerId: z.string(),
});
export type RoomJoined = z.infer<typeof RoomJoinedSchema>;

export const ErrorMessageSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

type Ack<T> = (
  response: { ok: true; data: T } | { ok: false; error: ErrorMessage },
) => void;

export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload, ack: Ack<RoomJoined>) => void;
  "room:join": (payload: JoinRoomPayload, ack: Ack<RoomJoined>) => void;
  "room:leave": (payload: LeaveRoomPayload) => void;
  "room:resume": (payload: ResumePayload, ack: Ack<RoomJoined>) => void;
  "game:start": (payload: StartGamePayload) => void;
}

export interface ServerToClientEvents {
  "room:list": (rooms: z.infer<typeof RoomSummarySchema>[]) => void;
  "game:state": (state: z.infer<typeof PublicGameStateSchema>) => void;
  "game:hand": (hand: z.infer<typeof PrivateHandSchema>) => void;
  "server:error": (error: ErrorMessage) => void;
}

export interface SocketData {
  playerId?: string;
  roomId?: string;
}
