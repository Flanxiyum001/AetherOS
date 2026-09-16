import {useEffect, useRef, useState} from 'react'
import {motion} from 'framer-motion'
import {useOS} from '../store'
import {disconnect} from '../net'

const leaveRoom = () => {
  disconnect()
  useOS.getState().setRoomId(null)
}

type Menu = 'apple' | 'room' | 'file' | 'edit' | 'view' | 'go' | 'window'

export default function MenuBar({room}: {room: string | null}) {
  const windows = useOS(s => s.windows)
  const theme = useOS(s => s.theme)
  const setTheme = useOS(s => s.setTheme)
  const openApp = useOS(s => s.openApp)
  const [open, setOpen] = useState<Menu | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  const focusTop = () => {
    const top = [...windows].sort((a, b) => b.z - a.z)[0]
    return top
  }

  const menuAnim = {
    initial: {opacity: 0, scale: 0.96, y: -4},
    animate: {opacity: 1, scale: 1, y: 0},
    exit: {opacity: 0, scale: 0.97, y: -3},
    transition: {duration: 0.12, ease: 'easeOut' as const},
  }

  const Menu = ({
    children,
    width = 'w-56',
  }: {
    children: React.ReactNode
    width?: string
  }) => (
    <motion.div
      {...menuAnim}
      className={`glass absolute left-0 top-7 ${width} rounded-[8px] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.22)]`}
    >
      {children}
    </motion.div>
  )

  const Item = ({
    onClick,
    children,
    disabled,
  }: {
    onClick?: () => void
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button
      disabled={disabled}
      onClick={() => {
        onClick?.()
        setOpen(null)
      }}
      className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-[5px] text-left text-[13px] text-black/85 enabled:hover:bg-[var(--mac-accent)] enabled:hover:text-white disabled:opacity-35 dark:text-white/85"
    >
      {children}
    </button>
  )

  const Sep = () => <div className="mx-2 my-1 h-px bg-black/10 dark:bg-white/15" />

  const menus: Record<Menu, string> = {
    apple: '',
    room: room ?? 'Room',
    file: 'File',
    edit: 'Edit',
    view: 'View',
    go: 'Go',
    window: 'Window',
  }

  return (
    <div
      ref={barRef}
      className="glass absolute inset-x-0 top-0 z-[9999] flex h-7 items-center gap-0.5 border-x-0 border-t-0 px-2 text-[13px] text-black/80 dark:text-white/80"
    >
      {/*  menu */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'apple' ? null : 'apple')}
          className={`rounded px-2 py-0.5 text-[15px] leading-none hover:bg-black/10 dark:hover:bg-white/10 ${open === 'apple' ? 'bg-black/10 dark:bg-white/10' : ''}`}
        >
        </button>
        {open === 'apple' && (
          <div className="glass absolute left-0 top-7 w-56 rounded-[8px] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
            <Item onClick={() => openApp('settings')}>About This Machine</Item>
            <Sep />
            <Item onClick={() => openApp('settings')}>System Settings…</Item>
            <Sep />
            <Item onClick={leaveRoom}>Leave Room</Item>
          </div>
        )}
      </div>

      {(Object.keys(menus) as Menu[]).map(m =>
        m === 'apple' ? null : (
          <div key={m} className="relative">
            <button
              onClick={() => setOpen(open === m ? null : m)}
              className={`rounded px-2 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 ${open === m ? 'bg-black/10 dark:bg-white/10' : ''} ${m === 'room' ? 'font-semibold' : ''}`}
            >
              {menus[m]}
            </button>

            {open === m && m === 'room' && (
              <Menu width="w-52">
                <Item onClick={() => navigator.clipboard?.writeText(room ?? '')}>
                  Copy Room Code
                </Item>
                <Sep />
                <Item onClick={() => openApp('monitor')}>Room Monitor</Item>
              </Menu>
            )}

            {open === m && m === 'file' && (
              <Menu width="w-52">
                <Item onClick={() => openApp('drive')}>New Drive Window</Item>
                <Item onClick={() => openApp('chat')}>New Chat Window</Item>
                <Sep />
                <Item onClick={() => focusTop() && useOS.getState().closeWindow(focusTop()!.id)} disabled={!focusTop()}>
                  Close Window
                </Item>
              </Menu>
            )}

            {open === m && m === 'edit' && (
              <Menu width="w-44">
                <Item onClick={() => document.execCommand?.('undo')}>Undo</Item>
                <Item onClick={() => document.execCommand?.('redo')}>Redo</Item>
                <Sep />
                <Item onClick={() => document.execCommand?.('cut')}>Cut</Item>
                <Item onClick={() => document.execCommand?.('copy')}>Copy</Item>
                <Item onClick={() => document.execCommand?.('paste')}>Paste</Item>
              </Menu>
            )}

            {open === m && m === 'view' && (
              <Menu width="w-52">
                <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                  Appearance
                </div>
                <Item onClick={() => setTheme('light')}>
                  <span className="w-4 text-center">{theme === 'light' ? '✓' : ''}</span> Light
                </Item>
                <Item onClick={() => setTheme('dark')}>
                  <span className="w-4 text-center">{theme === 'dark' ? '✓' : ''}</span> Dark
                </Item>
                <Sep />
                <Item onClick={() => openApp('settings')}>Wallpaper…</Item>
              </Menu>
            )}

            {open === m && m === 'go' && (
              <Menu width="w-44">
                {(['chat', 'drive', 'music', 'photos', 'pong', 'terminal', 'monitor', 'settings'] as const).map(
                  id => (
                    <Item key={id} onClick={() => openApp(id)}>
                      {id === 'settings' ? 'System Settings' : id[0].toUpperCase() + id.slice(1)}
                    </Item>
                  )
                )}
              </Menu>
            )}

            {open === m && m === 'window' && (
              <Menu width="w-52">
                {windows.length === 0 ? (
                  <div className="px-2.5 py-1.5 text-[13px] text-black/35 dark:text-white/35">
                    No open windows
                  </div>
                ) : (
                  windows.map(w => (
                    <Item
                      key={w.id}
                      onClick={() => {
                        useOS.getState().focusWindow(w.id)
                        if (w.minimized) useOS.getState().toggleMinimize(w.id)
                      }}
                    >
                      {w.title}
                    </Item>
                  ))
                )}
              </Menu>
            )}
          </div>
        )
      )}

      <div className="flex-1" />
      <span className="tabular-nums text-black/60 dark:text-white/60">
        {useOS.getState().selfName}
      </span>
      <Clock />
    </div>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="tabular-nums">
      {now.toLocaleDateString([], {weekday: 'short', day: 'numeric', month: 'short'})}{' '}
      {now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
    </span>
  )
}
