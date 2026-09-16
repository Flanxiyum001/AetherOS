import {useMemo, useState} from 'react'
import {motion} from 'framer-motion'
import {useOS, AVATARS} from '../store'
import {myId} from '../net'

// friendly random room codes: adjective-animal-number (memorable, typable)
const ADJ = [
  'swift', 'calm', 'bold', 'lucid', 'nova', 'amber', 'quiet', 'cosmic',
  'solar', 'lunar', 'vivid', 'noble', 'rapid', 'crisp', 'prime', 'zen',
]
const NOUN = [
  'otter', 'falcon', 'ember', 'comet', 'maple', 'cinder', 'harbor', 'meadow',
  'quartz', 'willow', 'summit', 'cobalt', 'juniper', 'drift', 'orbit', 'lantern',
]

function randomCode() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)]
  const n = NOUN[Math.floor(Math.random() * NOUN.length)]
  return `${a}-${n}-${Math.floor(Math.random() * 90 + 10)}`
}
const makeCode = randomCode

type Mode = 'create' | 'join'

export default function Lobby() {
  const setRoomId = useOS(s => s.setRoomId)
  const selfName = useOS(s => s.selfName)
  const setName = useOS(s => s.setName)
  const selfAvatar = useOS(s => s.selfAvatar)
  const setAvatar = useOS(s => s.setAvatar)
  const [mode, setMode] = useState<Mode>('create')
  const [showAvatars, setShowAvatars] = useState(false)
  const [customCode, setCustomCode] = useState('')
  const [suggestedCode, setSuggestedCode] = useState(makeCode)

  const code = mode === 'create' ? suggestedCode : customCode.trim().toLowerCase()
  const ready = useMemo(() => code.length >= 3, [code])

  const enter = () => {
    if (!ready) return
    setRoomId(code)
  }

  const inputCls =
    'w-full rounded-lg border border-black/10 bg-white/80 px-3 py-1.5 text-[13px] text-black/85 outline-none focus:border-[var(--mac-accent)] focus:ring-2 focus:ring-[var(--mac-accent)]/25 dark:border-white/15 dark:bg-[#1c1c1e]/80 dark:text-white/90'

  return (
    <div className="wp-sonoma flex h-full w-full flex-col items-center justify-center overflow-hidden p-6">
      {/* login-window style card */}
      <motion.div
        initial={{opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        transition={{type: 'spring', stiffness: 300, damping: 28}}
        className="glass w-full max-w-sm rounded-[22px] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
      >
        {/* avatar chip — tap to open picker */}
        <div className="mb-3 flex flex-col items-center">
          <motion.button
            whileHover={{scale: 1.05}}
            whileTap={{scale: 0.96}}
            onClick={() => setShowAvatars(v => !v)}
            title="Choose your avatar"
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-gradient-to-b from-white/95 to-[#e4e8ef] text-[34px] shadow-inner ring-1 ring-black/10 transition dark:from-[#3a3a40] dark:to-[#26262b] dark:ring-white/15"
          >
            {selfAvatar}
          </motion.button>
          <span className="mt-1.5 text-[10.5px] font-medium text-black/40 dark:text-white/40">
            tap to change avatar
          </span>
        </div>

        {/* avatar picker sheet */}
        {showAvatars && (
          <motion.div
            initial={{opacity: 0, height: 0}}
            animate={{opacity: 1, height: 'auto'}}
            className="mb-3 overflow-hidden"
          >
            <div className="grid grid-cols-10 gap-1 rounded-xl bg-black/[0.04] p-2 dark:bg-white/[0.06]">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => {
                    setAvatar(a)
                    setShowAvatars(false)
                  }}
                  className={`mac-press rounded-lg py-0.5 text-[17px] transition hover:scale-110 ${
                    a === selfAvatar
                      ? 'bg-[var(--mac-accent)]/20 ring-1 ring-[var(--mac-accent)]'
                      : ''
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <label className="mb-1 block text-[11px] font-medium text-black/50 dark:text-white/50">
          Display name
        </label>
        <input
          value={selfName}
          onChange={e => setName(e.target.value.slice(0, 24))}
          className={`mb-4 ${inputCls}`}
        />

        {/* segmented control: create vs join */}
        <div className="mb-4 flex rounded-lg bg-black/[0.06] p-0.5 text-[12px] font-medium dark:bg-white/10">
          {(['create', 'join'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-[7px] py-1.5 transition ${
                mode === m
                  ? 'bg-white text-black/85 shadow-sm dark:bg-[#3a3a3e] dark:text-white/90'
                  : 'text-black/50 dark:text-white/50'
              }`}
            >
              {m === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {mode === 'create' ? (
          <>
            <div className="mb-2 rounded-xl border border-black/[0.07] bg-white/70 p-3 text-center dark:border-white/10 dark:bg-[#1c1c1e]/70">
              <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                Your room code
              </div>
              <div className="select-text font-mono text-[19px] font-semibold tracking-wide text-black/85 dark:text-white/90">
                {suggestedCode}
              </div>
              <div className="mt-0.5 text-[10.5px] text-black/40 dark:text-white/40">
                share it with friends to invite them
              </div>
            </div>
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setSuggestedCode(randomCode())}
                className="mac-press flex-1 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-medium text-black/70 transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/20"
              >
                🎲 New Code
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(suggestedCode)}
                className="mac-press flex-1 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-medium text-black/70 transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/20"
              >
                ⧉ Copy
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault()
              enter()
            }}
          >
            <label className="mb-1 block text-[11px] font-medium text-black/50 dark:text-white/50">
              Room code
            </label>
            <input
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
              placeholder="e.g. swift-otter-42"
              autoCapitalize="none"
              spellCheck={false}
              className={`mb-3 font-mono ${inputCls}`}
            />
          </form>
        )}

        <button
          onClick={enter}
          disabled={!ready}
          className="mac-press mb-1 w-full rounded-lg bg-[var(--mac-accent)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-40"
        >
          {mode === 'create' ? 'Start Machine' : 'Join Machine'}
        </button>

        <p className="mt-4 text-center text-[10.5px] leading-relaxed text-black/40 dark:text-white/40">
          {myId().slice(0, 8)} · All traffic flows directly browser↔browser over
          WebRTC — no server, no account, no trace.
        </p>
      </motion.div>
    </div>
  )
}
