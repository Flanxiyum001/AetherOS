import {useEffect, useRef, useState} from 'react'
import {useOS} from '../store'
import {addFileToDrive, requestFile, removeSharedFile, shareFile} from '../net'
import {formatSize, getFile} from '../drive'

export default function DriveApp() {
  const files = useOS(s => s.files)
  const selfId = useOS(s => s.selfId)
  const transfers = useOS(s => s.transfers)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localIds, setLocalIds] = useState<Set<string>>(new Set())

  // which drive entries do we already hold locally? (drives save/fetch buttons)
  useEffect(() => {
    let alive = true
    Promise.all(
      files.map(async f => ({id: f.id, local: !!(await getFile(f.id))}))
    ).then(rows => {
      if (alive) setLocalIds(new Set(rows.filter(r => r.local).map(r => r.id)))
    })
    return () => {
      alive = false
    }
  }, [files, transfers])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    for (const f of Array.from(list)) void addFileToDrive(f)
  }

  return (
    <div
      className={`flex h-full flex-col bg-white transition-colors ${
        dragOver ? 'bg-[var(--mac-accent)]/[0.06]' : ''
      }`}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        addFiles(e.dataTransfer.files)
      }}
    >
      <div
        onClick={() => inputRef.current?.click()}
        className="m-3 cursor-pointer rounded-[10px] border-2 border-dashed border-black/15 p-5 text-center text-[12px] text-black/45 transition hover:border-[var(--mac-accent)]/50 hover:text-[var(--mac-accent)]"
      >
        Drop files here or click to add — they stay on this machine until streamed
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        {files.length === 0 && (
          <p className="py-8 text-center text-[12px] text-black/35">
            The shared drive is empty
          </p>
        )}
        <div className="space-y-1.5">
          {files.map(f => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-[10px] border border-black/[0.06] bg-[#f6f6f6]/80 px-3 py-2 text-[12px] transition hover:bg-[#f0f0f2]"
            >
              <span className="text-[20px]">
                {f.mime.startsWith('image') ? '🖼' : f.mime.startsWith('video') ? '🎬' : f.mime.startsWith('audio') ? '🎵' : '📄'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-black/85">{f.name}</div>
                <div className="text-[10.5px] text-black/40">
                  {formatSize(f.size)} · {f.addedByName}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <LocalAwareButton fileId={f.id} local={localIds.has(f.id)} selfId={selfId} addedBy={f.addedBy} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LocalAwareButton({
  fileId,
  local,
  selfId,
  addedBy,
}: {
  fileId: string
  local: boolean
  selfId: string
  addedBy: string
}) {
  if (local) {
    return (
      <span className="flex gap-1">
        <button
          onClick={async () => {
            const rec = await getFile(fileId)
            if (!rec) return
            const url = URL.createObjectURL(rec.blob)
            const a = document.createElement('a')
            a.href = url
            a.download = rec.name
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="mac-press rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-50"
        >
          Save
        </button>
        <button
          onClick={() => void shareFile(fileId)}
          className="mac-press rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-[var(--mac-accent)] transition hover:bg-blue-50"
        >
          Push
        </button>
        {addedBy === selfId && (
          <button
            onClick={() => removeSharedFile(fileId)}
            className="mac-press rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-red-500 transition hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </span>
    )
  }

  return (
    <button
      onClick={() => requestFile(fileId)}
      className="mac-press rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-violet-600 transition hover:bg-violet-50"
    >
      Fetch
    </button>
  )
}
