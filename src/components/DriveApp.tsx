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
      className={`flex h-full flex-col ${
        dragOver ? 'bg-cyan-500/10' : ''
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
        className="m-3 cursor-pointer rounded-lg border-2 border-dashed border-cyan-500/30 p-5 text-center text-xs text-slate-500 transition hover:border-cyan-400/60 hover:text-cyan-300"
      >
        ⬇ drop files here or click to add — they stay on this machine until
        streamed
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
          <p className="py-8 text-center text-xs text-slate-600">
            the shared drive is empty
          </p>
        )}
        <div className="space-y-2">
          {files.map(f => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0b1424] px-3 py-2 text-xs"
            >
              <span className="text-lg">
                {f.mime.startsWith('image') ? '🖼' : f.mime.startsWith('video') ? '🎬' : f.mime.startsWith('audio') ? '🎵' : '📄'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-200">{f.name}</div>
                <div className="text-[10px] text-slate-500">
                  {formatSize(f.size)} · by {f.addedByName}
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
          className="rounded border border-emerald-500/40 px-2 py-1 text-emerald-300 transition hover:bg-emerald-500/10"
        >
          save
        </button>
        <button
          onClick={() => void shareFile(fileId)}
          className="rounded border border-cyan-500/40 px-2 py-1 text-cyan-300 transition hover:bg-cyan-500/10"
        >
          push
        </button>
        {addedBy === selfId && (
          <button
            onClick={() => removeSharedFile(fileId)}
            className="rounded border border-red-500/40 px-2 py-1 text-red-300 transition hover:bg-red-500/10"
          >
            del
          </button>
        )}
      </span>
    )
  }

  return (
    <button
      onClick={() => requestFile(fileId)}
      className="rounded border border-violet-500/40 px-2 py-1 text-violet-300 transition hover:bg-violet-500/10"
    >
      fetch
    </button>
  )
}
