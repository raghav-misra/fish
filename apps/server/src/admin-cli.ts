/**
 * Fish admin CLI — a thin wrapper over the server's /admin API so command-line
 * agents can fill rooms with bots, inspect state, and play turns.
 *
 * Usage:
 *   pnpm admin <command> [args]
 *
 * Config via env:
 *   FISH_SERVER_URL  base URL of the server   (default http://localhost:3000)
 *   ADMIN_TOKEN      shared admin secret       (default dev-admin-token)
 */

const BASE = (process.env.FISH_SERVER_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

const USAGE = `Fish admin CLI

Commands:
  rooms                                   List all rooms
  room <roomId>                           Inspect a room (state, turn, hands)
  create-room [hostName]                  Create a fresh room with a bot host
  add <roomId> [name]                     Add one bot player (lobby only)
  fill <roomId> [target=6]                Add bots until the room has <target> players
  start <roomId>                          Deal and start the game
  ask <roomId> <askerId> <targetId> <card>
                                          Ask on a player's behalf (card e.g. A-spades, joker-red)
  call <roomId> <callerId> <halfSuit> <playerId:card> x6
                                          Call a half suit with 6 player:card placements

Examples:
  pnpm admin fill ABC123 6
  pnpm admin start ABC123
  pnpm admin ask ABC123 <askerId> <targetId> 9-hearts
  pnpm admin call ABC123 <callerId> clubs-low p1:A-clubs p1:2-clubs p2:3-clubs p2:4-clubs p3:5-clubs p3:6-clubs
`;

async function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "x-admin-token": TOKEN,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

function done(status: number, data: unknown): never {
  console.log(JSON.stringify(data, null, 2));
  process.exit(status >= 200 && status < 300 ? 0 : 1);
}

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }

  switch (command) {
    case "rooms": {
      const { status, data } = await request("GET", "/admin/rooms");
      return done(status, data);
    }
    case "room": {
      const [roomId] = args;
      if (!roomId) fail("Usage: room <roomId>");
      const { status, data } = await request("GET", `/admin/rooms/${roomId}`);
      return done(status, data);
    }
    case "create-room": {
      const [hostName] = args;
      const { status, data } = await request("POST", "/admin/rooms", { hostName });
      return done(status, data);
    }
    case "add": {
      const [roomId, name] = args;
      if (!roomId) fail("Usage: add <roomId> [name]");
      const { status, data } = await request("POST", `/admin/rooms/${roomId}/players`, { name });
      return done(status, data);
    }
    case "fill": {
      const [roomId, target] = args;
      if (!roomId) fail("Usage: fill <roomId> [target=6]");
      const body = target ? { target: Number(target) } : {};
      const { status, data } = await request("POST", `/admin/rooms/${roomId}/fill`, body);
      return done(status, data);
    }
    case "start": {
      const [roomId] = args;
      if (!roomId) fail("Usage: start <roomId>");
      const { status, data } = await request("POST", `/admin/rooms/${roomId}/start`);
      return done(status, data);
    }
    case "ask": {
      const [roomId, askerId, targetId, card] = args;
      if (!roomId || !askerId || !targetId || !card) {
        fail("Usage: ask <roomId> <askerId> <targetId> <card>");
      }
      const { status, data } = await request("POST", `/admin/rooms/${roomId}/ask`, {
        askerId,
        targetId,
        card,
      });
      return done(status, data);
    }
    case "call": {
      const [roomId, callerId, halfSuit, ...pairs] = args;
      if (!roomId || !callerId || !halfSuit || pairs.length === 0) {
        fail("Usage: call <roomId> <callerId> <halfSuit> <playerId:card> ...");
      }
      const placement = pairs.map((pair) => {
        const idx = pair.indexOf(":");
        if (idx < 0) fail(`Bad placement "${pair}", expected playerId:card`);
        return { playerId: pair.slice(0, idx), card: pair.slice(idx + 1) };
      });
      const { status, data } = await request("POST", `/admin/rooms/${roomId}/call`, {
        callerId,
        halfSuit,
        placement,
      });
      return done(status, data);
    }
    default:
      fail(`Unknown command "${command}". Run \`pnpm admin help\`.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
});
