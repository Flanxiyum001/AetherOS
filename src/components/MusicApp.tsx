import {useEffect, useMemo, useRef, useState} from 'react'
import {useOS} from '../store'
import {getFile} from '../drive'

interface Track {
  id: string
  name: string
  mime: string
  size: number
  addedByName: string
}

export default function MusicApp() {
  const files = useOS(s => s.files)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const urlRef = useRef<string | null>(null)

  const tracks: Track[] = useMemo(
    () =>
      files
        .filter(f => f.mime.startsWith('audio/'))
        .map(f => ({
          id: f.id,
          name: f.name,
          mime: f.mime,
          size: f.size,
          addedByName: f.addedByName,
        })),
    [files]
  )

  const current = tracks.find(t => t.id === currentId) ?? null

  // load blob for the selected track
  useEffect(() => {
    if (!currentId) return
    let alive = true
    getFile(currentId).then(rec => {
      if (!alive || !rec) return
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(rec.blob)
      if (audioRef.current) {
        audioRef.current.src = urlRef.current
        if (playing) void audioRef.current.play().catch(() => setPlaying(false))
      }
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    []
  )

  const toggle = async () => {
    const a = audioRef.current
    if (!a || !currentId) return
    if (a.paused) {
      await a.play().catch(() => setPlaying(false))
      setPlaying(true)
    } else {
      a.pause()
      setPlaying(false)
    }
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="flex h-full bg-white dark:bg-[#232326]">
      {/* sidebar */}
      <div className="hidden w-44 shrink-0 flex-col border-r border-black/[0.07] bg-[#f6f6f6]/70 p-3 dark:border-white/10 dark:bg-[#2c2c30]/70 sm:flex">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          Library
        </div>
        <div className="rounded-[7px] bg-black/[0.06] px-2.5 py-1.5 text-[12px] font-medium text-black/75 dark:bg-white/10 dark:text-white/85">
          ♪ All Tracks
        </div>
        <div className="mt-auto text-[10px] leading-relaxed text-black/35 dark:text-white/35">
          Audio added in Drive appears here. Playback is local — files stream
          P2P when fetched.
        </div>
      </div>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* now playing bar */}
        <div className="flex items-center gap-3 border-b border-black/[0.07] bg-[#f6f6f6]/70 px-4 py-3 dark:border-white/10 dark:bg-[#2c2c30]/70">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#fa5477] to-[#ff8a5c] text-[20px] text-white shadow-sm">
            ♪
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-black/85 dark:text-white/90">
              {current?.name ?? 'Nothing playing'}
            </div>
            <div className="truncate text-[11px] text-black/45 dark:text-white/45">
              {current ? `shared by ${current.addedByName}` : 'Pick a track below'}
            </div>
          </div>
          <button
            onClick={() => void toggle()}
            disabled={!current}
            className="mac-press flex h-9 w-9 items-center justify-center rounded-full bg-[var(--mac-accent)] text-white shadow-sm transition hover:brightness-105 disabled:opacity-30"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2.5" y="1.5" width="4" height="13" rx="1" />
                <rect x="9.5" y="1.5" width="4" height="13" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.6.1-1.6.9z" />
              </svg>
            )}
          </button>
        </div>

        {/* seek bar */}
        <div className="flex items-center gap-2 border-b border-black/[0.07] px-4 py-2 dark:border-white/10">
          <span className="w-9 text-right text-[10px] tabular-nums text-black/40 dark:text-white/40">
            {fmt(time)}
          </span>
          <input
            type="range"
            min={0}
            max={dur || 0.1}
            step={0.1}
            value={time}
            onChange={e => {
              const v = Number(e.target.value)
              setTime(v)
              if (audioRef.current) audioRef.current.currentTime = v
            }}
            className="h-1 flex-1 accent-[var(--mac-accent)]"
          />
          <span className="w-9 text-[10px] tabular-nums text-black/40 dark:text-white/40">
            {fmt(dur)}
          </span>
        </div>

        {/* track list */}
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {tracks.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-black/35 dark:text-white/35">
              No audio yet — drop audio files in Drive, or attach them in Chat.
            </p>
          ) : (
            <div className="space-y-1">
              {tracks.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentId(t.id)
                    setPlaying(true)
                  }}
                  className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-[12px] transition ${
                    t.id === currentId
                      ? 'bg-[var(--mac-accent)]/10 text-black/85 dark:text-white/90'
                      : 'text-black/70 hover:bg-black/[0.04] dark:text-white/70 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="w-5 text-center text-[11px] tabular-nums text-black/35 dark:text-white/35">
                    {t.id === currentId && playing ? '♪' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <span className="shrink-0 text-[10.5px] text-black/40 dark:text-white/40">
                    {t.addedByName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <audio
          ref={audioRef}
          onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={e => setDur(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
        />
      </div>
    </div>
  )
}
