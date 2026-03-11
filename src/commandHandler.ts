import net from "node:net";
import { tokenize } from "./utils.js";
import { Store } from "./store.js";

const writeCommands = new Set(["SET", "DEL", "EXPIRE", "INCR", "DECR"]);

export const handleCommand = (
  socket: Pick<net.Socket, "write">,
  store: Store,
  cmd: string,
  args: string[],
) => {
  switch (cmd) {
    case "SET": {
      if (args.length < 2) {
        socket.write("ERR wrong number of arguments for SET\n");
        return;
      }

      const parts = tokenize(args.join(" "));
      const key = parts[0];
      const value = parts[1];

      let ttlMs: number | undefined;

      if (parts.length > 2) {
        const timeOption = parts[2].toUpperCase();
        const time = Number(parts[3]);

        if (!Number.isInteger(time) && time < 0) {
          socket.write("ERR invalid expire time\n");
        }

        if (timeOption === "EX") {
          ttlMs = time * 1000;
        } else if (timeOption === "PX") {
          ttlMs = time;
        } else {
          socket.write("ERR wrong number of arguments for SET\n");
        }
      }

      const result = store.set(key, value, ttlMs);
      return result;
    }
    case "GET": {
      if (args.length !== 1) {
        socket.write("ERR wrong number of arguments for GET\n");
        return;
      }
      const result = store.get(args[0]);
      return result ?? "(nil)";
    }

    case "DEL": {
      if (args.length !== 1) {
        socket.write("ERR wrong number of arguments for DEL\n");
        return;
      }
      const result = store.del(args[0]);
      return result;
    }

    case "EXISTS": {
      if (args.length !== 1) {
        socket.write("ERR wrong number of arguments for EXISTS\n");
        return;
      }
      const result = store.exists(args[0]);
      return result;
    }

    case "EXPIRE": {
      if (args.length !== 2) {
        socket.write("ERR wrong number of arguments for EXPIRE\n");
        return;
      }

      const [key, secondsRaw] = args;
      const seconds = Number(secondsRaw);

      if (!Number.isInteger(seconds) || seconds < 0) {
        socket.write("ERR invalid expire time\n");
        return;
      }

      const result = store.expire(key, seconds);
      return result;
    }

    case "TTL": {
      if (args.length !== 1) {
        socket.write("ERR wrong number of arguments for TTL\n");
        return;
      }
      const key = args[0];
      const result = store.ttl(key);

      return result;
    }

    case "INCR": {
      if (args.length < 1 || args.length > 2) {
        socket.write("ERR wrong number of arguments for INCR\n");
        return;
      }

      try {
        const delta = parseDelta(args[1]);
        return store.incr(args[0], delta);
      } catch (error) {
        socket.write(`${(error as Error).message}\n`);
        return;
      }
    }

    case "DECR": {
      if (args.length < 1 || args.length > 2) {
        socket.write("ERR wrong number of arguments for DECR\n");
        return;
      }

      try {
        const delta = parseDelta(args[1]);
        return store.decr(args[0], delta);
      } catch (error) {
        socket.write(`${(error as Error).message}\n`);
        return;
      }
    }

    case "": {
      return;
    }

    default:
      socket.write("ERR unknown command\n");
  }
};

export const isWriteCommand = (cmd: string): boolean => writeCommands.has(cmd);

const parseDelta = (value?: string): number => {
  if (value === undefined) {
    return 1;
  }

  const trimmed = value.trim();
  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || trimmed !== String(parsed) || parsed < 0) {
    throw new Error("ERR increment or decrement value is not a valid integer");
  }

  return parsed;
};
