import {useMemo, useState} from 'react'

interface Ev {
  date: string // yyyy-mm-dd
  text: string
}

const KEY = 'aether:events'

function load(): Ev[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Ev[]
  } catch {
    return []
  }
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarApp() {
  const today = new Date()
  const [y, setY] = useState(today.getFullYear())
  const [m, setM] = useState(today.getMonth())
  const [events, setEvents] = useState<Ev[]>(load)
  const [selDate, setSelDate] = useState<string | null>(null)

  const persist = (v: Ev[]) => {
    setEvents(v)
    localStorage.setItem(KEY, JSON.stringify(v))
  }

  const grid = useMemo(() => {
    const first = new Date(y, m, 1).getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const cells: (number | null)[] = Array(first).fill(null)
    for (let d = 1; d <= days; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [y, m])

  const addEvent = () => {
    if (!selDate) return
    const text = prompt('Event:')
    if (!text?.trim()) return
    persist([...events, {date: selDate, text: text.trim()}])
  }

  const dayEvents = selDate ? events.filter(e => e.date === selDate) : []
  const evOn = (d: number) => events.some(e => e.date === iso(y, m, d))

  return (
    <div className="flex h-full flex-col bg-white p-3 dark:bg-[#232326]">
      {/* header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => (m === 0 ? (setM(11), setY(y - 1)) : setM(m - 1))}
            className="mac-press rounded-md px-2 py-1 text-[12px] text-black/60 hover:bg-black/[0.06] dark:text-white/60 dark:hover:bg-white/10"
          >
            ‹
          </button>
          <button
            onClick={() => (setY(today.getFullYear()), setM(today.getMonth()), setSelDate(iso(today.getFullYear(), today.getMonth(), today.getDate())))}
            className="mac-press rounded-md px-2 py-1 text-[11px] font-medium text-[var(--mac-accent)] hover:bg-[var(--mac-accent)]/10"
          >
            Today
          </button>
        </div>
        <h2 className="text-[15px] font-bold text-black/85 dark:text-white/90">
          {MONTHS[m]} {y}
        </h2>
        <button
          onClick={() => (m === 11 ? (setM(0), setY(y + 1)) : setM(m + 1))}
          className="mac-press rounded-md px-2 py-1 text-[12px] text-black/60 hover:bg-black/[0.06] dark:text-white/60 dark:hover:bg-white/10"
        >
          ›
        </button>
      </div>

      {/* weekday header */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DOW.map(d => (
          <span key={d} className="text-[10px] font-semibold uppercase tracking-wide text-black/35 dark:text-white/35">
            {d}
          </span>
        ))}
      </div>

      {/* grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-[3px]">
        {grid.map((d, i) => {
          if (d === null) return <div key={i} />
          const dateStr = iso(y, m, d)
          const isToday =
            d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
          const selected = selDate === dateStr
          return (
            <button
              key={i}
              onClick={() => setSelDate(dateStr)}
              onDoubleClick={addEvent}
              className={`relative flex items-start justify-end rounded-[7px] p-1 text-[11.5px] transition ${
                selected
                  ? 'bg-[var(--mac-accent)] text-white'
                  : isToday
                  ? 'bg-[var(--mac-accent)]/10 font-bold text-[var(--mac-accent)]'
                  : 'text-black/70 hover:bg-black/[0.05] dark:text-white/70 dark:hover:bg-white/10'
              }`}
            >
              {d}
              {evOn(d) && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    selected ? 'bg-white' : 'bg-[var(--mac-accent)]'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* day detail */}
      <div className="mt-2 min-h-[64px] rounded-[10px] border border-black/[0.06] bg-[#f6f6f6]/80 p-2 dark:border-white/10 dark:bg-[#2c2c30]/80">
        {selDate ? (
          <>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-black/60 dark:text-white/60">
                {new Date(selDate + 'T00:00').toLocaleDateString([], {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <button
                onClick={addEvent}
                className="mac-press rounded px-1.5 py-0.5 text-[11px] font-medium text-[var(--mac-accent)] hover:bg-[var(--mac-accent)]/10"
              >
                ＋ Event
              </button>
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-[11px] text-black/35 dark:text-white/35">No events</p>
            ) : (
              <ul className="space-y-0.5">
                {dayEvents.map((e, i) => (
                  <li
                    key={i}
                    className="group flex items-center justify-between text-[12px] text-black/75 dark:text-white/80"
                  >
                    <span className="truncate">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--mac-accent)] align-middle" />
                      {e.text}
                    </span>
                    <button
                      onClick={() => persist(events.filter(x => x !== e))}
                      className="opacity-0 transition group-hover:opacity-100 text-[10px] text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-[11px] text-black/35 dark:text-white/35">
            Select a day — double-click to add an event
          </p>
        )}
      </div>
    </div>
  )
}
