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
        Math.max(36, Math.min(window.innerHeight - 60, ev.clientY - dragRef.current.dy))
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
    ? {left: 0, top: 36, width: '100vw', height: 'calc(100vh - 36px - 64px)', zIndex: win.z}
    : {left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z}

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.97}}
      animate={{opacity: 1, scale: 1}}
      exit={{opacity: 0, scale: 0.97}}
      transition={{duration: 0.15}}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
      className="absolute flex flex-col overflow-hidden rounded-xl border border-cyan-500/25 bg-[#0a1220]/95 shadow-[0_8px_50px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      {/* title bar */}
      <div
        onMouseDown={onTitleBarMouseDown}
        onDoubleClick={() => toggleMaximize(win.id)}
        className="flex h-9 shrink-0 cursor-grab select-none items-center gap-2 border-b border-cyan-500/15 bg-[#0c1526] px-3 active:cursor-grabbing"
      >
        <button
          onClick={e => {
            e.stopPropagation()
            closeWindow(win.id)
          }}
          className="h-3 w-3 rounded-full bg-red-500/80 transition hover:bg-red-400"
          aria-label="close"
        />
        <button
          onClick={e => {
            e.stopPropagation()
            toggleMinimize(win.id)
          }}
          className="h-3 w-3 rounded-full bg-yellow-500/80 transition hover:bg-yellow-400"
          aria-label="minimize"
        />
        <button
          onClick={e => {
            e.stopPropagation()
            toggleMaximize(win.id)
          }}
          className="h-3 w-3 rounded-full bg-green-500/80 transition hover:bg-green-400"
          aria-label="maximize"
        />
        <span className="ml-2 truncate text-xs font-semibold tracking-wide text-slate-300">
          {win.title}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
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
