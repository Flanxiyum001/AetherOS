import {FormEvent, useEffect, useRef, useState} from 'react'
import {useOS} from '../store'
import {sendChatMessage, renameSelf, sendChatAttachment, requestFile} from '../net'
import {getFile} from '../drive'
import {playMessageSent, playMessageRecv, playTick} from '../sound'
import VoiceNote from './VoiceNote'

const EMOJI = [
  '😀','😂','🥹','😍','😎','🤔','😴','🥳','😭','😡',
  '👍','👎','👏','🙌','🤝','💪','🙏','👀','🔥','✨',
  '❤️','💜','💙','🧡','🖤','💯','🎉','🎂','🍕','☕',
  '🐱','🐶','🦊','🐸','🌍','🌙','⭐','⚡','🍎','🏓',
]

export default function ChatApp() {
  const messages = useOS(s => s.messages)
  const selfName = useOS(s => s.selfName)
  const selfId = useOS(s => s.selfId)
  const selfAvatar = useOS(s => s.selfAvatar)
  const peers = useOS(s => s.peers)
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const lastCount = useRef(0)

  // incoming-message sound
  useEffect(() => {
    if (messages.length > lastCount.current) {
      const last = messages[messages.length - 1]
      if (last && last.author !== selfId && last.author !== 'system') playMessageRecv()
    }
    lastCount.current = messages.length
    bottomRef.current?.scrollIntoView({behavior: 'smooth'})
  }, [messages.length, messages, selfId])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    sendChatMessage(text.trim())
    setText('')
    playMessageSent()
  }

  // ---- voice recording ----
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true})
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = ev => chunksRef.current.push(ev.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, {type: 'audio/webm'})
        if (blob.size > 800) {
          const ext = blob.type.includes('ogg') ? 'ogg' : 'webm'
          const file = new File([blob], `voice-${Date.now()}.${ext}`, {type: blob.type})
          await sendChatAttachment(file, '')
        }
      }
      mr.start()
      recorderRef.current = mr
      setRecording(true)
      setRecSecs(0)
      playTick()
    } catch {
      // mic denied or unavailable
    }
  }

  const stopRec = (send: boolean) => {
    const mr = recorderRef.current
    if (!mr) return
    if (!send) mr.onstop = () => {
      mr.stream.getTracks().forEach(t => t.stop())
    }
    mr.stop()
    recorderRef.current = null
    setRecording(false)
    playTick()
  }

  // recording timer
  useEffect(() => {
    if (!recording) return
    const iv = setInterval(() => setRecSecs(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [recording])

  const onPickFile = (f: File | undefined | null) => {
    if (!f) return
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return
    void sendChatAttachment(f, text.trim())
    setText('')
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#232326]">
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {messages.map(m => {
          if (m.author === 'system')
            return (
              <div key={m.id} className="text-center">
                <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-[11px] text-black/45 dark:bg-white/10 dark:text-white/45">
                  {m.text}
                </span>
              </div>
            )
          // compare peer ids — handles can collide or change mid-session
          const mine = m.author === selfId
          return (
            <div key={m.id} className={`flex items-end gap-1.5 ${mine ? 'justify-end' : ''}`}>
              {!mine && (
                <span className="shrink-0 text-[15px] leading-none opacity-90" title={m.authorName}>
                  {peers[m.author]?.avatar ?? '👤'}
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-[16px] px-3 py-1.5 text-[13px] leading-snug ${
                  mine
                    ? 'rounded-br-[4px] bg-[var(--mac-accent)] text-white'
                    : 'rounded-bl-[4px] bg-[#e9e9eb] text-black/85 dark:bg-[#3a3a3e] dark:text-white/90'
                }`}
              >
                {!mine && (
                  <div className="mb-0.5 text-[11px] font-semibold text-black/45 dark:text-white/45">
                    {m.authorName}
                  </div>
                )}
                {m.attachment &&
                  (m.attachment.mime.startsWith('audio/') &&
                  m.attachment.name.startsWith('voice-') ? (
                    <VoiceNote fileId={m.attachment.fileId} mine={mine} />
                  ) : (
                    <MediaAttachment att={m.attachment} mine={mine} />
                  ))}
                {m.text}
              </div>
              {mine && (
                <span className="shrink-0 text-[15px] leading-none opacity-90" title={selfName}>
                  {selfAvatar}
                </span>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* emoji tray */}
      {showEmoji && (
        <div className="glass grid grid-cols-10 gap-0.5 border-x-0 border-b-0 p-2">
          {EMOJI.map(e => (
            <button
              key={e}
              onClick={() => setText(t => t + e)}
              className="mac-press rounded-md py-0.5 text-[17px] hover:bg-black/10 dark:hover:bg-white/15"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-black/[0.07] bg-[#f6f6f6]/90 p-2 dark:border-white/10 dark:bg-[#2c2c30]/90"
      >
        <button
          type="button"
          title="Emoji"
          onClick={() => setShowEmoji(v => !v)}
          className={`mac-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[17px] transition hover:bg-black/10 dark:hover:bg-white/15 ${showEmoji ? 'bg-black/10 dark:bg-white/15' : ''}`}
        >
          😊
        </button>
        <button
          type="button"
          title="Attach photo or video"
          onClick={() => fileRef.current?.click()}
          className="mac-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[17px] transition hover:bg-black/10 dark:hover:bg-white/15"
        >
          📎
        </button>
        {recording ? (
          <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[12px] tabular-nums text-red-500">
              {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}
            </span>
            <button
              type="button"
              title="Send"
              onClick={() => stopRec(true)}
              className="mac-press flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mac-accent)] text-[11px] text-white"
            >
              ➤
            </button>
            <button
              type="button"
              title="Cancel"
              onClick={() => stopRec(false)}
              className="mac-press flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-[11px] text-black/60 dark:bg-white/15 dark:text-white/70"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            title="Record voice message"
            onClick={() => void startRec()}
            className="mac-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] transition hover:bg-black/10 dark:hover:bg-white/15"
          >
            🎙️
          </button>
        )}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="iMessage"
          className="h-8 w-full rounded-full border border-black/10 bg-white px-3 text-[13px] text-black/85 outline-none focus:border-[var(--mac-accent)] focus:ring-2 focus:ring-[var(--mac-accent)]/20 dark:border-white/15 dark:bg-[#1c1c1e] dark:text-white/90"
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => {
            onPickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </form>
      <div className="border-t border-black/[0.07] bg-[#f6f6f6]/90 px-3 py-1 text-[11px] text-black/45 dark:border-white/10 dark:bg-[#2c2c30]/90 dark:text-white/45">
        Handle:{' '}
        <input
          value={selfName}
          onChange={e => renameSelf(e.target.value.slice(0, 24))}
          className="w-36 rounded border-b border-transparent bg-transparent text-black/65 outline-none focus:border-[var(--mac-accent)] dark:text-white/65"
        />
      </div>
    </div>
  )
}

/** Renders an image/video attachment inside a chat bubble; fetches bytes from
 *  the local drive, or offers a Fetch button if the blob isn't stored yet. */
function MediaAttachment({
  att,
  mine,
}: {
  att: NonNullable<import('../store').ChatMessage['attachment']>
  mine: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    getFile(att.fileId).then(rec => {
      if (!alive) return
      if (!rec) {
        setMissing(true)
        return
      }
      objectUrl = URL.createObjectURL(rec.blob)
      setUrl(objectUrl)
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [att.fileId])

  const fetchNow = async () => {
    requestFile(att.fileId)
    // poll briefly for the blob to arrive via P2P transfer
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500))
      const rec = await getFile(att.fileId)
      if (rec) {
        setUrl(URL.createObjectURL(rec.blob))
        setMissing(false)
        return
      }
    }
  }

  const isVideo = att.mime.startsWith('video/')

  return (
    <div className="mb-1.5">
      {url ? (
        isVideo ? (
          <video src={url} controls className="max-h-56 w-full rounded-[10px]" />
        ) : (
          <img
            src={url}
            alt={att.name}
            className="max-h-56 w-full cursor-zoom-in rounded-[10px] object-cover"
            onClick={() => window.open(url, '_blank')}
          />
        )
      ) : missing ? (
        <button
          onClick={() => void fetchNow()}
          className={`flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-3 text-[12px] font-medium ${
            mine
              ? 'bg-white/20 hover:bg-white/30'
              : 'bg-black/[0.06] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20'
          }`}
        >
          ⬇︎ Download “{att.name}” ({Math.max(1, Math.round(att.size / 1024))} KB)
        </button>
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-[10px] bg-black/10 text-[12px] text-black/50 dark:bg-white/10 dark:text-white/50">
          Loading…
        </div>
      )}
    </div>
  )
}
