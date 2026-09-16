import {useEffect, useState} from 'react'
import {AnimatePresence} from 'framer-motion'
import {useOS, APPS} from '../store'
import {getRoomId, disconnect} from '../net'
import Window from './Window'
import Dock from './Dock'
import TransferHud from './TransferHud'

export default function Desktop() {
  const windows = useOS(s => s.windows)
  const peers = useOS(s => s.peers)
  const selfName = useOS(s => s.selfName)
  const roomId = getRoomId()
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="mac-wallpaper relative h-full w-full overflow-hidden"
      onDragOver={e => e.preventDefault()}
    >
      {/* ---- menu bar ---- */}
      <div className="glass absolute inset-x-0 top-0 z-[9999] flex h-7 items-center gap-3 border-x-0 border-t-0 px-3 text-[13px] text-black/80">
        <span className="px-1.5 leading-none hover:rounded hover:bg-black/5"></span>
        <span className="font-semibold px-1.5 hover:rounded hover:bg-black/5">{roomId}</span>
        <span className="px-1.5 hover:rounded hover:bg-black/5">File</span>
        <span className="px-1.5 hover:rounded hover:bg-black/5">Edit</span>
        <span className="px-1.5 hover:rounded hover:bg-black/5">View</span>
        <span className="px-1.5 hover:rounded hover:bg-black/5">Go</span>
        <span className="px-1.5 hover:rounded hover:bg-black/5">Window</span>
        <div className="flex-1" />
        <span className="tabular-nums text-black/60">{Object.keys(peers).length + 1} online</span>
        <span className="max-w-[160px] truncate text-black/60">{selfName}</span>
        <button
          title="Leave room"
          onClick={() => {
            disconnect()
            useOS.getState().setRoomId(null)
          }}
          className="rounded px-1.5 py-0.5 hover:bg-black/5"
        >
          ⏏
        </button>
        <span className="tabular-nums">
          {clock.toLocaleDateString([], {weekday: 'short', day: 'numeric', month: 'short'})}{' '}
          {clock.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
        </span>
      </div>

      {/* ---- desktop icons (right side, like mac drive icons) ---- */}
      <div className="absolute right-4 top-10 flex flex-col gap-1">
        {APPS.map(app => (
          <button
            key={app.id}
            onClick={() => useOS.getState().openApp(app.id)}
            onDoubleClick={() => useOS.getState().openApp(app.id)}
            className="group flex w-20 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 hover:bg-white/40"
          >
            <span className="text-[28px] drop-shadow-sm transition group-hover:scale-105">
              {app.icon}
            </span>
            <span className="rounded px-1 text-[11px] leading-tight text-black/80 group-hover:bg-[var(--mac-accent)] group-hover:text-white">
              {app.label}
            </span>
          </button>
        ))}
      </div>

      {/* ---- windows ---- */}
      <AnimatePresence>
        {windows
          .filter(w => !w.minimized)
          .map(w => (
            <Window key={w.id} win={w} app={w.appId} />
          ))}
      </AnimatePresence>

      <TransferHud />
      <Dock />
    </div>
  )
}
