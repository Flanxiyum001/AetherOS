import {describe, expect, it, beforeEach, vi} from 'vitest'
import {useOS, type Transfer} from './store'

const reset = () => {
  useOS.setState({
    peers: {},
    messages: [],
    files: [],
    transfers: [],
    windows: [],
    zTop: 10,
    roomId: null,
  })
}

const transfer = (over: Partial<Transfer> = {}): Transfer => ({
  id: 't1',
  fileName: 'movie.mkv',
  size: 50 * 1024 * 1024,
  direction: 'send',
  peerId: 'peerA',
  peerName: 'alice',
  progress: 0,
  status: 'transferring',
  ...over,
})

beforeEach(reset)

describe('peer presence', () => {
  it('upserts a peer with connect timestamp on first sight', () => {
    const before = Date.now()
    useOS.getState().upsertPeer('p1', 'alice')
    const p = useOS.getState().peers.p1
    expect(p.name).toBe('alice')
    expect(p.connectedAt).toBeGreaterThanOrEqual(before)
  })

  it('renames without resetting connectedAt', () => {
    useOS.getState().upsertPeer('p1', 'alice')
    const first = useOS.getState().peers.p1.connectedAt
    useOS.getState().upsertPeer('p1', 'alice2')
    expect(useOS.getState().peers.p1.name).toBe('alice2')
    expect(useOS.getState().peers.p1.connectedAt).toBe(first)
  })

  it('removePeer deletes only that peer', () => {
    useOS.getState().upsertPeer('p1', 'a')
    useOS.getState().upsertPeer('p2', 'b')
    useOS.getState().removePeer('p1')
    expect(Object.keys(useOS.getState().peers)).toEqual(['p2'])
  })
})

describe('chat + drive metadata', () => {
  it('appends messages in order', () => {
    const s = useOS.getState()
    s.addMessage({id: '1', author: 'a', authorName: 'a', text: 'hi', ts: 1})
    s.addMessage({id: '2', author: 'b', authorName: 'b', text: 'yo', ts: 2})
    expect(useOS.getState().messages.map(m => m.text)).toEqual(['hi', 'yo'])
  })

  it('tracks shared file metadata', () => {
    const s = useOS.getState()
    s.addFile({
      id: 'f1',
      name: 'a.zip',
      size: 10,
      mime: 'application/zip',
      addedBy: 'me',
      addedByName: 'me',
      ts: 1,
    })
    expect(useOS.getState().files).toHaveLength(1)
    s.removeFile('f1')
    expect(useOS.getState().files).toHaveLength(0)
  })
})

describe('transfers', () => {
  it('upsert inserts then patches by id', () => {
    const s = useOS.getState()
    s.upsertTransfer(transfer())
    expect(useOS.getState().transfers).toHaveLength(1)
    s.updateTransfer('t1', {progress: 0.5})
    expect(useOS.getState().transfers[0].progress).toBe(0.5)
    expect(useOS.getState().transfers[0].status).toBe('transferring')
  })

  it('clearFinishedTransfers keeps only active ones', () => {
    const s = useOS.getState()
    s.upsertTransfer(transfer({id: 'done', status: 'done'}))
    s.upsertTransfer(transfer({id: 'fail', status: 'failed'}))
    s.upsertTransfer(transfer({id: 'live', progress: 0.2}))
    s.clearFinishedTransfers()
    const left = useOS.getState().transfers
    expect(left.map(t => t.id)).toEqual(['live'])
  })
})

describe('window manager', () => {
  it('openApp creates a window and focusing bumps z-order', () => {
    const s = useOS.getState()
    s.openApp('chat')
    s.openApp('drive')
    const wins = useOS.getState().windows
    expect(wins).toHaveLength(2)
    expect(useOS.getState().zTop).toBe(12)

    useOS.getState().focusWindow(wins[0].id)
    const refocused = useOS.getState().windows.find(w => w.id === wins[0].id)!
    expect(refocused.z).toBe(13)
  })

  it('openApp reuses an existing window for the same app', () => {
    const s = useOS.getState()
    s.openApp('chat')
    const id = useOS.getState().windows[0].id
    s.openApp('chat')
    expect(useOS.getState().windows).toHaveLength(1)
    expect(useOS.getState().windows[0].id).toBe(id)
  })

  it('openApp un-minimizes an existing minimized window', () => {
    const s = useOS.getState()
    s.openApp('chat')
    const id = useOS.getState().windows[0].id
    useOS.getState().toggleMinimize(id)
    expect(useOS.getState().windows[0].minimized).toBe(true)
    s.openApp('chat')
    expect(useOS.getState().windows[0].minimized).toBe(false)
  })

  it('move/resize clamp is the caller’s job but state applies exactly', () => {
    const s = useOS.getState()
    s.openApp('chat')
    const id = useOS.getState().windows[0].id
    s.moveWindow(id, 120, 80)
    s.resizeWindow(id, 640, 480)
    const w = useOS.getState().windows[0]
    expect(w.x).toBe(120)
    expect(w.y).toBe(80)
    expect(w.w).toBe(640)
    expect(w.h).toBe(480)
  })

  it('closeWindow removes it', () => {
    const s = useOS.getState()
    s.openApp('chat')
    const id = useOS.getState().windows[0].id
    s.closeWindow(id)
    expect(useOS.getState().windows).toHaveLength(0)
  })
})

describe('identity', () => {
  it('has a selfId and selfName assigned at store creation', () => {
    const s = useOS.getState()
    expect(s.selfId).toBeTruthy()
    expect(s.selfName).toMatch(/^anon-\d{4}$/)
  })

  it('setName updates the handle', () => {
    useOS.getState().setName('neo')
    expect(useOS.getState().selfName).toBe('neo')
  })
})

describe('message env sanity', () => {
  it('vi is available from globals', () => {
    expect(typeof vi.fn()).toBe('function')
  })
})
