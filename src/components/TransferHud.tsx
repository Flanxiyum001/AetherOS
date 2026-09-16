import {useOS} from '../store'
import {formatSize} from '../drive'

export default function TransferHud() {
  const transfers = useOS(s => s.transfers)
  const clearFinished = useOS(s => s.clearFinishedTransfers)

  if (transfers.length === 0) return null

  return (
    <div className="absolute bottom-[86px] right-4 z-[9997] w-72 space-y-2">
      {transfers.slice(-4).map(t => (
        <div
          key={t.id}
          className="glass rounded-[12px] p-2.5 text-[11px] shadow-[0_8px_28px_rgba(0,0,0,0.14)]"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate font-medium text-black/80 dark:text-white/85">
              {t.direction === 'send' ? '▲' : '▼'} {t.fileName}
            </span>
            <span
              className={
                t.status === 'done'
                  ? 'text-emerald-500'
                  : t.status === 'failed'
                  ? 'text-red-500'
                  : 'text-[var(--mac-accent)]'
              }
            >
              {t.status === 'done'
                ? '✓'
                : t.status === 'failed'
                ? '✗'
                : `${Math.round(t.progress * 100)}%`}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
            <div
              className={`h-full rounded-full transition-all ${
                t.status === 'failed'
                  ? 'bg-red-500'
                  : t.status === 'done'
                  ? 'bg-emerald-500'
                  : 'bg-[var(--mac-accent)]'
              }`}
              style={{width: `${Math.round(t.progress * 100)}%`}}
            />
          </div>
          <div className="mt-1 flex justify-between text-black/45 dark:text-white/45">
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
          className="glass mac-press w-full rounded-[10px] py-1 text-[10.5px] font-medium text-black/55 transition hover:text-black/80"
        >
          Clear finished
        </button>
      )}
    </div>
  )
}
