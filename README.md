# mini-redis

A small Redis-inspired TCP server written in TypeScript. It supports a handful of string and counter commands, keeps data in memory, and exposes a simple text prompt over a raw socket connection.

## Features

- `SET key value`
- `SET key value EX seconds`
- `SET key value PX milliseconds`
- `GET key`
- `DEL key`
- `EXISTS key`
- `EXPIRE key seconds`
- `TTL key`
- `INCR key`
- `INCR key amount`
- `DECR key`
- `DECR key amount`
- Quoted values are supported, for example: `SET message "hello world"`
- Expired keys are swept every second

## Project Layout

- `src/server.ts`: TCP server and request loop
- `src/commandHandler.ts`: command parsing and dispatch
- `src/store.ts`: in-memory key/value store with TTL support
- `src/utils.ts`: tokenization for quoted input
- `src/persistance.ts`: append/load helper for command-log persistence

## Requirements

- Node.js 20+ recommended
- npm

## Install

```bash
npm install
```

## Run

Development mode:

```bash
npm run dev
```

Build and start:

```bash
npm run build
npm start
```

The server listens on port `6380`.

## Connect

Use any TCP client. Examples:

```bash
telnet localhost 6380
```

```bash
nc localhost 6380
```

After connecting, you will see:

```text
Mini Redis ready
mini-redis>
```

## Example Session

```text
SET name akm
OK
GET name
akm
SET counter 10
OK
INCR counter
11
INCR counter 5
16
DECR counter 2
14
EXPIRE name 10
1
TTL name
10
```

## Command Notes

- `GET` returns `(nil)` when a key does not exist.
- `DEL`, `EXISTS`, and `EXPIRE` return numeric results.
- `TTL` returns:
  - `-2` if the key does not exist
  - `-1` if the key exists without an expiry
- `INCR` and `DECR` create the key automatically when missing, starting from `0`.
- `INCR` and `DECR` only work on integer values.

## Persistence

There is a persistence helper in [src/persistance.ts](/abs/path/d:/My%20Projects/mini-redis/src/persistance.ts), but command replay and append logic are currently commented out in [src/server.ts](/abs/path/d:/My%20Projects/mini-redis/src/server.ts). As the code stands today, data is in-memory only and is lost when the server stops.

## Limitations

- RESP is not implemented; this is a plain text TCP protocol
- Data is not persisted by default
- No authentication
- No automated test suite yet
