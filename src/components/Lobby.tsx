import {useState} from 'react'
import {nanoid} from 'nanoid'
import {motion} from 'framer-motion'
import {useOS} from '../store'
import {myId} from '../net'

export default function Lobby() {
  const setRoomId = useOS(s => s.setRoomId)
  const selfName = useOS(s => s.selfName)
  const setName = useOS(s => s.setName)
  const [joinCode, setJoinCode] = useState('')

  return (
    <div className="mac-wallpaper flex h-full w-full flex-col items-center justify-center p-6">
      {/* login-window style card */}
      <motion.div
        initial={{opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        className="glass w-full max-w-sm rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.16)]"
      >
        {/* avatar chip */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#e9edf3] to-[#d8dde6] text-2xl shadow-inner">
            👤
          </div>
        </div>

        <h1 className="text-center text-[15px] font-semibold text-black/85 dark:text-white/90">
          {selfName}
        </h1>
        <p className="mb-6 text-center text-[12px] text-black/50 dark:text-white/50">
          Aether · P2P Desktop
        </p>

        <label className="mb-1 block text-[11px] font-medium text-black/50 dark:text-white/50">
          Handle
        </label>
        <input
          value={selfName}
          onChange={e => setName(e.target.value.slice(0, 24))}
          className="mb-4 w-full rounded-lg border border-black/10 bg-white/80 px-3 py-1.5 text-[13px] text-black/85 outline-none focus:border-[var(--mac-accent)] focus:ring-2 focus:ring-[var(--mac-accent)]/25 dark:border-white/15 dark:bg-[#1c1c1e]/80 dark:text-white/90"
        />

        <button
          onClick={() => setRoomId(nanoid(6))}
          className="mac-press mb-5 w-full rounded-lg bg-[var(--mac-accent)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          Create New Machine
        </button>

        <div className="mb-4 flex items-center gap-3 text-[11px] font-medium text-black/35 dark:text-white/35">
          <span className="h-px flex-1 bg-black/10 dark:bg-white/15" /> or join a friend{' '}
          <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            if (joinCode.trim()) setRoomId(joinCode.trim().toLowerCase())
          }}
          className="flex gap-2"
        >
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Room code"
            className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-1.5 text-[13px] text-black/85 outline-none focus:border-[var(--mac-accent)] focus:ring-2 focus:ring-[var(--mac-accent)]/25 dark:border-white/15 dark:bg-[#1c1c1e]/80 dark:text-white/90"
          />
          <button
            type="submit"
            className="mac-press rounded-lg border border-black/10 bg-white/70 px-4 py-1.5 text-[13px] font-medium text-black/75 transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20"
          >
            Join
          </button>
        </form>

        <p className="mt-6 text-center text-[10.5px] leading-relaxed text-black/40 dark:text-white/40">
          {myId().slice(0, 8)} · All traffic flows directly browser↔browser over
          WebRTC — no server, no account, no trace.
        </p>
      </motion.div>
    </div>
  )
}
