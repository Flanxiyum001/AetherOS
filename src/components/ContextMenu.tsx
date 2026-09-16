import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {useOS, APPS} from '../store'
import {playTick} from '../sound'

export interface MenuEntry {
  label: string
  icon?: string
  run?: () => void
  divider?: boolean
}

interface MenuState {
  x: number
  y: number
  entries: MenuEntry[]
}

let setMenu: ((s: MenuState | null) => void) | null = null

/** open a mac-style context menu at screen coords */
export function openContextMenu(x: number, y: number, entries: MenuEntry[]) {
  setMenu?.({x, y, entries})
}

export function closeContextMenu() {
  setMenu?.(null)
}

/** right-click handler factory for desktop surfaces */
export function onContextMenu(fn: (e: React.MouseEvent) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    fn(e)
  }
}

/** mac-style context menu: apps register builders, dock/desktop trigger it */
export default function ContextMenuHost() {
  const [state, setState] = useState<MenuState | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenu = setState
    return () => {
      setMenu = null
    }
  }, [])

  useEffect(() => {
    if (!state) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setState(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState(null)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [state])

  if (!state) return null

  // keep the menu on-screen
  const W = 210
  const x = Math.min(state.x, window.innerWidth - W - 8)
  const y = Math.min(state.y, window.innerHeight - state.entries.length * 28 - 16)

  return createPortal(
    <div
      ref={ref}
      className="glass fixed z-[100001] w-[210px] rounded-[10px] p-1 shadow-[0_16px_44px_rgba(0,0,0,0.28)]"
      style={{left: x, top: y}}
      onContextMenu={e => e.preventDefault()}
    >
      {state.entries.map((entry, i) =>
        entry.divider ? (
          <div key={i} className="mx-2 my-1 h-px bg-black/10 dark:bg-white/15" />
        ) : (
          <button
            key={i}
            onClick={() => {
              playTick()
              entry.run?.()
              setState(null)
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-[5px] text-left text-[13px] text-black/85 hover:bg-[var(--mac-accent)] hover:text-white dark:text-white/85"
          >
            {entry.icon && <span className="w-4 text-center text-[13px]">{entry.icon}</span>}
            <span>{entry.label}</span>
          </button>
        )
      )}
    </div>,
    document.body
  )
}

/** entries shown when right-clicking the desktop wallpaper */
export function desktopMenuEntries(): MenuEntry[] {
  const os = useOS.getState()
  return [
    {label: 'New Note', icon: '📝', run: () => os.openApp('notes')},
    {label: 'New Chat', icon: '💬', run: () => os.openApp('chat')},
    {label: 'Open Drive', icon: '💾', run: () => os.openApp('drive')},
    {divider: true, label: ''},
    {
      label: os.theme === 'light' ? 'Dark Appearance' : 'Light Appearance',
      icon: os.theme === 'light' ? '🌙' : '🌞',
      run: () => os.setTheme(os.theme === 'light' ? 'dark' : 'light'),
    },
    {label: 'Change Wallpaper…', icon: '🖼️', run: () => os.openApp('settings')},
    {label: 'Mission Control', icon: '🪟', run: () => window.dispatchEvent(new Event('aether:mission-control'))},
  ]
}

/** entries when right-clicking a dock icon */
export function dockMenuEntries(appId: string): MenuEntry[] {
  const os = useOS.getState()
  const win = os.windows.find(w => w.appId === appId)
  const label = APPS.find(a => a.id === appId)?.label ?? appId
  const entries: MenuEntry[] = []
  if (win) {
    if (win.minimized) {
      entries.push({
        label: 'Show',
        run: () => {
          os.focusWindow(win.id)
          if (win.minimized) os.toggleMinimize(win.id)
        },
      })
    } else {
      entries.push({label: 'Minimize', run: () => os.toggleMinimize(win.id)})
    }
    entries.push({label: 'Maximize', run: () => !win.maximized && os.toggleMaximize(win.id)})
    entries.push({divider: true, label: ''})
    entries.push({label: 'Close Window', icon: '✕', run: () => os.closeWindow(win.id)})
  } else {
    entries.push({label: 'Open', icon: '↗', run: () => os.openApp(appId)})
  }
  entries.push({divider: true, label: ''})
  entries.push({label: `About ${label}`, run: () => os.openApp('settings')})
  return entries
}
