import {create} from 'zustand'
import {nanoid} from 'nanoid'

export type UserId = string

export type ChatMessage = {
  id: string
  author: UserId
  authorName: string
  text: string
  ts: number
  /** attached media: stored in the local drive under this file id */
  attachment?: {fileId: string; name: string; mime: string; size: number}
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
  avatar?: string
  connectedAt: number
}

export type Theme = 'light' | 'dark'
export type WallpaperId = 'sonoma' | 'ventura' | 'dune' | 'graphite' | 'midnight' | 'custom'

export const WALLPAPERS: {id: Exclude<WallpaperId, 'custom'>; label: string}[] = [
  {id: 'sonoma', label: 'Sonoma'},
  {id: 'ventura', label: 'Ventura'},
  {id: 'dune', label: 'Dune'},
  {id: 'graphite', label: 'Graphite'},
  {id: 'midnight', label: 'Midnight'},
]

/** avatar choices shown in the Lobby and System Settings */
export const AVATARS = [
  '👤', '🐱', '🐶', '🦊', '🐼', '🐸', '🐵', '🦉', '🐙', '🦄',
  '🐝', '🐧', '🌵', '🌻', '🍀', '🍕', '👾', '🚀', '⭐', '🎧',
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('aether:' + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem('aether:' + key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — appearance just won't persist */
  }
}

function applyThemeClass(t: Theme) {
  if (typeof document !== 'undefined')
    document.documentElement.classList.toggle('dark', t === 'dark')
}

/** debounced per-app window-position persistence (mac reopens windows where
 *  you left them); write is deferred so mousemove drags don't hammer storage */
const posTimers: Record<string, ReturnType<typeof setTimeout>> = {}
function schedulePosSave(appId: string) {
  clearTimeout(posTimers[appId])
  posTimers[appId] = setTimeout(() => {
    const w = useOS.getState().windows.find(w => w.appId === appId)
    if (w && !w.maximized) save('pos:' + appId, {x: w.x, y: w.y, w: w.w, h: w.h})
  }, 350)
}

const initialTheme = load<Theme>('theme', 'light')
applyThemeClass(initialTheme)

interface OSState {
  // identity
  selfId: UserId
  selfName: string
  selfAvatar: string
  setName: (n: string) => void
  setAvatar: (a: string) => void

  // room
  roomId: string | null
  setRoomId: (id: string | null) => void

  // peers
  peers: Record<UserId, PeerInfo>
  upsertPeer: (id: UserId, name: string, avatar?: string) => void
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

  // appearance
  theme: Theme
  setTheme: (t: Theme) => void
  wallpaper: WallpaperId
  customWallpaper: string | null
  setWallpaper: (w: WallpaperId) => void
  setCustomWallpaper: (dataUrl: string | null) => void

  // session
  booted: boolean
  setBooted: (b: boolean) => void

  // dock feedback: appId currently doing its launch bounce
  bouncingApp: string | null
}

export const APPS = [
  {id: 'chat', label: 'Messages', icon: '💬'},
  {id: 'drive', label: 'Drive', icon: '💾'},
  {id: 'music', label: 'Music', icon: '🎵'},
  {id: 'photos', label: 'Photos', icon: '🖼️'},
  {id: 'notes', label: 'Notes', icon: '📝'},
  {id: 'calc', label: 'Calculator', icon: '🧮'},
  {id: 'calendar', label: 'Calendar', icon: '📅'},
  {id: 'pong', label: 'Pong', icon: '🏓'},
  {id: 'terminal', label: 'Terminal', icon: '⌨️'},
  {id: 'monitor', label: 'Monitor', icon: '📡'},
  {id: 'call', label: 'Call', icon: '📞'},
  {id: 'settings', label: 'Settings', icon: '⚙️'},
] as const

const DEFAULT_W = 560
const DEFAULT_H = 400

export const useOS = create<OSState>((set, get) => ({
  selfId: nanoid(10),
  selfName: 'anon-' + Math.floor(1000 + Math.random() * 9000),
  selfAvatar: load<string>('avatar', '👤'),
  setName: n => set({selfName: n}),
  setAvatar: a => {
    save('avatar', a)
    set({selfAvatar: a})
  },

  roomId: null,
  setRoomId: id => set({roomId: id}),

  peers: {},
  upsertPeer: (id, name, avatar) =>
    set(s => {
      const prev = s.peers[id]
      return {
        peers: {
          ...s.peers,
          [id]: {
            id,
            name: name ?? prev?.name ?? '…',
            avatar: avatar ?? prev?.avatar,
            connectedAt: prev?.connectedAt ?? Date.now(),
          },
        },
      }
    }),
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
    // dock launch bounce (mac-style feedback)
    set({bouncingApp: appId})
    setTimeout(() => {
      if (get().bouncingApp === appId) set({bouncingApp: null})
    }, 700)

    const existing = get().windows.find(w => w.appId === appId)
    if (existing) {
      get().focusWindow(existing.id)
      if (existing.minimized) get().toggleMinimize(existing.id)
      return
    }
    const n = get().windows.length
    const z = get().zTop + 1
    // mac behaviour: reopen the window where it was last dragged/resized
    const saved = load<{x: number; y: number; w: number; h: number} | null>(
      'pos:' + appId,
      null
    )
    const maxW = window.innerWidth - 40
    const maxH = window.innerHeight - 120
    const w = Math.min(saved?.w ?? DEFAULT_W, Math.max(280, maxW))
    const h = Math.min(saved?.h ?? DEFAULT_H, Math.max(180, maxH))
    const x = Math.min(
      saved?.x ?? 80 + ((n * 32) % 200),
      Math.max(0, window.innerWidth - 100)
    )
    const y = Math.min(
      saved?.y ?? 70 + ((n * 28) % 160),
      Math.max(28, window.innerHeight - 60)
    )
    set(s => ({
      windows: [
        ...s.windows,
        {
          id: nanoid(6),
          appId,
          title: APPS.find(a => a.id === appId)?.label ?? appId,
          x,
          y,
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
  moveWindow: (id, x, y) => {
    set(s => ({
      windows: s.windows.map(w => (w.id === id ? {...w, x, y} : w)),
    }))
    const appId = get().windows.find(w => w.id === id)?.appId
    if (appId) schedulePosSave(appId)
  },
  resizeWindow: (id, newW, newH) => {
    set(s => ({
      windows: s.windows.map(w => (w.id === id ? {...w, w: newW, h: newH} : w)),
    }))
    const appId = get().windows.find(w => w.id === id)?.appId
    if (appId) schedulePosSave(appId)
  },

  theme: initialTheme,
  setTheme: t => {
    applyThemeClass(t)
    save('theme', t)
    set({theme: t})
  },

  wallpaper: load<WallpaperId>('wallpaper', 'sonoma'),
  customWallpaper: load<string | null>('customWallpaper', null),
  setWallpaper: w => {
    save('wallpaper', w)
    set({wallpaper: w})
  },
  setCustomWallpaper: dataUrl => {
    save('customWallpaper', dataUrl)
    set({customWallpaper: dataUrl})
  },

  booted: false,
  setBooted: b => set({booted: b}),

  bouncingApp: null,
}))
