import {useRef} from 'react'
import {motion} from 'framer-motion'
import {useOS, type WindowState} from '../store'
import ChatApp from './ChatApp'
import DriveApp from './DriveApp'
import TerminalApp from './TerminalApp'
import PongApp from './PongApp'
import MonitorApp from './MonitorApp'

const COMPONENTS: Record<string, () => JSX.Element> = {
  chat: ChatApp,
  drive: DriveApp,
  terminal: TerminalApp,
  pong: PongApp,
  monitor: MonitorApp,
}

const GLYPH = {
  close: 'M4 4 L10 10 M10 4 L4 10',
  min: 'M3.5 7 H10.5',
  max: 'M4.5 4.5 h4.5 a0.9 0.9 0 0 1 0.9 0.9 v4.5 a0.9 0.9 0 0 1 -0.9 0.9 h-4.5 a0.9 0.9 0 0 1 -0.9 -0.9 v-4.5 a0.9 0.9 0 0 1 0.9 -0.9 z',
}

export default function Window({win, app}: {win: WindowState; app: string}) {
  const focusWindow = useOS(s => s.focusWindow)
  const closeWindow = useOS(s => s.closeWindow)
  const toggleMinimize = useOS(s => s.toggleMinimize)
  const toggleMaximize = useOS(s => s.toggleMaximize)
  const moveWindow = useOS(s => s.moveWindow)
  const resizeWindow = useOS(s => s.resizeWindow)
  const dragRef = useRef<{dx: number; dy: number} | null>(null)
  const resizeRef = useRef<{x: number; y: number; w: number; h: number} | null>(null)

  const Comp = COMPONENTS[app] ?? ChatApp

  const onTitleBarMouseDown = (e: React.MouseEvent) => {
    focusWindow(win.id)
    if (win.maximized) return
    dragRef.current = {dx: e.clientX - win.x, dy: e.clientY - win.y}
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      moveWindow(
        win.id,
        Math.max(0, Math.min(window.innerWidth - 100, ev.clientX - dragRef.current.dx)),
        Math.max(28, Math.min(window.innerHeight - 60, ev.clientY - dragRef.current.dy))
      )
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    focusWindow(win.id)
    resizeRef.current = {x: e.clientX, y: e.clientY, w: win.w, h: win.h}
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const r = resizeRef.current
      resizeWindow(
        win.id,
        Math.max(280, r.w + ev.clientX - r.x),
        Math.max(180, r.h + ev.clientY - r.y)
      )
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const style = win.maximized
    ? {left: 0, top: 28, width: '100vw', height: 'calc(100vh - 28px - 74px)', zIndex: win.z}
    : {left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z}

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.97}}
      animate={{opacity: 1, scale: 1}}
      exit={{opacity: 0, scale: 0.97}}
      transition={{duration: 0.15}}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
      className="mac-window absolute flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl"
    >
      {/* title bar */}
      <div
        onMouseDown={onTitleBarMouseDown}
        onDoubleClick={() => toggleMaximize(win.id)}
        className="relative flex h-[38px] shrink-0 cursor-grab select-none items-center border-b border-black/[0.07] bg-[#f6f6f6]/95 px-3 active:cursor-grabbing"
      >
        {/* traffic lights */}
        <div className="traffic-group flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation()
              closeWindow(win.id)
            }}
            className="traffic bg-[#ff5f57]"
            aria-label="close"
          >
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d={GLYPH.close} stroke="rgba(0,0,0,0.55)" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              toggleMinimize(win.id)
            }}
            className="traffic bg-[#febc2e]"
            aria-label="minimize"
          >
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d={GLYPH.min} stroke="rgba(0,0,0,0.55)" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              toggleMaximize(win.id)
            }}
            className="traffic bg-[#28c840]"
            aria-label="maximize"
          >
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d={GLYPH.max} stroke="rgba(0,0,0,0.55)" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
        </div>

        {/* centered title */}
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <span className="truncate px-6 text-[13px] font-semibold text-black/70">
            {win.title}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white">
        <Comp />
      </div>

      {!win.maximized && (
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
          aria-label="resize"
        />
      )}
    </motion.div>
  )
}
