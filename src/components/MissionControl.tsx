import {useEffect, useState} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import {useOS, APPS} from '../store'

/** Mission Control — all open windows at their live positions, scaled down.
 *  Click one to focus it (restoring minimized windows) and close the overlay. */
export default function MissionControl({
  open,
  onClose,
  blur,
}: {
  open: boolean
  onClose: () => void
  blur: number
}) {
  const windows = useOS(s => s.windows)
  const focusWindow = useOS(s => s.focusWindow)
  const toggleMinimize = useOS(s => s.toggleMinimize)
  const wallpaper = useOS(s => s.wallpaper)
  const customWallpaper = useOS(s => s.customWallpaper)
  const [sel, setSel] = useState(0)

  useEffect(() => {
    if (open) setSel(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSel(s => Math.min(s + 1, Math.max(0, windows.length - 1)))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSel(s => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const w = windows[sel]
        if (w) {
          focusWindow(w.id)
          if (w.minimized) toggleMinimize(w.id)
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, windows, sel, focusWindow, toggleMinimize, onClose])

  // scale factor so the whole desktop maps into the overlay
  const scale = Math.min((window.innerWidth - 140) / window.innerWidth, 0.62)

  const icon = (appId: string) => APPS.find(a => a.id === appId)?.icon ?? '🪟'
  const wpClass = wallpaper === 'custom' ? 'wp-sonoma' : `wp-${wallpaper}`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.18}}
          onClick={onClose}
          style={{backdropFilter: `blur(${blur}px)`}}
          className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/30"
        >
          <motion.div
            initial={{scale: 0.94, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            exit={{scale: 0.96, opacity: 0}}
            transition={{type: 'spring', stiffness: 420, damping: 34}}
            onClick={e => e.stopPropagation()}
            className="relative h-[62vh] w-[78vw] max-w-[1100px] overflow-hidden rounded-[18px] shadow-[0_40px_90px_rgba(0,0,0,0.45)]"
          >
            {/* ghost wallpaper backdrop so tiles read against the desktop */}
            <div
              className={`absolute inset-0 opacity-90 ${wpClass}`}
              style={
                wallpaper === 'custom' && customWallpaper
                  ? {backgroundImage: `url(${customWallpaper})`, backgroundSize: 'cover'}
                  : undefined
              }
            />

            {windows.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="rounded-xl bg-black/45 px-4 py-2 text-[13px] font-medium text-white/85">
                  No open windows
                </p>
              </div>
            ) : (
              <div className="absolute inset-0">
                {windows.map((w, i) => (
                  <motion.button
                    key={w.id}
                    initial={{opacity: 0, scale: 0.9}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{delay: i * 0.03, type: 'spring', stiffness: 380, damping: 30}}
                    onClick={() => {
                      focusWindow(w.id)
                      if (w.minimized) toggleMinimize(w.id)
                      onClose()
                    }}
                    onMouseEnter={() => setSel(i)}
                    style={{
                      left: w.x * scale + 40,
                      top: w.y * scale + 24,
                      width: w.w * scale,
                      height: w.h * scale,
                      zIndex: 10 + (w.minimized ? 0 : w.z % 1000),
                    }}
                    className={`mac-window absolute flex flex-col overflow-hidden bg-white text-left ${
                      i === sel ? 'ring-[3px] ring-[var(--mac-accent)]' : ''
                    } ${w.minimized ? 'opacity-40 saturate-50' : ''}`}
                  >
                    <div className="flex h-5 shrink-0 items-center gap-1 border-b border-black/[0.07] bg-[#f6f6f6]/95 px-1.5 dark:border-white/10 dark:bg-[#2c2c30]/95">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
                      <span className="ml-1 truncate text-[8px] font-semibold text-black/50 dark:text-white/50">
                        {w.title}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center bg-white/60 dark:bg-[#232326]">
                      <span className="text-[calc(18px+2vw)] opacity-25">{icon(w.appId)}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="absolute bottom-2.5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10.5px] font-medium text-white/85">
              Mission Control · click a window to focus · esc to exit
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
