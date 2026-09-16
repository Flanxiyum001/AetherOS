// Aether OS — net layer (Trystero / WebRTC)
// Room-scoped P2P network for presence, chat, drive metadata + payloads, and
// Pong input sync. Payloads travel directly between browsers (E2E); the
// signaling medium (Nostr relays) never sees app data.

import {joinRoom, selfId} from 'trystero'
import type {ActionSender, Room} from 'trystero'
import {nanoid} from 'nanoid'
import {useOS, type ChatMessage, type DriveFileMeta} from './store'
import {getFile, putFile, deleteFile, listFiles, makeFileMeta} from './drive'

// Hand-tested Nostr signaling relays (checked for browser WebSocket access
// from the Pages origin). Trystero retries any dead one with backoff — noise
// in the console but harmless — while a single healthy relay is enough for
// peers to find each other. mutinywallet (defunct), damus and nos.lol (403
// for some networks) were removed; primal/band/snort/offchain/wellorder were
// all verified 101-switching-protocols or 200 on the upgrade handshake.
const RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://offchain.pub',
  'wss://nostr-pub.wellorder.net',
]
const config = {appId: 'aether-os-p2p', relayUrls: RELAYS}

let room: Room | null = null
let currentRoomId: string | null = null

let sendName: ActionSender<string> | null = null
let sendChat: ActionSender<ChatMessage> | null = null
let sendMeta: ActionSender<DriveFileMeta> | null = null
let sendReq: ActionSender<{fileId: string}> | null = null
let sendBlob: ActionSender<Blob> | null = null
let sendPong: ActionSender<{y: number}> | null = null
let pongHandler: ((y: number) => void) | null = null

export function getRoomId() {
  return currentRoomId
}

export function isOnline() {
  return !!room
}

export function connect(roomId: string): Room {
  if (room && currentRoomId === roomId) return room
  if (room) void room.leave()
  currentRoomId = roomId
  const r = joinRoom(config, roomId)
  room = r

  const [nameSender, nameReceiver] = r.makeAction<string>('name')
  const [chatSender, chatReceiver] = r.makeAction<ChatMessage>('chat')
  const [metaSender, metaReceiver] = r.makeAction<DriveFileMeta>('dmeta')
  const [reqSender, reqReceiver] = r.makeAction<{fileId: string}>('dreq')
  const [blobSender, blobReceiver] = r.makeAction<Blob>('dblob')
  const [pongSender, pongReceiver] = r.makeAction<{y: number}>('pong')

  sendName = nameSender
  sendChat = chatSender
  sendMeta = metaSender
  sendReq = reqSender
  sendBlob = blobSender
  sendPong = pongSender

  // ---- incoming actions ----
  nameReceiver((name, peerId) => {
    useOS.getState().upsertPeer(peerId, String(name))
  })

  chatReceiver((msg, peerId) => {
    if (!msg || typeof msg !== 'object') return
    useOS.getState().addMessage({...msg, author: peerId})
  })

  metaReceiver((meta, peerId) => {
    if (!meta || typeof meta !== 'object' || !('id' in meta)) return
    if (!meta.id || !meta.name) return
    if (useOS.getState().files.some(f => f.id === meta.id)) return
    useOS.getState().addFile({
      ...meta,
      addedBy: meta.addedBy || peerId,
      addedByName: meta.addedByName || peerId.slice(0, 6),
    })
  })

  reqReceiver(async (payload, peerId) => {
    const {fileId} = payload ?? {fileId: undefined}
    if (!fileId) return
    const rec = await getFile(fileId)
    if (!rec) return
    void streamBlob(rec.blob, fileId, rec.name, peerId)
  })

  blobReceiver(async (blob, peerId, metadata) => {
    const meta = (metadata ?? {}) as {fileId?: string; name?: string}
    if (!meta.fileId || !(blob instanceof Blob)) return
    await putFile({
      id: meta.fileId,
      name: meta.name ?? 'file',
      size: blob.size,
      mime: blob.type || 'application/octet-stream',
      addedBy: peerId,
      addedByName: peerId.slice(0, 6),
      ts: Date.now(),
      blob,
    })
    finishTransfer(meta.fileId, peerId)
  })

  pongReceiver(({y}) => pongHandler?.(y))

  // ---- presence ----
  r.onPeerJoin(peerId => {
    useOS.getState().upsertPeer(peerId, '…')
    void sendName?.(useOS.getState().selfName, peerId)
    // sync the drive listing so late joiners see the shared disk
    void listFiles().then(metas => {
      for (const m of metas) void sendMeta?.(m, peerId)
    })
    useOS.getState().addMessage({
      id: nanoid(6),
      author: 'system',
      authorName: 'system',
      text: `peer ${peerId.slice(0, 6)} connected`,
      ts: Date.now(),
    })
  })

  r.onPeerLeave(peerId => {
    useOS.getState().removePeer(peerId)
    useOS.getState().addMessage({
      id: nanoid(6),
      author: 'system',
      authorName: 'system',
      text: `peer ${peerId.slice(0, 6)} disconnected`,
      ts: Date.now(),
    })
  })

  return r
}

function streamBlob(
  blob: Blob,
  fileId: string,
  name: string,
  peerId: string
): Promise<void> {
  const tid = `${fileId}:${peerId}`
  useOS.getState().upsertTransfer({
    id: tid,
    fileName: name,
    size: blob.size,
    direction: 'send',
    peerId,
    peerName: useOS.getState().peers[peerId]?.name ?? peerId.slice(0, 6),
    progress: 0,
    status: 'transferring',
  })
  return (sendBlob?.(blob, peerId, {fileId, name}, p => {
    useOS.getState().updateTransfer(tid, {progress: p})
  }) ?? Promise.resolve()).then(
    () => finishTransfer(fileId, peerId),
    () =>
      useOS.getState().updateTransfer(tid, {
        status: 'failed',
        error: 'connection lost',
      })
  )
}

export function disconnect() {
  if (room) void room.leave()
  room = null
  currentRoomId = null
}

export function sendChatMessage(text: string, attachment?: ChatMessage['attachment']) {
  const s = useOS.getState()
  const msg: ChatMessage = {
    id: nanoid(6),
    author: s.selfId,
    authorName: s.selfName,
    text,
    ts: Date.now(),
    attachment,
  }
  s.addMessage(msg)
  void sendChat?.(msg)
}

// Attach an image/video to chat: persist locally, announce via Drive metadata
// (so receivers can fetch the bytes), and link it from the chat message.
export async function sendChatAttachment(file: File, caption = '') {
  const s = useOS.getState()
  const rec = makeFileMeta(file, file.name, s.selfId, s.selfName)
  await putFile(rec)
  s.addFile({
    id: rec.id,
    name: rec.name,
    size: rec.size,
    mime: rec.mime,
    addedBy: rec.addedBy,
    addedByName: rec.addedByName,
    ts: rec.ts,
  })
  void sendMeta?.({
    id: rec.id,
    name: rec.name,
    size: rec.size,
    mime: rec.mime,
    addedBy: rec.addedBy,
    addedByName: rec.addedByName,
    ts: rec.ts,
  })
  sendChatMessage(caption, {
    fileId: rec.id,
    name: rec.name,
    mime: rec.mime,
    size: rec.size,
  })
}

export function renameSelf(name: string) {
  useOS.getState().setName(name)
  void sendName?.(name)
}

// Persist a local file into the drive and announce its metadata to the room.
export async function addFileToDrive(file: File) {
  const s = useOS.getState()
  const rec = makeFileMeta(file, file.name, s.selfId, s.selfName)
  await putFile(rec)
  s.addFile(withoutBlob(rec))
  void sendMeta?.(withoutBlob(rec))
}

// Stream the whole local file to every connected peer right now.
export async function shareFile(fileId: string) {
  const s = useOS.getState()
  const rec = await getFile(fileId)
  if (!rec) return
  await Promise.all(
    Object.keys(s.peers).map(pid => streamBlob(rec.blob, fileId, rec.name, pid))
  )
}

export function requestFile(fileId: string) {
  const s = useOS.getState()
  const f = s.files.find(x => x.id === fileId)
  if (!f) return
  s.upsertTransfer({
    id: fileId,
    fileName: f.name,
    size: f.size,
    direction: 'recv',
    peerId: f.addedBy,
    peerName: f.addedByName,
    progress: 0,
    status: 'transferring',
  })
  void sendReq?.({fileId})
}

export function finishTransfer(fileId: string, peerId: string) {
  const s = useOS.getState()
  const t = s.transfers.find(
    x => x.id === fileId || x.id === `${fileId}:${peerId}`
  )
  if (t) s.updateTransfer(t.id, {progress: 1, status: 'done'})
}

export function sendPongInput(y: number) {
  void sendPong?.({y})
}

export function receivePongInput(handler: (y: number) => void) {
  pongHandler = handler
}

export function removeSharedFile(fileId: string) {
  void deleteFile(fileId)
  useOS.getState().removeFile(fileId)
}

export function myId() {
  return selfId
}

function withoutBlob(f: {
  blob: Blob
  id: string
  name: string
  size: number
  mime: string
  addedBy: string
  addedByName: string
  ts: number
}) {
  const {blob, ...meta} = f
  void blob
  return meta
}
