import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@fish/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

/**
 * Single typed Socket.IO client for the whole app.
 *
 * `reconnection` is on by default; combined with the server's `room:resume`
 * handler this recovers a session after a dropped connection (important
 * because cloud proxies cap connection lifetimes).
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SERVER_URL,
  {
    autoConnect: false,
    transports: ["websocket"],
  },
);

/** Promise wrapper around Socket.IO's ack callback. */
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
