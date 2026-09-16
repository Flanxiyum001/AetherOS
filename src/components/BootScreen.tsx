import {useEffect, useState} from 'react'
import {useOS} from '../store'

export default function BootScreen() {
  const [progress, setProgress] = useState(0)
  const setBooted = useOS(s => s.setBooted)

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(iv)
          return 100
        }
        return p + 2 + Math.random() * 3
      })
    }, 60)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => setBooted(true), 650)
      return () => clearTimeout(t)
    }
  }, [progress, setBooted])

  return (
    <div
      className="relative flex h-full w-full cursor-default flex-col items-center justify-center bg-black"
      onClick={() => setBooted(true)}
      onKeyDown={() => setBooted(true)}
      tabIndex={0}
    >
      {/* apple-style logo */}
      <svg
        viewBox="0 0 24 24"
        className="mb-10 h-16 w-16 fill-white/95"
        aria-label="Aether logo"
      >
        <path d="M12 2c.4 1.9-.6 3.6-1.9 4.9-1.3 1.3-3.1 2.2-4.9 1.9-.3-1.9.7-3.7 1.9-4.9C8.4 2.6 10.2 1.8 12 2zm5.3 8.6c-2 .1-3.6 1.4-4.4 3-.9 1.8-1.4 3.9-2.9 5.2-1 .9-2.4 1.5-3.7 1.1.3-2 1.5-3.5 2.8-4.8 1.2-1.2 2.8-2.1 3.6-3.7.6-1.2.9-2.7 2-3.5.9-.7 2.1-1 3.2-.7.2 1.2-.2 2.4-.6 3.4z" />
      </svg>

      {/* boot progress bar */}
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
          style={{width: `${Math.min(100, progress)}%`}}
        />
      </div>
    </div>
  )
}
