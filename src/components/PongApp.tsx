import {useEffect, useRef, useState} from 'react'
import {useOS} from '../store'
import {sendPongInput, receivePongInput, myId} from '../net'

const W = 400
const H = 260
const PAD_H = 50
const PAD_W = 8

interface GameState {
  bally: number
  ballx: number
  vy: number
  vx: number
  leftY: number
  rightY: number
  scoreL: number
  scoreR: number
}

export default function PongApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peers = useOS(s => s.peers)
  const [hasPeer, setHasPeer] = useState(false)

  const state = useRef<GameState>({
    bally: H / 2,
    ballx: W / 2,
    vy: 2,
    vx: 2.4,
    leftY: H / 2 - PAD_H / 2,
    rightY: H / 2 - PAD_H / 2,
    scoreL: 0,
    scoreR: 0,
  })

  const keys = useRef({up: false, down: false})
  const isLeft = useRef<boolean | null>(null)
  const lastSent = useRef(0)

  useEffect(() => {
    const peerIds = Object.keys(peers)
    setHasPeer(peerIds.length > 0)
    if (peerIds.length > 0 && isLeft.current === null) {
      // lowest peer id plays left paddle — deterministic side assignment
      const ids = [myId(), ...peerIds].sort()
      isLeft.current = ids[0] === myId()
    }
  }, [peers])

  useEffect(() => {
    receivePongInput((y: number) => {
      const s = state.current
      s.rightY = Math.max(0, Math.min(H - PAD_H, y))
      if (isLeft.current === null) isLeft.current = false
    })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') keys.current.up = true
      if (e.key === 'ArrowDown') keys.current.down = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') keys.current.up = false
      if (e.key === 'ArrowDown') keys.current.down = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    let raf: number
    const loop = () => {
      const s = state.current
      const speed = 4

      // local paddle control
      const myY = isLeft.current === false ? s.rightY : s.leftY
      let newY = myY
      if (keys.current.up) newY -= speed
      if (keys.current.down) newY += speed
      newY = Math.max(0, Math.min(H - PAD_H, newY))
      if (isLeft.current === false) s.rightY = newY
      else s.leftY = newY

      // throttle network updates to ~20Hz
      const now = performance.now()
      if (now - lastSent.current > 50) {
        lastSent.current = now
        sendPongInput(isLeft.current === false ? s.rightY : s.leftY)
      }

      // ball physics (each peer simulates; positions converge via paddle sync)
      s.ballx += s.vx
      s.bally += s.vy
      if (s.bally < 4 || s.bally > H - 4) s.vy = -s.vy

      const lx = 16
      const rx = W - 16 - PAD_W
      if (
        s.ballx < lx + PAD_W &&
        s.bally > s.leftY &&
        s.bally < s.leftY + PAD_H &&
        s.vx < 0
      ) {
        s.vx = -s.vx * 1.03
      }
      if (
        s.ballx > rx &&
        s.bally > s.rightY &&
        s.bally < s.rightY + PAD_H &&
        s.vx > 0
      ) {
        s.vx = -s.vx * 1.03
      }

      if (s.ballx < 0 || s.ballx > W) {
        if (s.ballx < 0) s.scoreR++
        else s.scoreL++
        s.ballx = W / 2
        s.bally = H / 2
        s.vx = 2.4
        s.vy = 2
      }

      // draw (mac palette: accent blue paddles, dark ball, soft bg)
      ctx.fillStyle = '#f2f2f5'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(W / 2, 0)
      ctx.lineTo(W / 2, H)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#5b6470'
      ctx.font = 'bold 28px -apple-system, monospace'
      ctx.fillText(String(s.scoreL), W / 2 - 50, 36)
      ctx.fillText(String(s.scoreR), W / 2 + 30, 36)
      ctx.fillStyle = '#0a84ff'
      ctx.fillRect(16, s.leftY, PAD_W, PAD_H)
      ctx.fillRect(rx, s.rightY, PAD_W, PAD_H)
      ctx.fillStyle = '#2c2c2e'
      ctx.fillRect(s.ballx - 4, s.bally - 4, 8, 8)

      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="max-w-full rounded-[12px] border border-black/10 shadow-sm"
      />
      <p className="text-[11px] text-black/45">
        {hasPeer
          ? isLeft.current === false
            ? 'you are right paddle — ↑/↓ to move'
            : 'you are left paddle — ↑/↓ to move'
          : 'waiting for a peer to join the room…'}
      </p>
    </div>
  )
}
