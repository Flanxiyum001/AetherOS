import {describe, expect, it, beforeEach} from 'vitest'
import {
  putFile,
  listFiles,
  getFile,
  deleteFile,
  makeFileMeta,
  formatSize,
} from './drive'
import {blobToText} from './test/blobHelpers'

beforeEach(async () => {
  // reset both object stores using the same global indexedDB the module uses,
  // creating the schema if it doesn't exist yet
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open('aether-drive', 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', {keyPath: 'id'})
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', {keyPath: 'id'})
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  await Promise.all(
    (['files', 'meta'] as const).map(
      store =>
        new Promise<void>((res, rej) => {
          const t = db.transaction(store, 'readwrite')
          t.objectStore(store).clear()
          t.oncomplete = () => res()
          t.onerror = () => rej(t.error)
        })
    )
  )
  db.close()
})

const blobOf = (s: string, type = 'text/plain') => new Blob([s], {type})

describe('drive CRUD', () => {
  it('putFile persists the blob but listFiles returns metadata only', async () => {
    const rec = makeFileMeta(blobOf('hello'), 'hello.txt', 'me', 'me')
    await putFile(rec)
    const metas = await listFiles()
    expect(metas).toHaveLength(1)
    expect(metas[0].name).toBe('hello.txt')
    expect(metas[0].size).toBe(5)
    expect((metas[0] as unknown as {blob?: Blob}).blob).toBeUndefined()
  })

  it('getFile round-trips the full record with blob content', async () => {
    const rec = makeFileMeta(blobOf('hello'), 'hello.txt', 'me', 'me')
    await putFile(rec)
    const got = await getFile(rec.id)
    expect(got).toBeDefined()
    expect(await blobToText(got!.blob)).toBe('hello')
    expect(got!.mime).toBe('text/plain')
    expect(got!.name).toBe('hello.txt')
  })

  it('getFile returns undefined for unknown ids', async () => {
    expect(await getFile('nope')).toBeUndefined()
  })

  it('deleteFile removes both blob and metadata', async () => {
    const rec = makeFileMeta(blobOf('x'), 'x.bin', 'me', 'me')
    await putFile(rec)
    await deleteFile(rec.id)
    expect(await getFile(rec.id)).toBeUndefined()
    expect(await listFiles()).toHaveLength(0)
  })

  it('makeFileMeta assigns unique ids and 50MB sizing works', async () => {
    const big = new Blob([new Uint8Array(50 * 1024 * 1024)])
    const a = makeFileMeta(blobOf('a'), 'a.txt', 'me', 'me')
    const b = makeFileMeta(big, 'big.bin', 'me', 'me')
    expect(a.id).not.toBe(b.id)
    expect(b.size).toBe(50 * 1024 * 1024)
    await putFile(b)
    const got = await getFile(b.id)
    expect(got!.size).toBe(50 * 1024 * 1024)
  })

  it('preserves addedBy attribution across a persist', async () => {
    const rec = makeFileMeta(blobOf('z'), 'z.txt', 'peer123', 'alice')
    await putFile(rec)
    const meta = (await listFiles())[0]
    expect(meta.addedBy).toBe('peer123')
    expect(meta.addedByName).toBe('alice')
  })
})

describe('formatSize', () => {
  it('formats bytes, KB, MB, GB', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB')
  })
})
