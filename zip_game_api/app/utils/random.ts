/** Small seeded PRNG so generated demo levels can be reproduced across machines. */
export type Rng = () => number

export function createRng(seed = Date.now()): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function randomInt(rng: Rng, minimum: number, maximum: number): number {
  return Math.floor(rng() * (maximum - minimum + 1)) + minimum
}

export function pick<T>(rng: Rng, items: T[]): T {
  if (items.length === 0) throw new RangeError('Cannot pick from an empty list')
  return items[Math.floor(rng() * items.length)]
}

export function shuffle<T>(rng: Rng, items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
