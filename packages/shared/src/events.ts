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

/** Map a single half-suit card to the teammate claimed to hold it. */
export const CardPlacementSchema = z.object({
  card: CardSchema,
  playerId: z.string().min(1),
});
export type CardPlacement = z.infer<typeof CardPlacementSchema>;

/* --- Staged ask: pick a target, then (in the shared overlay) pick a card. --- */

export const AskBeginPayloadSchema = z.object({
  roomId: z.string().min(1),
  targetId: z.string().min(1),
});
export type AskBeginPayload = z.infer<typeof AskBeginPayloadSchema>;

export const AskCommitPayloadSchema = z.object({
  roomId: z.string().min(1),
  card: CardSchema,
});
export type AskCommitPayload = z.infer<typeof AskCommitPayloadSchema>;

/* --- Staged call: announce a half suit, place cards live, then commit. --- */

export const CallBeginPayloadSchema = z.object({
  roomId: z.string().min(1),
  halfSuit: HalfSuitIdSchema,
});
export type CallBeginPayload = z.infer<typeof CallBeginPayloadSchema>;

/** Live, partial placement broadcast to everyone as the caller assigns cards. */
export const CallProgressPayloadSchema = z.object({
  roomId: z.string().min(1),
  placement: z.array(CardPlacementSchema).max(6),
});
export type CallProgressPayload = z.infer<typeof CallProgressPayloadSchema>;

export const CallCommitPayloadSchema = z.object({
  roomId: z.string().min(1),
  halfSuit: HalfSuitIdSchema,
  placement: z.array(CardPlacementSchema).length(6),
});
export type CallCommitPayload = z.infer<typeof CallCommitPayloadSchema>;

/** Initiator aborts an in-progress (not-yet-committed) action. */
export const CancelActionPayloadSchema = z.object({
  roomId: z.string().min(1),
});
export type CancelActionPayload = z.infer<typeof CancelActionPayloadSchema>;

/* --- Pending action: the live, shared state of an in-flight ask/call. --- */

export const ActionResultSchema = z.enum(["pending", "success", "fail"]);
export type ActionResult = z.infer<typeof ActionResultSchema>;

export const PendingAskSchema = z.object({
  kind: z.literal("ask"),
  askerId: z.string(),
  targetId: z.string(),
  /** Null while the asker is still choosing; set once revealed. */
  card: CardSchema.nullable(),
  result: ActionResultSchema,
});
export type PendingAsk = z.infer<typeof PendingAskSchema>;

export const PendingCallSchema = z.object({
  kind: z.literal("call"),
  callerId: z.string(),
  halfSuit: HalfSuitIdSchema,
  /** Grows in real time as the caller assigns cards. */
  placement: z.array(CardPlacementSchema),
  committed: z.boolean(),
  result: ActionResultSchema,
});
export type PendingCall = z.infer<typeof PendingCallSchema>;

export const PendingActionSchema = z.discriminatedUnion("kind", [
  PendingAskSchema,
  PendingCallSchema,
]);
export type PendingAction = z.infer<typeof PendingActionSchema>;

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
  "game:ask:begin": (payload: AskBeginPayload, ack: Ack<null>) => void;
  "game:ask:commit": (payload: AskCommitPayload, ack: Ack<null>) => void;
  "game:call:begin": (payload: CallBeginPayload, ack: Ack<null>) => void;
  "game:call:progress": (payload: CallProgressPayload) => void;
  "game:call:commit": (payload: CallCommitPayload, ack: Ack<null>) => void;
  "game:action:cancel": (payload: CancelActionPayload) => void;
}

export interface ServerToClientEvents {
  "room:list": (rooms: z.infer<typeof RoomSummarySchema>[]) => void;
  "game:state": (state: z.infer<typeof PublicGameStateSchema>) => void;
  "game:hand": (hand: z.infer<typeof PrivateHandSchema>) => void;
  "game:log": (entry: GameLogEntry) => void;
  "game:action": (action: PendingAction | null) => void;
  "server:error": (error: ErrorMessage) => void;
}

export interface SocketData {
  playerId?: string;
  roomId?: string;
}
