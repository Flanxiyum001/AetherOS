import {useEffect, useMemo, useState} from 'react'
import {useOS} from '../store'
import {getFile} from '../drive'

interface Photo {
  id: string
  name: string
  mime: string
  addedByName: string
}

export default function PhotosApp() {
  const files = useOS(s => s.files)
  const [items, setItems] = useState<{photo: Photo; url: string}[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  const photos: Photo[] = useMemo(
    () => files.filter(f => f.mime.startsWith('image/')).map(f => ({
      id: f.id,
      name: f.name,
      mime: f.mime,
      addedByName: f.addedByName,
    })),
    [files]
  )

  // resolve blobs to object URLs (only ones stored locally)
  useEffect(() => {
    let alive = true
    const created: string[] = []
    Promise.all(
      photos.map(async p => {
        const rec = await getFile(p.id)
        if (!rec) return null
        const url = URL.createObjectURL(rec.blob)
        created.push(url)
        return {photo: p, url}
      })
    ).then(rows => {
      if (alive) setItems(rows.filter(Boolean) as {photo: Photo; url: string}[])
    })
    return () => {
      alive = false
      for (const u of created) URL.revokeObjectURL(u)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map(p => p.id).join(',')])

  return (
    <div className="h-full overflow-auto bg-white p-3 dark:bg-[#232326]">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
        Shared Photos — {items.length}
      </div>
      {items.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-black/35 dark:text-white/35">
          No photos stored locally yet. Attach one in Chat or add it via Drive —
          images shared by peers appear here once fetched.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {items.map(({photo, url}) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(url)}
              className="group relative aspect-square overflow-hidden rounded-[8px] bg-black/[0.05] dark:bg-white/[0.06]"
            >
              <img
                src={url}
                alt={photo.name}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[9.5px] text-white opacity-0 transition group-hover:opacity-100">
                {photo.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-[10px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[16px] text-white transition hover:bg-white/25"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
