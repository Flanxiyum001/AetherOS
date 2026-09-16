import {useEffect, useRef, useState} from 'react'
import {getFile} from '../drive'
import {requestFile} from '../net'

export default function VoiceNote({
  fileId,
  mine,
}: {
  fileId: string
  mine: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    getFile(fileId).then(rec => {
      if (!alive) return
      if (!rec) {
        setMissing(true)
        return
      }
      objectUrl = URL.createObjectURL(rec.blob)
      setUrl(objectUrl)
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  const fetchIt = async () => {
    requestFile(fileId)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500))
      const rec = await getFile(fileId)
      if (rec) {
        setUrl(URL.createObjectURL(rec.blob))
        setMissing(false)
        return
      }
    }
  }

  // deterministic pseudo-waveform from the file id
  const bars = useRef<number[]>(
    Array.from({length: 28}, (_, i) => {
      let h = 0
      for (let c = 0; c < fileId.length; c++)
        h = (h * 31 + fileId.charCodeAt(c) + i * 7) >>> 0
      return 0.25 + ((h % 100) / 100) * 0.75
    })
  ).current

  const progress = dur > 0 ? time / dur : 0

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      void a.play()
      setPlaying(true)
    } else {
      a.pause()
      setPlaying(false)
    }
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="mb-1 min-w-[220px]">
      {url ? (
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggle}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              mine ? 'bg-white/25 hover:bg-white/35' : 'bg-black/10 hover:bg-black/15 dark:bg-white/15 dark:hover:bg-white/25'
            }`}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <div className="flex h-7 flex-1 items-center gap-[2px]">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-colors ${
                  i / bars.length <= progress
                    ? mine
                      ? 'bg-white'
                      : 'bg-[var(--mac-accent)]'
                    : mine
                    ? 'bg-white/40'
                    : 'bg-black/20 dark:bg-white/25'
                }`}
                style={{height: `${Math.round(h * 100)}%`}}
              />
            ))}
          </div>
          <span
            className={`shrink-0 text-[10px] tabular-nums ${
              mine ? 'text-white/75' : 'text-black/45 dark:text-white/45'
            }`}
          >
            {fmt(time)}/{fmt(dur)}
          </span>
          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={e => setDur(e.currentTarget.duration)}
            onEnded={() => {
              setPlaying(false)
              setTime(0)
            }}
          />
        </div>
      ) : missing ? (
        <button
          onClick={() => void fetchIt()}
          className={`flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[12px] font-medium ${
            mine
              ? 'bg-white/20 hover:bg-white/30'
              : 'bg-black/[0.06] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20'
          }`}
        >
          ⬇︎ Voice message
        </button>
      ) : (
        <div className="flex h-9 items-center text-[12px] opacity-50">Loading…</div>
      )}
    </div>
  )
}
