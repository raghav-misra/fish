import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@fish/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SERVER_URL,
  {
    autoConnect: false,
    transports: ["websocket"],
  },
);

export function emitWithAck<TData>(
  event: keyof ClientToServerEvents,
  payload: unknown,
): Promise<TData> {
  return new Promise((resolve, reject) => {
    (socket.emit as (e: string, p: unknown, ack: (r: unknown) => void) => void)(
      event,
      payload,
      (response) => {
        const res = response as
          | { ok: true; data: TData }
          | { ok: false; error: { code: string; message: string } };
        if (res.ok) resolve(res.data);
        else reject(new Error(res.error.message));
      },
    );
  });
}
