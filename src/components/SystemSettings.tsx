import {useRef} from 'react'
import {useOS, WALLPAPERS} from '../store'
import {myId, getRoomId} from '../net'

export default function SystemSettings() {
  const theme = useOS(s => s.theme)
  const setTheme = useOS(s => s.setTheme)
  const wallpaper = useOS(s => s.wallpaper)
  const setWallpaper = useOS(s => s.setWallpaper)
  const customWallpaper = useOS(s => s.customWallpaper)
  const setCustomWallpaper = useOS(s => s.setCustomWallpaper)
  const selfName = useOS(s => s.selfName)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickCustom = (file: File | undefined | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setCustomWallpaper(dataUrl)
      setWallpaper('custom')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="h-full overflow-auto bg-[#f2f2f4] p-4 dark:bg-[#1e1e20]">
      {/* ---------- Appearance ---------- */}
      <Section title="Appearance">
        <div className="flex gap-4">
          {(['light', 'dark'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-[52px] w-[84px] items-center justify-center overflow-hidden rounded-[8px] border-2 transition ${
                  theme === t
                    ? 'border-[var(--mac-accent)] shadow-[0_0_0_3px_rgba(10,132,255,0.25)]'
                    : 'border-transparent group-hover:border-black/20'
                }`}
                style={{
                  background:
                    t === 'light'
                      ? 'linear-gradient(150deg,#fafafa,#e8eaf0)'
                      : 'linear-gradient(150deg,#1a1a1e,#101014)',
                }}
              >
                <span
                  className={`h-8 w-12 rounded-[4px] shadow-sm ${t === 'light' ? 'bg-white' : 'bg-[#2c2c30]'}`}
                />
              </span>
              <span
                className={`text-[12px] font-medium ${
                  theme === t ? 'text-[var(--mac-accent)]' : 'text-black/60 dark:text-white/60'
                }`}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ---------- Wallpaper ---------- */}
      <Section title="Wallpaper">
        <div className="grid grid-cols-5 gap-2.5">
          {WALLPAPERS.map(w => (
            <button
              key={w.id}
              onClick={() => setWallpaper(w.id)}
              className="group flex flex-col items-center gap-1"
            >
              <span
                className={`wp-${w.id} h-[46px] w-full rounded-[7px] border-2 transition ${
                  wallpaper === w.id
                    ? 'border-[var(--mac-accent)] shadow-[0_0_0_3px_rgba(10,132,255,0.25)]'
                    : 'border-black/10 group-hover:border-black/25 dark:border-white/15'
                }`}
              />
              <span
                className={`text-[11px] ${
                  wallpaper === w.id
                    ? 'font-medium text-[var(--mac-accent)]'
                    : 'text-black/55 dark:text-white/55'
                }`}
              >
                {w.label}
              </span>
            </button>
          ))}
          {/* custom wallpaper tile */}
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              pickCustom(e.dataTransfer.files?.[0])
            }}
            className="group flex flex-col items-center gap-1"
          >
            <span
              className={`relative flex h-[46px] w-full items-center justify-center overflow-hidden rounded-[7px] border-2 border-dashed transition ${
                wallpaper === 'custom'
                  ? 'border-[var(--mac-accent)] shadow-[0_0_0_3px_rgba(10,132,255,0.25)]'
                  : 'border-black/25 group-hover:border-black/40 dark:border-white/30'
              }`}
              style={
                customWallpaper && wallpaper === 'custom'
                  ? {backgroundImage: `url(${customWallpaper})`, backgroundSize: 'cover'}
                  : undefined
              }
            >
              {!customWallpaper && (
                <span className="text-[18px] text-black/40 dark:text-white/40">＋</span>
              )}
            </span>
            <span
              className={`text-[11px] ${
                wallpaper === 'custom'
                  ? 'font-medium text-[var(--mac-accent)]'
                  : 'text-black/55 dark:text-white/55'
              }`}
            >
              Custom
            </span>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            pickCustom(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="mac-press rounded-[7px] bg-[var(--mac-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:brightness-105"
          >
            Choose Image…
          </button>
          {customWallpaper && (
            <button
              onClick={() => {
                setCustomWallpaper(null)
                setWallpaper('sonoma')
              }}
              className="mac-press rounded-[7px] border border-black/15 bg-white px-3 py-1.5 text-[12px] font-medium text-black/70 transition hover:bg-black/5 dark:border-white/15 dark:bg-white/10 dark:text-white/75"
            >
              Remove Custom
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
          Your image is stored locally in this browser only — never uploaded.
        </p>
      </Section>

      {/* ---------- About ---------- */}
      <Section title="About This Machine">
        <dl className="space-y-1.5 text-[12px]">
          <Row k="Name" v={selfName} />
          <Row k="Peer ID" v={myId()} />
          <Row k="Room" v={getRoomId() ?? '—'} />
          <Row k="OS" v="Aether OS 1.0 (P2P)" />
          <Row k="Network" v="WebRTC · Nostr signaling" />
        </dl>
      </Section>
    </div>
  )
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[13px] font-semibold text-black/80 dark:text-white/80">{title}</h2>
      <div className="rounded-[10px] border border-black/[0.06] bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#2a2a2e]">
        {children}
      </div>
    </section>
  )
}

function Row({k, v}: {k: string; v: string}) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-black/45 dark:text-white/45">{k}</dt>
      <dd className="min-w-0 truncate font-medium text-black/80 dark:text-white/80">{v}</dd>
    </div>
  )
}
