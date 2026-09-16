import {FormEvent, useEffect, useRef, useState} from 'react'
import {useOS} from '../store'
import {myId, getRoomId} from '../net'
import {listFiles, formatSize} from '../drive'

interface Line {
  text: string
  kind: 'in' | 'out' | 'err'
}

export default function TerminalApp() {
  const peers = useOS(s => s.peers)
  const selfName = useOS(s => s.selfName)
  const [lines, setLines] = useState<Line[]>([
    {text: 'aether shell — type `help` to begin', kind: 'out'},
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [lines])

  const run = (cmd: string) => {
    const out: Line[] = [{text: `$ ${cmd}`, kind: 'in'}]
    const [c] = cmd.trim().split(/\s+/)
    switch (c) {
      case 'help':
        out.push({
          text: 'commands: help, whoami, peers, ls, df, room, ping, clear, uptime, fortune',
          kind: 'out',
        })
        break
      case 'whoami':
        out.push({text: `${selfName} (${myId()})`, kind: 'out'})
        break
      case 'peers':
        out.push({
          text:
            Object.keys(peers).length === 0
              ? 'no peers connected'
              : Object.entries(peers)
                  .map(([id, p]) => `${id.slice(0, 8)}  ${p.name}`)
                  .join('\n'),
          kind: 'out',
        })
        break
      case 'ls':
      case 'df':
        void listFiles().then(fs => {
          const body =
            fs.length === 0
              ? 'drive empty'
              : fs
                  .map(
                    f =>
                      `${formatSize(f.size).padStart(9)}  ${f.id}  ${f.name}`
                  )
                  .join('\n')
          setLines(l => [...l, ...out, {text: body, kind: 'out'}])
        })
        break
      case 'room':
        out.push({text: getRoomId() ?? 'not connected', kind: 'out'})
        break
      case 'uptime': {
        const s = Math.floor(performance.now() / 1000)
        out.push({text: `up ${Math.floor(s / 60)}m ${s % 60}s`, kind: 'out'})
        break
      }
      case 'fortune':
        out.push({
          text: FORTUNES[Math.floor(Math.random() * FORTUNES.length)],
          kind: 'out',
        })
        break
      case 'ping':
        out.push({text: 'pong (websockets are for cowards)', kind: 'out'})
        break
      case 'clear':
        setLines([])
        return
      case '':
        break
      default:
        out.push({text: `unknown command: ${c}`, kind: 'err'})
    }
    setLines(l => [...l, ...out])
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(input)
    setInput('')
  }

  return (
    <div className="flex h-full flex-col bg-[#040a12] font-mono text-[13px]">
      <div className="min-h-0 flex-1 overflow-auto p-3 leading-relaxed">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === 'err'
                ? 'text-red-400'
                : l.kind === 'in'
                ? 'text-cyan-300'
                : 'text-slate-400'
            }
          >
            <pre className="whitespace-pre-wrap">{l.text}</pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-800 px-3 py-2">
        <span className="text-cyan-400">λ</span>
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full bg-transparent text-cyan-100 outline-none"
        />
      </form>
    </div>
  )
}

const FORTUNES = [
  'a peer you have not met yet is sharing a file with you right now.',
  'the mesh remembers nothing. that is its kindness.',
  'ICE candidates are just frozen opportunities.',
  'somewhere, a TURN server is grateful you do not need it.',
  'your data travels at the speed of light and the price of nothing.',
]
