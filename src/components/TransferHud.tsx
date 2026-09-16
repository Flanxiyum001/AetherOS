import {useOS} from '../store'
import {formatSize} from '../drive'

export default function TransferHud() {
  const transfers = useOS(s => s.transfers)
  const clearFinished = useOS(s => s.clearFinishedTransfers)

  if (transfers.length === 0) return null

  return (
    <div className="absolute bottom-20 right-4 z-[9997] w-72 space-y-2">
      {transfers.slice(-4).map(t => (
        <div
          key={t.id}
          className="rounded-lg border border-cyan-500/20 bg-[#0a1220]/95 p-2.5 text-[11px] backdrop-blur"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-slate-300">
              {t.direction === 'send' ? '▲' : '▼'} {t.fileName}
            </span>
            <span
              className={
                t.status === 'done'
                  ? 'text-emerald-400'
                  : t.status === 'failed'
                  ? 'text-red-400'
                  : 'text-cyan-300'
              }
            >
              {t.status === 'done'
                ? '✓'
                : t.status === 'failed'
                ? '✗'
                : `${Math.round(t.progress * 100)}%`}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded bg-slate-800">
            <div
              className={`h-full transition-all ${
                t.status === 'failed' ? 'bg-red-400' : 'bg-cyan-400'
              }`}
              style={{width: `${Math.round(t.progress * 100)}%`}}
            />
          </div>
          <div className="mt-1 flex justify-between text-slate-500">
            <span>
              {t.direction === 'send' ? 'to' : 'from'} {t.peerName}
            </span>
            <span>{formatSize(t.size)}</span>
          </div>
        </div>
      ))}
      {transfers.some(t => t.status === 'done' || t.status === 'failed') && (
        <button
          onClick={clearFinished}
          className="w-full rounded border border-slate-700 py-1 text-[10px] text-slate-400 transition hover:bg-slate-800/60"
        >
          clear finished
        </button>
      )}
    </div>
  )
}
