import {vi} from 'vitest'
import 'fake-indexeddb/auto'

// Node's native structuredClone mangles cross-realm (jsdom) Blobs into plain
// objects `{}`, and jsdom's Blob lacks `.text()`. A spec-shaped clone that
// understands Blobs keeps fake-indexeddb round-trips faithful to browsers.
function structuredClone<T>(value: T): T {
  if (value instanceof Blob) return new Blob([value], {type: value.type}) as T
  if (value instanceof SharedArrayBuffer)
    return value.slice(0) as unknown as T
  if (value instanceof ArrayBuffer) return value.slice(0) as T
  if (ArrayBuffer.isView(value))
    return new (value.constructor as new (b: ArrayBuffer) => typeof value)(
      value.buffer.slice(0) as ArrayBuffer
    ) as T
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Array.isArray(value)) return value.map(v => structuredClone(v)) as T
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        structuredClone(v),
      ])
    ) as T
  return value
}

vi.stubGlobal('structuredClone', structuredClone)

// Flush pending macrotasks so async chains (e.g. IndexedDB reads) settle.
export function flushAsync(times = 6): Promise<void> {
  let p: Promise<unknown> = Promise.resolve()
  for (let i = 0; i < times; i++) {
    p = p.then(
      () => new Promise<void>(r => setTimeout(r, 0)),
      () => new Promise<void>(r => setTimeout(r, 0))
    )
  }
  return p.then(() => undefined)
}

export {}
