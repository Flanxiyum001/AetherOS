import {useEffect, useState} from 'react'
import {useOS, APPS} from '../store'

export default function AppSwitcher({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const openApp = useOS(s => s.openApp)
  const windows = useOS(s => s.windows)
  const [idx, setIdx] = useState(0)

  // apps that have an open window, dock order
  const targets = APPS.filter(a => windows.some(w => w.appId === a.id))

  useEffect(() => {
    if (!open) return
    setIdx(targets.length ? 0 : -1)
  }, [open, targets.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        setIdx(i => (targets.length ? (i + (e.shiftKey ? -1 : 1) + targets.length) % targets.length : 0))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, targets.length, onClose])

  useEffect(() => {
    if (open) return
    // commit selection when the overlay closes (keys released)
    const t = targets[idx]
    if (t) openApp(t.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open || targets.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="glass flex items-center gap-2 rounded-[20px] p-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
        {targets.map((a, i) => (
          <div
            key={a.id}
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-[16px] text-[38px] transition ${
              i === idx
                ? 'scale-110 bg-black/10 dark:bg-white/15'
                : 'opacity-70'
            }`}
          >
            {a.icon}
          </div>
        ))}
      </div>
    </div>
  )
}
