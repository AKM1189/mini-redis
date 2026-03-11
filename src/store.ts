export class Store {
  private data = new Map<string, string>();
  private expiresAt = new Map<string, number>();

  set(key: string, value: string, ttlMs?: number): string {
    this.data.set(key, value);
    if (ttlMs !== undefined) {
      this.expiresAt.set(key, Date.now() + ttlMs);
    } else {
      this.expiresAt.delete(key);
    }
    return "OK";
  }

  get(key: string): string | null {
    this.removeIfExpired(key);
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  del(key: string): number {
    const existed = this.data.delete(key);
    this.expiresAt.delete(key);
    return existed ? 1 : 0;
  }

  exists(key: string): number {
    this.removeIfExpired(key);
    return this.data.has(key) ? 1 : 0;
  }

  expire(key: string, seconds: number): number {
    this.removeIfExpired(key);
    if (!this.data.has(key)) return 0;
    const expiresAt = Date.now() + seconds * 1000;
    this.expiresAt.set(key, expiresAt);
    return 1;
  }

  ttl(key: string): number {
    this.removeIfExpired(key);

    if (!this.data.has(key)) return -2;
    if (!this.expiresAt.has(key)) return -1;

    const remainingMs = this.expiresAt.get(key)! - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  incr(key: string, delta = 1): number {
    return this.adjustInteger(key, delta);
  }

  decr(key: string, delta = 1): number {
    return this.adjustInteger(key, -delta);
  }

  private removeIfExpired(key: string) {
    const expire = this.expiresAt.get(key);

    if (expire && Date.now() >= expire) {
      this.data.delete(key);
      this.expiresAt.delete(key);
    }
  }

  sweepExpiredKeys(): void {
    const now = Date.now();
    for (const [key, expireAt] of this.expiresAt.entries()) {
      if (now >= expireAt) {
        this.data.delete(key);
        this.expiresAt.delete(key);
      }
    }
  }

  private adjustInteger(key: string, delta: number): number {
    this.removeIfExpired(key);

    const currentValue = this.data.get(key);
    const currentNumber = currentValue === undefined ? 0 : Number(currentValue);

    if (
      currentValue !== undefined &&
      (!Number.isInteger(currentNumber) ||
        currentValue.trim() !== String(currentNumber))
    ) {
      throw new Error("ERR value is not an integer");
    }

    const nextValue = currentNumber + delta;
    this.data.set(key, String(nextValue));

    return nextValue;
  }
}
