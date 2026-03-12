import net from "node:net";

export class PubSub {
  private channels = new Map<string, Set<net.Socket>>();
  private subscriptions = new Map<net.Socket, Set<string>>();

  private patterns = new Map<string, Set<net.Socket>>();
  private patternSubscriptions = new Map<net.Socket, Set<string>>();

  subscribe(socket: net.Socket, channel: string): number {
    if (!this.channels.get(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(socket);

    return this.channels.get(channel)!.size;
  }

  unsubscribe(socket: net.Socket, channel: string): number {
    const subscribers = this.channels.get(channel);

    if (subscribers) {
      subscribers.delete(socket);

      if (subscribers.size === 0) {
        this.channels.delete(channel);
      }
    }

    const socketChannels = this.subscriptions.get(socket);
    if (socketChannels) {
      socketChannels.delete(channel);

      if (socketChannels.size === 0) {
        this.subscriptions.delete(socket);
      }
    }

    return subscribers?.size ?? 0;
  }

  psubscribe(socket: net.Socket, pattern: string): number {
    if (!this.patterns.has(pattern)) {
      this.patterns.set(pattern, new Set());
    }

    this.patterns.get(pattern)?.add(socket);

    if (!this.patternSubscriptions.has(socket)) {
      this.patternSubscriptions.set(socket, new Set());
    }

    this.patternSubscriptions.get(socket)?.add(pattern);

    return this.patternSubscriptions.get(socket)!.size;
  }

  punsubscribe(socket: net.Socket, pattern: string): number {
    const subscribers = this.patterns.get(pattern);
    if (subscribers) {
      subscribers.delete(socket);

      if (subscribers.size === 0) {
        this.patterns.delete(pattern);
      }
    }

    const socketPatterns = this.patternSubscriptions.get(socket);
    if (socketPatterns) {
      socketPatterns.delete(pattern);
      if (socketPatterns.size === 0) {
        this.patternSubscriptions.delete(socket);
      }
    }
    return this.patternSubscriptions.get(socket)?.size ?? 0;
  }

  publish(channel: string, message: string): number {
    const deliveredSockets = new Set<net.Socket>();

    // exact subscribers
    const exactSubscribers = this.channels.get(channel);
    if (exactSubscribers) {
      for (const socket of exactSubscribers) {
        if (!socket.destroyed) {
          socket.write(`message ${message}\n`);
          deliveredSockets.add(socket);
        }
      }
    }

    // pattern subscribers
    for (const [pattern, subscribers] of this.patterns.entries()) {
      if (!this.matchesPattern(pattern, channel)) {
        continue;
      }

      for (const socket of subscribers) {
        if (!socket.destroyed) {
          socket.write(`pmessage ${pattern} ${channel} ${message}\n`);
          deliveredSockets.add(socket);
        }
      }
    }

    return deliveredSockets.size;
  }

  cleanupSocket(socket: net.Socket): void {
    const socketChannels = this.subscriptions.get(socket);
    if (!socketChannels) return;

    for (const channel of socketChannels) {
      const subscribers = this.channels.get(channel);
      if (!subscribers) continue;

      subscribers.delete(socket);

      if (subscribers.size === 0) {
        this.channels.delete(channel);
      }
    }

    this.subscriptions.delete(socket);
  }
  private matchesPattern(pattern: string, channel: string): boolean {
    const regex = this.globToRegex(pattern);
    console.log("regex", regex);
    return regex.test(channel);
  }

  private globToRegex(pattern: string): RegExp {
    let regex = "^";

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];

      if (char === "*") {
        regex += ".*";
      } else if (char === "?") {
        regex += ".";
      } else {
        // escape regex special characters
        if ("\\.[]{}()+-^$|".includes(char)) {
          regex += "\\";
        }
        regex += char;
      }
    }

    regex += "$";
    return new RegExp(regex);
  }
}
