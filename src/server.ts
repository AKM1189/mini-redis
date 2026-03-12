import net from "node:net";
import path from "node:path";
import { Store } from "./store.js";
import { handleCommand, isWriteCommand } from "./commandHandler.js";
import { Persistence } from "./persistance.js";
import { tokenize } from "./utils.js";
import { PubSub } from "./pubsub.js";

const store = new Store();
const pubsub = new PubSub();
// const persistance = new Persistence(path.resolve(process.cwd(), "src", "command.txt"));
// const noopSocket = { write: (_message: string) => true };

// for (const line of persistance.loadLines()) {
//   const [command, ...args] = tokenize(line);

//   if (!command) {
//     continue;
//   }

//   handleCommand(noopSocket, store, command.toUpperCase(), args);
// }

const server = net.createServer((socket) => {
  socket.setEncoding("utf-8");

  socket.write("Mini Redis ready\n");

  const prompt = `mini-redis> `;

  socket.write(prompt);
  socket.on("data", (input) => {
    const line = input.toString().trim();
    const [command, ...args] = tokenize(line);

    try {
      const cmd = command?.toUpperCase() ?? "";
      const result = handleCommand(socket, store, cmd, args, pubsub);

      //   if (result !== undefined && isWriteCommand(cmd)) {
      //     persistance.append(line);
      //   }

      if (result !== undefined) {
        socket.write(result + "\n");
      }

      socket.write(prompt);
    } catch (err) {
      socket.write("ERR internal server error\n");
    }
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
    pubsub.cleanupSocket(socket);
  });

  socket.on("close", () => {
    console.log("\nDisconnected from server");
    pubsub.cleanupSocket(socket);
    // process.exit(0);
  });
});

setInterval(() => {
  store.sweepExpiredKeys();
}, 1000);

server.listen(6380, () => {
  console.log("Mini Redis listening on port 6380");
});
