import {useEffect, useMemo, useRef, useState} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import {useOS, APPS} from '../store'
import {notify} from '../notify'

interface Result {
  id: string
  icon: string
  title: string
  subtitle: string
  run: () => void
  kind: 'app' | 'file' | 'peer' | 'action'
}

export default function Spotlight({open, onClose}: {open: boolean; onClose: () => void}) {
  const openAppFn = useOS(s => s.openApp)
  const files = useOS(s => s.files)
  const peers = useOS(s => s.peers)
  const setTheme = useOS(s => s.setTheme)
  const theme = useOS(s => s.theme)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase()
    const match = (s: string) => s.toLowerCase().includes(query)

    const apps: Result[] = APPS.filter(a => !query || match(a.label)).map(a => ({
      id: 'app-' + a.id,
      icon: a.icon,
      title: a.label,
      subtitle: 'Application',
      kind: 'app',
      run: () => openAppFn(a.id),
    }))

    const actions: Result[] = (
      [
        ...(theme === 'light'
          ? [{icon: '🌗', title: 'Switch to Dark Mode', run: () => setTheme('dark')}]
          : [{icon: '🌞', title: 'Switch to Light Mode', run: () => setTheme('light')}]),
        {icon: '⚙️', title: 'Change Wallpaper', subtitle: 'System Settings', run: () => openAppFn('settings')},
      ] as {icon: string; title: string; subtitle?: string; run: () => void}[]
    )
      .filter(a => !query || match(a.title))
      .map(a => ({
        id: 'act-' + a.title,
        icon: a.icon!,
        title: a.title!,
        subtitle: a.subtitle ?? 'Action',
        kind: 'action' as const,
        run: a.run!,
      }))

    const fileResults: Result[] = files
      .filter(f => query && (match(f.name) || match(f.addedByName)))
      .slice(0, 6)
      .map(f => ({
        id: 'file-' + f.id,
        icon: f.mime.startsWith('audio/')
          ? '🎵'
          : f.mime.startsWith('image/')
          ? '🖼️'
          : f.mime.startsWith('video/')
          ? '🎬'
          : '📄',
        title: f.name,
        subtitle: `Drive · ${f.addedByName}`,
        kind: 'file' as const,
        run: () => openAppFn(f.mime.startsWith('image/') ? 'photos' : f.mime.startsWith('audio/') ? 'music' : 'drive'),
      }))

    const peerResults: Result[] = Object.values(peers)
      .filter(p => query && (match(p.name) || match(p.id)))
      .slice(0, 4)
      .map(p => ({
        id: 'peer-' + p.id,
        icon: '👤',
        title: p.name,
        subtitle: 'Peer · ' + p.id.slice(0, 8),
        kind: 'peer' as const,
        run: () => {
          openAppFn('chat')
          notify('chat', 'Spotlight', `Opening chat — ${p.name} is online`, 'chat')
        },
      }))

    return [...apps, ...actions, ...fileResults, ...peerResults].slice(0, 9)
  }, [q, files, peers, theme, openAppFn, setTheme])

  useEffect(() => {
    setSel(s => Math.min(s, Math.max(0, results.length - 1)))
  }, [results.length])

  const runAt = (i: number) => {
    const r = results[i]
    if (!r) return
    onClose()
    r.run()
  }

  const KIND_LABEL: Record<Result['kind'], string> = {
    app: 'Applications',
    action: 'Actions',
    file: 'Shared Files',
    peer: 'Peers',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          className="fixed inset-0 z-[100000] flex items-start justify-center bg-black/25 pt-[16vh] backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{opacity: 0, scale: 0.96, y: -8}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.97, y: -6}}
            transition={{type: 'spring', stiffness: 500, damping: 34}}
            onClick={e => e.stopPropagation()}
            className="w-[560px] max-w-[92vw] overflow-hidden rounded-[14px] shadow-[0_30px_80px_rgba(0,0,0,0.4)]"
          >
            <div className="glass flex items-center gap-2.5 border-x-0 border-t-0 px-4 py-3">
              <span className="text-[17px]">🔍</span>
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setSel(s => Math.min(s + 1, results.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setSel(s => Math.max(s - 1, 0))
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    runAt(sel)
                  } else if (e.key === 'Escape') {
                    onClose()
                  }
                }}
                placeholder="Spotlight Search"
                className="w-full bg-transparent text-[19px] font-light text-black/85 outline-none placeholder:text-black/30 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
            {results.length > 0 && (
              <div ref={listRef} className="glass max-h-[46vh] overflow-auto border-x-0 border-b-0 p-1.5">
                {results.map((r, i) => {
                  const showKind = i === 0 || results[i - 1].kind !== r.kind
                  return (
                    <div key={r.id}>
                      {showKind && (
                        <div className="px-2.5 pb-0.5 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-black/35 dark:text-white/35">
                          {KIND_LABEL[r.kind]}
                        </div>
                      )}
                      <button
                        onMouseEnter={() => setSel(i)}
                        onClick={() => runAt(i)}
                        className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left ${
                          i === sel
                            ? 'bg-[var(--mac-accent)] text-white'
                            : 'text-black/80 dark:text-white/85'
                        }`}
                      >
                        <span className="w-6 text-center text-[17px]">{r.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{r.title}</span>
                          <span
                            className={`block truncate text-[10.5px] ${
                              i === sel ? 'text-white/70' : 'text-black/40 dark:text-white/40'
                            }`}
                          >
                            {r.subtitle}
                          </span>
                        </span>
                        {i === sel && (
                          <span className={`text-[10px] ${i === sel ? 'text-white/60' : ''}`}>
            ↩
          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
