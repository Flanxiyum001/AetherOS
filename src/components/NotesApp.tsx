import {useEffect, useState} from 'react'

interface Note {
  id: string
  title: string
  body: string
  ts: number
}

const KEY = 'aether:notes'

function load(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Note[]
  } catch {
    return []
  }
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>(load)
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(notes))
  }, [notes])

  const active = notes.find(n => n.id === activeId) ?? null

  const create = () => {
    const n: Note = {
      id: Math.random().toString(36).slice(2, 9),
      title: 'New Note',
      body: '',
      ts: Date.now(),
    }
    setNotes(v => [n, ...v])
    setActiveId(n.id)
  }

  const update = (patch: Partial<Note>) => {
    if (!activeId) return
    setNotes(v =>
      v.map(n =>
        n.id === activeId ? {...n, ...patch, ts: Date.now()} : n
      )
    )
  }

  const remove = (id: string) => {
    setNotes(v => v.filter(n => n.id !== id))
    if (activeId === id) setActiveId(null)
  }

  return (
    <div className="flex h-full bg-[#fbfb83]/40 dark:bg-[#2a2a24]/50">
      {/* list */}
      <div className="flex w-44 shrink-0 flex-col border-r border-black/[0.07] bg-white/70 dark:border-white/10 dark:bg-[#232326]/80">
        <button
          onClick={create}
          className="mac-press m-2 rounded-[7px] bg-[#e6c700]/90 px-2 py-1.5 text-[12px] font-semibold text-black/80 transition hover:brightness-105 dark:bg-[#b8a400]/80 dark:text-white/90"
        >
          ＋ New Note
        </button>
        <div className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
          {notes.length === 0 && (
            <p className="px-2 py-4 text-[11.5px] text-black/35 dark:text-white/35">No Notes</p>
          )}
          {notes.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`mb-0.5 block w-full rounded-[7px] px-2 py-1.5 text-left transition ${
                n.id === activeId
                  ? 'bg-[#e6c700]/40 dark:bg-[#b8a400]/30'
                  : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <div className="truncate text-[12px] font-semibold text-black/80 dark:text-white/85">
                {n.title || 'New Note'}
              </div>
              <div className="truncate text-[10.5px] text-black/40 dark:text-white/40">
                {new Date(n.ts).toLocaleDateString()}{' '}
                {n.body ? '· ' + n.body.slice(0, 22) : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* editor */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#fffef0]/80 dark:bg-[#232326]/60">
        {active ? (
          <>
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="text-[10.5px] text-black/35 dark:text-white/35">
                {new Date(active.ts).toLocaleString()}
              </span>
              <button
                onClick={() => remove(active.id)}
                className="mac-press rounded px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
            <input
              value={active.title}
              onChange={e => update({title: e.target.value})}
              placeholder="Title"
              className="bg-transparent px-3 pt-1 text-[15px] font-bold text-black/85 outline-none placeholder:text-black/20 dark:text-white/90"
            />
            <textarea
              value={active.body}
              onChange={e => update({body: e.target.value})}
              placeholder="Start typing…"
              className="min-h-0 flex-1 resize-none bg-transparent px-3 pb-3 pt-1 text-[13px] leading-relaxed text-black/75 outline-none placeholder:text-black/25 dark:text-white/80"
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[12px] text-black/30 dark:text-white/30">
            Select or create a note
          </div>
        )}
      </div>
    </div>
  )
}
