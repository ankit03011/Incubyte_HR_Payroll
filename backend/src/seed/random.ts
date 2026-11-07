/** Seeded pseudo-random generator (mulberry32): same seed, same sequence. Not for cryptography. */
export interface Random {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weightedPick<T extends { headcountWeight: number }>(items: readonly T[]): T;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  function int(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(items: readonly T[]): T {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new Error('Cannot pick from an empty list');
    return item;
  }

  function weightedPick<T extends { headcountWeight: number }>(items: readonly T[]): T {
    const total = items.reduce((sum, item) => sum + item.headcountWeight, 0);
    let remaining = next() * total;
    for (const item of items) {
      remaining -= item.headcountWeight;
      if (remaining < 0) return item;
    }
    return pick(items);
  }

  return { next, int, pick, weightedPick };
}
