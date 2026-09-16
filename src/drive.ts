// IndexedDB-backed virtual drive. Files are stored as Blobs locally; only
// metadata is synced over the P2P network (payloads are streamed on demand).

import {nanoid} from 'nanoid'
import type {DriveFileMeta} from './store'

const DB_NAME = 'aether-drive'
const STORE = 'files'
const META_STORE = 'meta'

export interface DriveFile extends DriveFileMeta {
  blob: Blob
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath: 'id'})
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, {keyPath: 'id'})
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      })
  )
}

export async function listFiles(): Promise<DriveFileMeta[]> {
  const metas = await tx<DriveFileMeta[]>(META_STORE, 'readonly', s => s.getAll())
  return metas ?? []
}

export async function putFile(file: DriveFile): Promise<void> {
  await tx(STORE, 'readwrite', s => s.put(file))
  await tx(META_STORE, 'readwrite', s => s.put(metaOf(file)))
}

export async function getFile(id: string): Promise<DriveFile | undefined> {
  return tx<DriveFile | undefined>(STORE, 'readonly', s => s.get(id))
}

export async function deleteFile(id: string): Promise<void> {
  await tx(STORE, 'readwrite', s => s.delete(id))
  await tx(META_STORE, 'readwrite', s => s.delete(id))
}

function metaOf(f: DriveFile): DriveFileMeta {
  const {blob, ...meta} = f
  void blob
  return meta
}

export function makeFileMeta(
  blob: Blob,
  name: string,
  addedBy: string,
  addedByName: string
): DriveFile {
  return {
    id: nanoid(10),
    name,
    size: blob.size,
    mime: blob.type || 'application/octet-stream',
    addedBy,
    addedByName,
    ts: Date.now(),
    blob,
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
