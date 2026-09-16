import {describe, expect, it, beforeEach, afterEach, vi} from 'vitest'

// ---- mock trystero before importing the module under test ----
type Handler = (data: unknown, peerId: string, metadata?: unknown) => void

interface FakeRoom {
  appId?: string
  roomId?: string
  actions: Record<string, {send: ReturnType<typeof vi.fn>; handlers: Handler[]}>
  joinHandlers: ((id: string) => void)[]
  leaveHandlers: ((id: string) => void)[]
}

const fakeRooms: FakeRoom[] = []

vi.mock('trystero', () => {
  const makeRoom = (_config: unknown, roomId: string) => {
    const r: FakeRoom = {
      roomId,
      actions: {},
      joinHandlers: [],
      leaveHandlers: [],
    }
    fakeRooms.push(r)
    const room = {
      makeAction: (ns: string) => {
        const entry = {send: vi.fn(() => Promise.resolve()), handlers: [] as Handler[]}
        r.actions[ns] = entry
        const receiver = (h: Handler) => entry.handlers.push(h)
        return [entry.send, receiver, vi.fn()] as const
      },
      onPeerJoin: (f: (id: string) => void) => r.joinHandlers.push(f),
      onPeerLeave: (f: (id: string) => void) => r.leaveHandlers.push(f),
      leave: vi.fn(() => Promise.resolve()),
      ping: vi.fn(),
      getPeers: vi.fn(() => ({})),
    }
    ;(room as unknown as {roomId: string}).roomId = roomId
    return room
  }
  return {joinRoom: makeRoom, selfId: 'self123'}
})

import {useOS} from './store'
import {
  connect,
  disconnect,
  getRoomId,
  sendChatMessage,
  renameSelf,
  finishTransfer,
  receivePongInput,
  sendPongInput,
  addFileToDrive,
  shareFile,
  requestFile,
} from './net'
import {putFile, makeFileMeta} from './drive'
import {blobToText} from './test/blobHelpers'
import {flushAsync} from './test/setup'

const room = () => fakeRooms[fakeRooms.length - 1]
const action = (ns: string) => {
  const r = room()
  if (!r?.actions[ns]) throw new Error(`action ${ns} not registered; have ${Object.keys(r?.actions ?? {})}`)
  return r.actions[ns]
}

beforeEach(async () => {
  disconnect() // reset the module-level room so connect() builds a fresh fake
  fakeRooms.length = 0
  useOS.setState({peers: {}, messages: [], files: [], transfers: [], roomId: 'room-1'})
  connect('room-1')
})
afterEach(() => {
  disconnect()
})

describe('connection', () => {
  it('records the room id and registers all actions', () => {
    expect(getRoomId()).toBe('room-1')
    for (const ns of ['name', 'chat', 'dmeta', 'dreq', 'dblob', 'pong']) {
      expect(room().actions[ns]).toBeDefined()
    }
  })

  it('reuses the same room when connecting twice to the same id', () => {
    const before = room()
    connect('room-1')
    expect(room()).toBe(before)
  })
})

describe('presence', () => {
  it('onPeerJoin registers peer, sends name, and syncs drive metadata', async () => {
    await putFile(makeFileMeta(new Blob(['x']), 'x.txt', 'self123', 'me'))
    room().joinHandlers.forEach(f => f('peerA'))
    // name announce went to the new peer
    expect(action('name').send).toHaveBeenCalledWith(expect.any(String), 'peerA')
    // metadata sync resolves asynchronously (listFiles) — flush it
    await flushAsync()
    const metaCalls = action('dmeta').send.mock.calls.filter(c => c[1] === 'peerA')
    expect(metaCalls.some(c => (c[0] as {name?: string})?.name === 'x.txt')).toBe(true)
    expect(useOS.getState().peers.peerA).toBeDefined()
  })

  it('onPeerLeave removes the peer and logs a system message', () => {
    useOS.getState().upsertPeer('peerA', 'alice')
    room().leaveHandlers.forEach(f => f('peerA'))
    expect(useOS.getState().peers.peerA).toBeUndefined()
    expect(useOS.getState().messages.at(-1)?.text).toContain('disconnected')
  })

  it('incoming name action updates the peer record', () => {
    room().joinHandlers.forEach(f => f('peerB'))
    action('name').handlers.forEach(h => h('bob', 'peerB'))
    expect(useOS.getState().peers.peerB.name).toBe('bob')
  })
})

describe('chat', () => {
  it('sendChatMessage appends locally and broadcasts', () => {
    sendChatMessage('hello mesh')
    expect(useOS.getState().messages.at(-1)?.text).toBe('hello mesh')
    expect(action('chat').send).toHaveBeenCalledTimes(1)
    expect(action('chat').send.mock.calls[0][0].text).toBe('hello mesh')
  })

  it('incoming chat is stored under the sender id', () => {
    action('chat').handlers.forEach(h => h({id: 'x', authorName: 'bob', text: 'yo', ts: 1}, 'peerB'))
    const m = useOS.getState().messages.at(-1)!
    expect(m.text).toBe('yo')
    expect(m.author).toBe('peerB')
  })

  it('renameSelf updates store and announces', () => {
    renameSelf('trinity')
    expect(useOS.getState().selfName).toBe('trinity')
    // broadcast form: send(data) with no explicit target
    expect(action('name').send).toHaveBeenCalledWith('trinity')
  })
})

describe('file streaming', () => {
  it('shareFile streams the blob to every peer with progress + metadata', async () => {
    const rec = makeFileMeta(new Blob(['abcdef']), 'a.txt', 'self123', 'me')
    await putFile(rec)
    useOS.setState(s => ({files: [...s.files, {...rec, blob: undefined as unknown as Blob}]}))
    useOS.getState().upsertPeer('peerA', 'alice')
    useOS.getState().upsertPeer('peerB', 'bob')

    await shareFile(rec.id)

    const sends = action('dblob').send.mock.calls
    expect(sends).toHaveLength(2)
    const [blob, target, meta] = sends[0]
    expect(target).toMatch(/^peer[AB]$/)
    expect(meta.fileId).toBe(rec.id)
    expect(meta.name).toBe('a.txt')
    expect(blob instanceof Blob).toBe(true)

    // progress callback updates the matching transfer row
    const onProgress = sends[0][3] as (p: number) => void
    onProgress(0.42)
    const tid = `${rec.id}:${sends[0][1]}`
    expect(useOS.getState().transfers.find(t => t.id === tid)?.progress).toBe(0.42)
  })

  it('marks transfer done when send resolves', async () => {
    const rec = makeFileMeta(new Blob(['z']), 'z.txt', 'self123', 'me')
    await putFile(rec)
    useOS.getState().upsertPeer('peerA', 'alice')
    await shareFile(rec.id)
    expect(useOS.getState().transfers[0].status).toBe('done')
    expect(useOS.getState().transfers[0].progress).toBe(1)
  })

  it('marks transfer failed when send rejects', async () => {
    action('dblob').send.mockImplementation(() => Promise.reject(new Error('ice failed')))
    const rec = makeFileMeta(new Blob(['z']), 'z.txt', 'self123', 'me')
    await putFile(rec)
    useOS.getState().upsertPeer('peerA', 'alice')
    await shareFile(rec.id)
    const t = useOS.getState().transfers[0]
    expect(t.status).toBe('failed')
    expect(t.error).toBe('connection lost')
  })

  it('incoming dblob persists the file and finishes the transfer', async () => {
    useOS.getState().upsertTransfer({
      id: 'f9',
      fileName: 'song.mp3',
      size: 3,
      direction: 'recv',
      peerId: 'peerA',
      peerName: 'alice',
      progress: 0.1,
      status: 'transferring',
    })
    const payload = new Blob(['abc'])
    for (const h of action('dblob').handlers) {
      h(payload, 'peerA', {fileId: 'f9', name: 'song.mp3'})
      // let the async persistence handler finish (IDB settles on macrotasks)
      await flushAsync()
    }
    const {getFile} = await import('./drive')
    const rec = await getFile('f9')
    expect(rec?.name).toBe('song.mp3')
    expect(await blobToText(rec!.blob)).toBe('abc')
    expect(useOS.getState().transfers.find(t => t.id === 'f9')?.status).toBe('done')
  })

  it('incoming dreq responds by streaming the local blob to the requester', async () => {
    const rec = makeFileMeta(new Blob(['serve-me']), 's.txt', 'self123', 'me')
    await putFile(rec)
    for (const h of action('dreq').handlers) {
      h({fileId: rec.id}, 'peerA')
      // let the async handler run (IDB read settles on macrotasks)
      await flushAsync()
    }
    const sends = action('dblob').send.mock.calls
    expect(sends).toHaveLength(1)
    expect(sends[0][1]).toBe('peerA')
    expect(sends[0][2].fileId).toBe(rec.id)
  })

  it('requestFile creates a recv transfer row and sends the request', () => {
    useOS.getState().addFile({
      id: 'remote1',
      name: 'remote.zip',
      size: 123,
      mime: 'application/zip',
      addedBy: 'peerA',
      addedByName: 'alice',
      ts: 1,
    })
    requestFile('remote1')
    expect(action('dreq').send).toHaveBeenCalledWith({fileId: 'remote1'})
    const t = useOS.getState().transfers.find(x => x.id === 'remote1')
    expect(t?.direction).toBe('recv')
    expect(t?.status).toBe('transferring')
  })
})

describe('addFileToDrive', () => {
  it('persists the blob, lists metadata, and announces to the room', async () => {
    const file = new File(['data!'], 'notes.txt', {type: 'text/plain'})
    await addFileToDrive(file)
    const {getFile} = await import('./drive')
    const meta = useOS.getState().files[0]
    expect(meta.name).toBe('notes.txt')
    expect(meta.addedByName).toBe(useOS.getState().selfName)
    const rec = await getFile(meta.id)
    expect(await blobToText(rec!.blob)).toBe('data!')
    expect(action('dmeta').send).toHaveBeenCalled()
  })
})

describe('pong relay', () => {
  it('sendPongInput forwards paddle position on the pong action', () => {
    receivePongInput(() => {})
    sendPongInput(123.5)
    expect(action('pong').send).toHaveBeenCalledWith({y: 123.5})
  })

  it('incoming pong reaches the registered handler', () => {
    const got: number[] = []
    receivePongInput(y => got.push(y))
    action('pong').handlers.forEach(h => h({y: 77}, 'peerA'))
    expect(got).toEqual([77])
  })
})

describe('finishTransfer', () => {
  it('completes either id form', () => {
    const s = useOS.getState()
    s.upsertTransfer({id: 'f1:peerA', fileName: 'x', size: 1, direction: 'send', peerId: 'peerA', peerName: 'a', progress: 0.5, status: 'transferring'})
    s.upsertTransfer({id: 'f2', fileName: 'y', size: 1, direction: 'recv', peerId: 'peerA', peerName: 'a', progress: 0.5, status: 'transferring'})
    finishTransfer('f1', 'peerA')
    finishTransfer('f2', 'peerA')
    const ts = useOS.getState().transfers
    expect(ts.find(t => t.id === 'f1:peerA')?.status).toBe('done')
    expect(ts.find(t => t.id === 'f2')?.status).toBe('done')
  })
})
