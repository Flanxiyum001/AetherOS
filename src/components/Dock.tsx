import {useOS, APPS} from '../store'

export default function Dock() {
  const openApp = useOS(s => s.openApp)
  const windows = useOS(s => s.windows)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[9998] flex justify-center pb-3">
      <div className="pointer-events-auto flex gap-2 rounded-2xl border border-cyan-500/20 bg-[#0a1220]/90 px-3 py-2 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur">
        {APPS.map(app => {
          const open = windows.find(w => w.appId === app.id)
          return (
            <button
              key={app.id}
              onClick={() => openApp(app.id)}
              title={app.label}
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-xl transition hover:scale-110 hover:bg-cyan-500/10 ${
                open && !open.minimized ? 'bg-cyan-500/15' : ''
              }`}
            >
              {app.icon}
              {open && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-cyan-300" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
