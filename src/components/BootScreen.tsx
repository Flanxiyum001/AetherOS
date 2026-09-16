import {useEffect, useState} from 'react'
import {motion} from 'framer-motion'
import {useOS} from '../store'

const LINES = [
  'AETHER BIOS v0.9.2 — POST OK',
  'CPU: 1× virtual core @ ∞ GHz',
  'MEM: ∞ MB heap (browser-provided)',
  'NET: WebRTC stack online',
  'P2P: hunting peers on the open mesh…',
  'DRIVE: mounting /dev/indexeddb … OK',
  '',
  'Welcome to AETHER OS',
]

export default function BootScreen() {
  const [shown, setShown] = useState(0)
  const setBooted = useOS(s => s.setBooted)

  useEffect(() => {
    if (shown >= LINES.length) {
      const t = setTimeout(() => setBooted(true), 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown(n => n + 1), shown === 0 ? 200 : 240)
    return () => clearTimeout(t)
  }, [shown, setBooted])

  return (
    <div className="scanline relative h-full w-full bg-[#050810] p-8 font-mono text-cyan-300">
      <div className="mx-auto mt-[12vh] max-w-2xl space-y-2 text-sm">
        {LINES.slice(0, shown).map((l, i) => (
          <motion.div key={i} initial={{opacity: 0}} animate={{opacity: 1}}>
            {l || '\u00a0'}
          </motion.div>
        ))}
        {shown >= LINES.length && (
          <motion.div
            className="glow-text mt-8 text-2xl font-bold text-cyan-200"
            initial={{opacity: 0, scale: 0.96}}
            animate={{opacity: 1, scale: 1}}
          >
            ▸ press any key (or click) to continue_
          </motion.div>
        )}
      </div>
      <button
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="continue"
        onClick={() => setBooted(true)}
      />
    </div>
  )
}
