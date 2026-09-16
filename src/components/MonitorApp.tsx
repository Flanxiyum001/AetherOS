import {useEffect, useRef} from 'react'
import {useOS} from '../store'
import {getRoomId, myId} from '../net'

export default function MonitorApp() {
  const peers = useOS(s => s.peers)
  const files = useOS(s => s.files)
  const transfers = useOS(s => s.transfers)
  const room = getRoomId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  // ambient oscilloscope
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let t = 0
    const draw = () => {
      const w = canvasRef.current!.width
      const h = canvasRef.current!.height
      ctx.fillStyle = '#040a12'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = 0; x < w; x++) {
        const y =
          h / 2 +
          Math.sin(x * 0.05 + t) * 14 * Math.sin(t * 0.3 + x * 0.01) +
          (Object.keys(peers).length ? Math.sin(x * 0.12 + t * 2) * 4 : 0)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      t += 0.06
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [peers])

  return (
    <div className="space-y-3 p-3 text-xs">
      <canvas ref={canvasRef} width={480} height={80} className="w-full rounded border border-cyan-500/20" />

      <div className="grid grid-cols-2 gap-2">
        <Stat label="room" value={room ?? '—'} />
        <Stat label="you" value={`${myId().slice(0, 10)}`} />
        <Stat label="peers" value={String(Object.keys(peers).length)} />
        <Stat label="drive entries" value={String(files.length)} />
        <Stat
          label="transfers"
          value={`${transfers.filter(t => t.status === 'transferring').length} active`}
        />
        <Stat
          label="bytes moved"
          value={formatTotal(transfers)}
        />
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
          connected peers
        </div>
        {Object.keys(peers).length === 0 ? (
          <p className="text-slate-600">no peers yet — share the room code</p>
        ) : (
          <div className="space-y-1">
            {Object.values(peers).map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded border border-slate-800 bg-[#0b1424] px-2 py-1.5"
              >
                <span className="text-slate-300">
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  {p.name}
                </span>
                <span className="text-slate-500">
                  {p.id.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded border border-slate-800 bg-[#0b1424] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="truncate text-cyan-200">{value}</div>
    </div>
  )
}

function formatTotal(transfers: {size: number; progress: number}[]) {
  const total = transfers.reduce((acc, t) => acc + t.size * t.progress, 0)
  if (total < 1024) return `${total} B`
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`
  return `${(total / 1024 / 1024).toFixed(1)} MB`
}
