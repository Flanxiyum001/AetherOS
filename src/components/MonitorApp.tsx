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

  // ambient oscilloscope (mac-friendly teal on light canvas)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let t = 0
    const draw = () => {
      const w = canvasRef.current!.width
      const h = canvasRef.current!.height
      const dark = document.documentElement.classList.contains('dark')
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = dark ? '#2c2c30' : '#f6f6f6'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = dark ? '#409cff' : '#0a84ff'
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
    <div className="space-y-3 p-3 text-[12px] text-black/80 dark:text-white/80">
      <canvas
        ref={canvasRef}
        width={480}
        height={80}
        className="w-full rounded-[10px] border border-black/[0.08] dark:border-white/10"
      />

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Room" value={room ?? '—'} />
        <Stat label="You" value={`${myId().slice(0, 10)}`} />
        <Stat label="Peers" value={String(Object.keys(peers).length)} />
        <Stat label="Drive entries" value={String(files.length)} />
        <Stat
          label="Transfers"
          value={`${transfers.filter(t => t.status === 'transferring').length} active`}
        />
        <Stat label="Bytes moved" value={formatTotal(transfers)} />
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          Connected peers
        </div>
        {Object.keys(peers).length === 0 ? (
          <p className="text-black/35 dark:text-white/35">No peers yet — share the room code</p>
        ) : (
          <div className="space-y-1">
            {Object.values(peers).map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-[10px] border border-black/[0.06] bg-[#f6f6f6]/80 px-2.5 py-1.5 dark:border-white/10 dark:bg-[#2c2c30]/80"
              >
                <span className="text-black/80 dark:text-white/80">
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  {p.name}
                </span>
                <span className="text-black/40 dark:text-white/40">{p.id.slice(0, 8)}</span>
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
    <div className="rounded-[10px] border border-black/[0.06] bg-[#f6f6f6]/80 px-2.5 py-1.5 dark:border-white/10 dark:bg-[#2c2c30]/80">
      <div className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
        {label}
      </div>
      <div className="truncate font-medium text-black/80 dark:text-white/80">{value}</div>
    </div>
  )
}

function formatTotal(transfers: {size: number; progress: number}[]) {
  const total = transfers.reduce((acc, t) => acc + t.size * t.progress, 0)
  if (total < 1024) return `${total} B`
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`
  return `${(total / 1024 / 1024).toFixed(1)} MB`
}
