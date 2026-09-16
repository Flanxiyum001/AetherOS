import {useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {useNotifs} from '../notify'
import {useOS} from '../store'

const APP_ICON: Record<string, string> = {
  chat: '💬',
  drive: '💾',
  music: '🎵',
  photos: '🖼️',
  pong: '🏓',
  terminal: '⌨️',
  monitor: '📡',
  settings: '⚙️',
  system: '',
}

export default function NotificationCenter() {
  const toasts = useNotifs(s => s.toasts)
  const center = useNotifs(s => s.center)
  const dismiss = useNotifs(s => s.dismiss)
  const clearCenter = useNotifs(s => s.clearCenter)
  const openApp = useOS(s => s.openApp)
  const [openPanel, setOpenPanel] = useState(false)

  const openItem = (id: string, openAppId?: string) => {
    if (openAppId) openApp(openAppId)
    dismiss(id)
  }

  return (
    <>
      {/* ---- toast stack ---- */}
      <div className="pointer-events-none absolute right-3 top-9 z-[99995] flex w-80 flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.button
              key={t.id}
              layout
              initial={{opacity: 0, x: 60, scale: 0.95}}
              animate={{opacity: 1, x: 0, scale: 1}}
              exit={{opacity: 0, x: 80, scale: 0.95}}
              transition={{type: 'spring', stiffness: 400, damping: 30}}
              onClick={() => openItem(t.id, t.open)}
              className="glass pointer-events-auto flex w-full items-start gap-2.5 rounded-[14px] p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            >
              <span className="text-[20px] leading-none">{APP_ICON[t.app] ?? '📦'}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-semibold text-black/85 dark:text-white/90">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-black/35 dark:text-white/35">
                    now
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-black/55 dark:text-white/55">
                  {t.body}
                </span>
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* ---- bell ---- */}
      <button
        title="Notifications"
        onClick={() => setOpenPanel(v => !v)}
        className="relative rounded px-1.5 py-0.5 text-[13px] hover:bg-black/10 dark:hover:bg-white/10"
      >
        🔔
        {center.length > 0 && (
          <span className="absolute -right-0.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ff453a] px-0.5 text-[9px] font-bold text-white">
            {center.length > 9 ? '9+' : center.length}
          </span>
        )}
      </button>

      {/* ---- slide-down center panel ---- */}
      <AnimatePresence>
        {openPanel && (
          <>
            <div
              className="fixed inset-0 z-[99993]"
              onClick={() => setOpenPanel(false)}
            />
            <motion.div
              initial={{opacity: 0, y: -12, scale: 0.98}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: -8, scale: 0.98}}
              transition={{duration: 0.15, ease: 'easeOut'}}
              className="glass absolute right-2 top-8 z-[99994] w-96 rounded-[14px] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-center justify-between px-1.5 pb-1.5">
                <span className="text-[12px] font-semibold text-black/60 dark:text-white/60">
                  Notification Center
                </span>
                {center.length > 0 && (
                  <button
                    onClick={clearCenter}
                    className="rounded px-1.5 py-0.5 text-[11px] text-[var(--mac-accent)] hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] space-y-1.5 overflow-auto">
                {center.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-black/35 dark:text-white/35">
                    No Notifications
                  </p>
                ) : (
                  center.map(t => (
                    <button
                      key={t.id}
                      onClick={() => openItem(t.id, t.open)}
                      className="flex w-full items-start gap-2.5 rounded-[10px] bg-white/60 p-2.5 text-left transition hover:bg-white/90 dark:bg-white/[0.07] dark:hover:bg-white/[0.14]"
                    >
                      <span className="text-[18px] leading-none">{APP_ICON[t.app] ?? '📦'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-black/85 dark:text-white/90">
                            {t.title}
                          </span>
                          <span className="shrink-0 text-[9.5px] text-black/35 dark:text-white/35">
                            {new Date(t.ts).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-black/55 dark:text-white/55">
                          {t.body}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
