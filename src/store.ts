import {create} from 'zustand'
import {nanoid} from 'nanoid'

export type UserId = string

export type ChatMessage = {
  id: string
  author: UserId
  authorName: string
  text: string
  ts: number
}

export type DriveFileMeta = {
  id: string
  name: string
  size: number
  mime: string
  addedBy: UserId
  addedByName: string
  ts: number
}

export type TransferStatus =
  | 'pending'
  | 'transferring'
  | 'done'
  | 'failed'

export interface Transfer {
  id: string
  fileName: string
  size: number
  direction: 'send' | 'recv'
  peerId: UserId
  peerName: string
  progress: number // 0..1
  status: TransferStatus
  error?: string
}

export interface WindowState {
  id: string
  appId: string
  title: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
}

export interface PeerInfo {
  id: UserId
  name: string
  connectedAt: number
}

interface OSState {
  // identity
  selfId: UserId
  selfName: string
  setName: (n: string) => void

  // room
  roomId: string | null
  setRoomId: (id: string | null) => void

  // peers
  peers: Record<UserId, PeerInfo>
  upsertPeer: (id: UserId, name: string) => void
  removePeer: (id: UserId) => void

  // chat
  messages: ChatMessage[]
  addMessage: (m: ChatMessage) => void

  // drive
  files: DriveFileMeta[]
  setFiles: (f: DriveFileMeta[]) => void
  addFile: (f: DriveFileMeta) => void
  removeFile: (id: string) => void

  // transfers
  transfers: Transfer[]
  upsertTransfer: (t: Transfer) => void
  updateTransfer: (id: string, patch: Partial<Transfer>) => void
  clearFinishedTransfers: () => void

  // windows
  windows: WindowState[]
  zTop: number
  openApp: (appId: string) => void
  focusWindow: (id: string) => void
  closeWindow: (id: string) => void
  toggleMinimize: (id: string) => void
  toggleMaximize: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, w: number, h: number) => void

  // session
  booted: boolean
  setBooted: (b: boolean) => void
}

export const APPS = [
  {id: 'chat', label: 'Chat', icon: '💬'},
  {id: 'drive', label: 'Drive', icon: '💾'},
  {id: 'pong', label: 'Pong', icon: '🏓'},
  {id: 'terminal', label: 'Terminal', icon: '⌨️'},
  {id: 'monitor', label: 'Monitor', icon: '📡'},
] as const

const DEFAULT_W = 560
const DEFAULT_H = 400

export const useOS = create<OSState>((set, get) => ({
  selfId: nanoid(10),
  selfName: 'anon-' + Math.floor(1000 + Math.random() * 9000),
  setName: n => set({selfName: n}),

  roomId: null,
  setRoomId: id => set({roomId: id}),

  peers: {},
  upsertPeer: (id, name) =>
    set(s => ({
      peers: {
        ...s.peers,
        [id]: s.peers[id]
          ? {...s.peers[id], name}
          : {id, name, connectedAt: Date.now()},
      },
    })),
  removePeer: id =>
    set(s => {
      const peers = {...s.peers}
      delete peers[id]
      return {peers}
    }),

  messages: [],
  addMessage: m => set(s => ({messages: [...s.messages, m]})),

  files: [],
  setFiles: f => set({files: f}),
  addFile: f => set(s => ({files: [...s.files, f]})),
  removeFile: id => set(s => ({files: s.files.filter(f => f.id !== id)})),

  transfers: [],
  upsertTransfer: t =>
    set(s => {
      const i = s.transfers.findIndex(x => x.id === t.id)
      if (i === -1) return {transfers: [...s.transfers, t]}
      const transfers = [...s.transfers]
      transfers[i] = {...transfers[i], ...t}
      return {transfers}
    }),
  updateTransfer: (id, patch) =>
    set(s => ({
      transfers: s.transfers.map(t => (t.id === id ? {...t, ...patch} : t)),
    })),
  clearFinishedTransfers: () =>
    set(s => ({transfers: s.transfers.filter(t => t.status === 'transferring' || t.status === 'pending')})),

  windows: [],
  zTop: 10,
  openApp: appId => {
    const existing = get().windows.find(w => w.appId === appId)
    if (existing) {
      get().focusWindow(existing.id)
      if (existing.minimized) get().toggleMinimize(existing.id)
      return
    }
    const n = get().windows.length
    const z = get().zTop + 1
    const w = Math.min(DEFAULT_W, window.innerWidth - 40)
    const h = Math.min(DEFAULT_H, window.innerHeight - 120)
    set(s => ({
      windows: [
        ...s.windows,
        {
          id: nanoid(6),
          appId,
          title: APPS.find(a => a.id === appId)?.label ?? appId,
          x: 80 + ((n * 32) % 200),
          y: 70 + ((n * 28) % 160),
          w,
          h,
          z,
          minimized: false,
          maximized: false,
        },
      ],
      zTop: z,
    }))
  },
  focusWindow: id =>
    set(s => {
      const z = s.zTop + 1
      return {
        zTop: z,
        windows: s.windows.map(w => (w.id === id ? {...w, z} : w)),
      }
    }),
  closeWindow: id => set(s => ({windows: s.windows.filter(w => w.id !== id)})),
  toggleMinimize: id =>
    set(s => ({
      windows: s.windows.map(w =>
        w.id === id ? {...w, minimized: !w.minimized} : w
      ),
    })),
  toggleMaximize: id =>
    set(s => ({
      windows: s.windows.map(w =>
        w.id === id ? {...w, maximized: !w.maximized} : w
      ),
    })),
  moveWindow: (id, x, y) =>
    set(s => ({
      windows: s.windows.map(w => (w.id === id ? {...w, x, y} : w)),
    })),
  resizeWindow: (id, newW, newH) =>
    set(s => ({
      windows: s.windows.map(w => (w.id === id ? {...w, w: newW, h: newH} : w)),
    })),

  booted: false,
  setBooted: b => set({booted: b}),
}))
