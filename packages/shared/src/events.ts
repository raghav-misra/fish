import { z } from "zod";
import {
  PublicGameStateSchema,
  PrivateHandSchema,
  RoomSummarySchema,
} from "./room.js";
import { CardSchema } from "./cards.js";
import { HalfSuitIdSchema } from "./game.js";

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
export const ResumePayloadSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});
export type ResumePayload = z.infer<typeof ResumePayloadSchema>;

export const AskPayloadSchema = z.object({
  roomId: z.string().min(1),
  targetId: z.string().min(1),
  card: CardSchema,
});
export type AskPayload = z.infer<typeof AskPayloadSchema>;

/** Map a single half-suit card to the teammate claimed to hold it. */
export const CardPlacementSchema = z.object({
  card: CardSchema,
  playerId: z.string().min(1),
});
export type CardPlacement = z.infer<typeof CardPlacementSchema>;

/** Call (claim) a half suit by stating exactly where all 6 of its cards sit. */
export const CallPayloadSchema = z.object({
  roomId: z.string().min(1),
  halfSuit: HalfSuitIdSchema,
  placement: z.array(CardPlacementSchema).length(6),
});
export type CallPayload = z.infer<typeof CallPayloadSchema>;

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

/** Broadcast feed describing what just happened, for the UI activity log. */
export const GameLogEntrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ask"),
    askerId: z.string(),
    targetId: z.string(),
    card: CardSchema,
    success: z.boolean(),
  }),
  z.object({
    kind: z.literal("call"),
    callerId: z.string(),
    halfSuit: HalfSuitIdSchema,
    success: z.boolean(),
    team: z.number().int(),
  }),
]);
export type GameLogEntry = z.infer<typeof GameLogEntrySchema>;

type Ack<T> = (
  response: { ok: true; data: T } | { ok: false; error: ErrorMessage },
) => void;

export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload, ack: Ack<RoomJoined>) => void;
  "room:join": (payload: JoinRoomPayload, ack: Ack<RoomJoined>) => void;
  "room:leave": (payload: LeaveRoomPayload) => void;
  "room:resume": (payload: ResumePayload, ack: Ack<RoomJoined>) => void;
  "game:start": (payload: StartGamePayload) => void;
  "game:ask": (payload: AskPayload, ack: Ack<null>) => void;
  "game:call": (payload: CallPayload, ack: Ack<null>) => void;
}

export interface ServerToClientEvents {
  "room:list": (rooms: z.infer<typeof RoomSummarySchema>[]) => void;
  "game:state": (state: z.infer<typeof PublicGameStateSchema>) => void;
  "game:hand": (hand: z.infer<typeof PrivateHandSchema>) => void;
  "game:log": (entry: GameLogEntry) => void;
  "server:error": (error: ErrorMessage) => void;
}

export interface SocketData {
  playerId?: string;
  roomId?: string;
}
