import {AnimatePresence} from 'framer-motion'
import {useOS} from '../store'
import {getRoomId} from '../net'
import Window from './Window'
import Dock from './Dock'
import MenuBar from './MenuBar'
import TransferHud from './TransferHud'

export default function Desktop() {
  const windows = useOS(s => s.windows)
  const wallpaper = useOS(s => s.wallpaper)
  const customWallpaper = useOS(s => s.customWallpaper)
  const roomId = getRoomId()

  const wpClass = wallpaper === 'custom' ? '' : `wp-${wallpaper}`

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${wpClass}`}
      style={
        wallpaper === 'custom' && customWallpaper
          ? {backgroundImage: `url(${customWallpaper})`}
          : undefined
      }
      onDragOver={e => e.preventDefault()}
    >
      <MenuBar room={roomId} />

      {/* desktop icons (right side, like mac drive icons) */}
      <div className="absolute right-4 top-10 flex flex-col gap-1">
        {[
          {id: 'drive', label: 'Drive', icon: '💾'},
          {id: 'photos', label: 'Photos', icon: '🖼️'},
          {id: 'music', label: 'Music', icon: '🎵'},
          {id: 'settings', label: 'Settings', icon: '⚙️'},
        ].map(app => (
          <button
            key={app.id}
            onClick={() => useOS.getState().openApp(app.id)}
            className="group flex w-20 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 hover:bg-white/30 dark:hover:bg-white/10"
          >
            <span className="text-[28px] drop-shadow-sm transition group-hover:scale-105">
              {app.icon}
            </span>
            <span className="rounded px-1 text-[11px] leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] group-hover:bg-[var(--mac-accent)] group-hover:[text-shadow:none]">
              {app.label}
            </span>
          </button>
        ))}
      </div>

      {/* windows */}
      <AnimatePresence>
        {windows
          .filter(w => !w.minimized)
          .map(w => (
            <Window key={w.id} win={w} app={w.appId} />
          ))}
      </AnimatePresence>

      <TransferHud />
      <Dock />
    </div>
  )
}
