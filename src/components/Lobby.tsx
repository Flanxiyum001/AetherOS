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
    <div className="grid-bg flex h-full w-full items-center justify-center bg-[#050810] p-6">
      <motion.div
        initial={{opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        className="w-full max-w-md rounded-xl border border-cyan-500/20 bg-[#0a1220]/80 p-8 shadow-[0_0_60px_rgba(34,211,238,0.15)] backdrop-blur"
      >
        <h1 className="glow-text mb-1 text-3xl font-bold tracking-tight text-cyan-200">
          Aether OS
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          a serverless p2p desktop in your browser
        </p>

        <label className="mb-1 block text-xs uppercase tracking-widest text-slate-500">
          your handle
        </label>
        <input
          value={selfName}
          onChange={e => setName(e.target.value.slice(0, 24))}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-[#060c18] px-3 py-2 font-mono text-cyan-100 outline-none focus:border-cyan-400/60"
        />

        <button
          onClick={() => setRoomId(nanoid(6))}
          className="mb-6 w-full rounded-lg bg-cyan-500/90 px-4 py-2.5 font-semibold text-[#04121a] transition hover:bg-cyan-400"
        >
          ⚡ Create new machine
        </button>

        <div className="mb-2 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
          <span className="h-px flex-1 bg-slate-700" /> or join a friend{' '}
          <span className="h-px flex-1 bg-slate-700" />
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
            placeholder="room code"
            className="w-full rounded-lg border border-slate-700 bg-[#060c18] px-3 py-2 font-mono text-cyan-100 outline-none focus:border-cyan-400/60"
          />
          <button
            type="submit"
            className="rounded-lg border border-cyan-500/40 px-4 py-2 text-cyan-300 transition hover:bg-cyan-500/10"
          >
            Join
          </button>
        </form>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-600">
          your peer id: <span className="text-slate-500">{myId()}</span> · all
          traffic flows directly browser↔browser over WebRTC — there is no
          server, no account, no trace.
        </p>
      </motion.div>
    </div>
  )
}
