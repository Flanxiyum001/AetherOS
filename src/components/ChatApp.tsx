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
    <div className="flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {messages.map(m => {
          if (m.author === 'system')
            return (
              <div key={m.id} className="text-center">
                <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-[11px] text-black/45">
                  {m.text}
                </span>
              </div>
            )
          // compare peer ids — handles can collide or change mid-session
          const mine = m.author === selfId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : ''}`}>
              <div
                className={`max-w-[80%] rounded-[16px] px-3 py-1.5 text-[13px] leading-snug ${
                  mine
                    ? 'rounded-br-[4px] bg-[var(--mac-accent)] text-white'
                    : 'rounded-bl-[4px] bg-[#e9e9eb] text-black/85'
                }`}
              >
                {!mine && (
                  <div className="mb-0.5 text-[11px] font-semibold text-black/45">
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
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-black/[0.07] bg-[#f6f6f6]/90 p-2"
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="iMessage"
          className="h-8 w-full rounded-full border border-black/10 bg-white px-3 text-[13px] text-black/85 outline-none focus:border-[var(--mac-accent)] focus:ring-2 focus:ring-[var(--mac-accent)]/20"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim()}
          className="mac-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--mac-accent)] text-white transition hover:brightness-105 disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.3 1l1.1 6.1c.1.5.5.9 1 .9h7.3c.6 0 1 .4 1 1s-.4 1-1 1H4.2c-.5 0-.9.4-1 .9l-1.1 6.1c-.1.7.6 1.3 1.3 1z" />
          </svg>
        </button>
      </form>
      <div className="border-t border-black/[0.07] bg-[#f6f6f6]/90 px-3 py-1 text-[11px] text-black/45">
        Handle:{' '}
        <input
          value={selfName}
          onChange={e => renameSelf(e.target.value.slice(0, 24))}
          className="w-36 rounded border-b border-transparent bg-transparent text-black/65 outline-none focus:border-[var(--mac-accent)]"
        />
      </div>
    </div>
  )
}
