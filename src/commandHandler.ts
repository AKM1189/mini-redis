import net from "node:net";
import { tokenize } from "./utils.js";
import { Store } from "./store.js";
import { PubSub } from "./pubsub.js";

const writeCommands = new Set(["SET", "DEL", "EXPIRE", "INCR", "DECR"]);

export const handleCommand = (
  socket: net.Socket,
  store: Store,
  cmd: string,
  args: string[],
  pubsub: PubSub,
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

    case "SUBSCRIBE": {
      if (args.length < 1) {
        socket.write("ERR wrong number of arguments for SUBSCRIBE\n");
        return;
      }
      try {
        for (const channel of args) {
          const count = pubsub.subscribe(socket, channel);
          socket.write(`subscribed channel: ${channel} | count: ${count}\n`);
        }
        return;
      } catch (error) {
        socket.write(`${(error as Error).message}\n`);
        return;
      }
    }

    case "UNSUBSCRIBE": {
      if (args.length < 1) {
        socket.write("ERR wrong number of arguments for UNSUBSCRIBE\n");
        return;
      }

      for (const channel of args) {
        const count = pubsub.unsubscribe(socket, channel);
        socket.write(`unsubscribed ${channel} ${count}\n`);
      }

      return;
    }

    case "PSUBSCRIBE": {
      if (args.length < 1) {
        socket.write("ERR wrong number of arguments for PSUBSCRIBE\n");
        return;
      }

      for (const pattern of args) {
        const count = pubsub.psubscribe(socket, pattern);
        socket.write(`psubscribed ${pattern} ${count}\n`);
      }

      return;
    }

    case "PUBLISH": {
      if (args.length < 2) {
        socket.write("ERR wrong number of arguments for PUBLISH\n");
        return;
      }

      const channel = args[0];
      const message = args.slice(1).join(" ");
      const delivered = pubsub.publish(channel, message);

      socket.write(`${delivered}\n`);
      return;
    }

    case "PUNSUBSCRIBE": {
      if (args.length < 1) {
        socket.write("ERR wrong number of arguments for PUNSUBSCRIBE\n");
        return;
      }

      for (const pattern of args) {
        const count = pubsub.punsubscribe(socket, pattern);
        socket.write(`punsubscribed ${pattern} ${count}\n`);
      }

      return;
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
