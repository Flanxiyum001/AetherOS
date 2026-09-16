import {FormEvent, useEffect, useRef, useState} from 'react'
import {useOS} from '../store'
import {sendChatMessage, renameSelf} from '../net'

export default function ChatApp() {
  const messages = useOS(s => s.messages)
  const selfName = useOS(s => s.selfName)
  const selfId = useOS(s => s.selfId)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'})
  }, [messages.length])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    sendChatMessage(text.trim())
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {messages.map(m => {
          if (m.author === 'system')
            return (
              <div key={m.id} className="text-center text-[11px] italic text-slate-600">
                — {m.text} —
              </div>
            )
          // compare peer ids — handles can collide or change mid-session
          const mine = m.author === selfId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : ''}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                  mine
                    ? 'bg-cyan-500/20 text-cyan-100'
                    : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                {!mine && (
                  <div className="text-[10px] font-semibold text-violet-300">
                    {m.authorName}
                  </div>
                )}
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-800 p-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="say something…"
          className="w-full rounded-lg border border-slate-700 bg-[#060c18] px-3 py-1.5 text-sm text-cyan-100 outline-none focus:border-cyan-400/60"
        />
        <button
          type="submit"
          className="rounded-lg bg-cyan-500/90 px-3 py-1.5 text-sm font-semibold text-[#04121a] transition hover:bg-cyan-400"
        >
          send
        </button>
      </form>
      <div className="border-t border-slate-800 px-2 py-1 text-[10px] text-slate-600">
        your handle:{' '}
        <input
          value={selfName}
          onChange={e => renameSelf(e.target.value.slice(0, 24))}
          className="w-32 border-b border-slate-700 bg-transparent text-slate-400 outline-none focus:border-cyan-400/60"
        />
      </div>
    </div>
  )
}
