import {useState} from 'react'
import {useOS, APPS} from '../store'

export default function Dock() {
  const openApp = useOS(s => s.openApp)
  const windows = useOS(s => s.windows)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[9998] flex justify-center pb-1.5">
      <div className="glass pointer-events-auto flex items-end gap-1 rounded-[22px] px-2.5 pb-1.5 pt-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
        {APPS.map(app => {
          const open = windows.find(w => w.appId === app.id)
          const isHovered = hovered === app.id
          const scale = isHovered ? 1.38 : hovered ? 1.12 : 1
          return (
            <button
              key={app.id}
              onClick={() => openApp(app.id)}
              onMouseEnter={() => setHovered(app.id)}
              onMouseLeave={() => setHovered(null)}
              title={app.label}
              className="mac-press relative flex origin-bottom items-end justify-center transition-transform duration-150 ease-out"
              style={{transform: `scale(${scale})`}}
            >
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] text-[26px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                style={{
                  background:
                    'linear-gradient(160deg, rgba(255,255,255,0.97), rgba(240,240,245,0.92))',
                }}
              >
                {app.icon}
              </span>
              {open && (
                <span className="absolute -bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-black/55" />
              )}
              {isHovered && (
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-white">
                  {app.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
