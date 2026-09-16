import {useEffect, useRef, useState} from 'react'
import {AnimatePresence} from 'framer-motion'
import {useOS} from '../store'
import {getRoomId} from '../net'
import {playBoot, playTransferDone} from '../sound'
import {notify} from '../notify'
import Window from './Window'
import Dock from './Dock'
import MenuBar from './MenuBar'
import TransferHud from './TransferHud'
import Spotlight from './Spotlight'
import AppSwitcher from './AppSwitcher'
import MissionControl from './MissionControl'
import ContextMenuHost, {
  openContextMenu,
  desktopMenuEntries,
} from './ContextMenu'

export default function Desktop() {
  const windows = useOS(s => s.windows)
  const peers = useOS(s => s.peers)
  const messages = useOS(s => s.messages)
  const selfId = useOS(s => s.selfId)
  const transfers = useOS(s => s.transfers)
  const wallpaper = useOS(s => s.wallpaper)
  const customWallpaper = useOS(s => s.customWallpaper)
  const roomId = getRoomId()
  const [spotlight, setSpotlight] = useState(false)
  const [switcher, setSwitcher] = useState(false)
  const [mission, setMission] = useState(false)
  const prevPeerCount = useRef(Object.keys(peers).length + 1)
  const prevMsgCount = useRef(messages.length)
  const notifiedTransfers = useRef<Set<string>>(new Set())

  // boot chime once
  useEffect(() => {
    playBoot()
  }, [])

  // peer-join notification
  useEffect(() => {
    const count = Object.keys(peers).length + 1
    if (count > prevPeerCount.current) {
      const latest = Object.values(peers).at(-1)
      if (latest)
        notify('system', 'Peer Connected', `${latest.name} joined the room`, 'chat')
    }
    prevPeerCount.current = count
  }, [peers])

  // notify on incoming chat only when the Messages window is closed or tucked away
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const m = messages[messages.length - 1]
      const chatWin = useOS.getState().windows.find(w => w.appId === 'chat')
      if (
        m &&
        m.author !== 'system' &&
        m.author !== selfId &&
        (!chatWin || chatWin.minimized)
      ) {
        notify('chat', m.authorName, m.text || '(attachment)', 'chat')
      }
    }
    prevMsgCount.current = messages.length
  }, [messages, selfId])

  // transfer outcome notifications + chime
  useEffect(() => {
    for (const t of transfers) {
      if (
        (t.status === 'done' || t.status === 'failed') &&
        !notifiedTransfers.current.has(t.id)
      ) {
        notifiedTransfers.current.add(t.id)
        notify(
          'drive',
          t.status === 'done' ? 'Transfer Complete' : 'Transfer Failed',
          `${t.fileName} · ${t.direction === 'send' ? 'to' : 'from'} ${t.peerName}`,
          'drive'
        )
        if (t.status === 'done') playTransferDone()
      }
    }
  }, [transfers])

  // global shortcuts: ⌘K spotlight, ⌘Tab switcher, F3 / ctrl+↑ Mission Control
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSpotlight(v => !v)
      } else if (e.metaKey && e.key === 'Tab') {
        e.preventDefault()
        setSwitcher(true)
      } else if (e.key === 'F3' || (e.ctrlKey && e.key === 'ArrowUp')) {
        e.preventDefault()
        setMission(v => !v)
      } else if (e.key === 'Escape') {
        setSwitcher(false)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta') setSwitcher(false)
    }
    const onMission = () => setMission(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('aether:mission-control', onMission)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('aether:mission-control', onMission)
    }
  }, [])

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        wallpaper === 'custom' ? '' : `wp-${wallpaper}`
      }`}
      style={
        wallpaper === 'custom' && customWallpaper
          ? {backgroundImage: `url(${customWallpaper})`}
          : undefined
      }
      onDragOver={e => e.preventDefault()}
      onContextMenu={e => {
        e.preventDefault()
        openContextMenu(e.clientX, e.clientY, desktopMenuEntries())
      }}
    >
      <MenuBar room={roomId} />

      {/* desktop icons (right side, like mac drive icons) */}
      <div className="absolute right-4 top-10 flex flex-col gap-1">
        {[
          {id: 'drive', label: 'Drive', icon: '💾'},
          {id: 'photos', label: 'Photos', icon: '🖼️'},
          {id: 'notes', label: 'Notes', icon: '📝'},
          {id: 'settings', label: 'Settings', icon: '⚙️'},
        ].map(app => (
          <button
            key={app.id}
            onClick={() => useOS.getState().openApp(app.id)}
            onContextMenu={e => {
              e.preventDefault()
              e.stopPropagation()
              openContextMenu(e.clientX, e.clientY, [
                {label: `Open ${app.label}`, icon: app.icon, run: () => useOS.getState().openApp(app.id)},
              ])
            }}
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
      <Spotlight open={spotlight} onClose={() => setSpotlight(false)} />
      <AppSwitcher open={switcher} onClose={() => setSwitcher(false)} />
      <MissionControl open={mission} onClose={() => setMission(false)} blur={14} />
      <ContextMenuHost />
    </div>
  )
}
