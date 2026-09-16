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
      className="grid-bg relative h-full w-full overflow-hidden bg-[#050810]"
      onDragOver={e => e.preventDefault()}
    >
      {/* top menu bar */}
      <div className="absolute inset-x-0 top-0 z-[9999] flex h-9 items-center gap-4 border-b border-cyan-500/15 bg-[#070d1a]/90 px-4 text-xs text-slate-300 backdrop-blur">
        <span className="font-bold tracking-widest text-cyan-300">◈ AETHER</span>
        <span className="text-slate-500">room:{roomId}</span>
        <span className="text-slate-500">
          {selfName} · {Object.keys(peers).length + 1} online
        </span>
        <div className="flex-1" />
        <span className="tabular-nums text-slate-400">
          {clock.toLocaleTimeString()}
        </span>
        <button
          onClick={() => {
            disconnect()
            useOS.getState().setRoomId(null)
          }}
          className="rounded border border-slate-700 px-2 py-0.5 text-slate-400 transition hover:border-red-500/40 hover:text-red-300"
        >
          eject
        </button>
      </div>

      {/* desktop icons */}
      <div className="absolute left-4 top-14 flex flex-col gap-3">
        {APPS.map(app => (
          <button
            key={app.id}
            onDoubleClick={() => useOS.getState().openApp(app.id)}
            onClick={() => useOS.getState().openApp(app.id)}
            className="group flex w-20 flex-col items-center gap-1 rounded-lg p-2 text-center transition hover:bg-cyan-500/10"
          >
            <span className="text-3xl transition group-hover:scale-110">
              {app.icon}
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-cyan-200">
              {app.label}
            </span>
          </button>
        ))}
      </div>

      {/* windows */}
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
