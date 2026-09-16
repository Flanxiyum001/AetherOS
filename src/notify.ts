import {create} from 'zustand'
import {nanoid} from 'nanoid'
import {playNotify} from './sound'

export interface Notif {
  id: string
  app: string
  title: string
  body: string
  ts: number
  /** appId to open when clicked */
  open?: string
}

interface NotifState {
  toasts: Notif[]
  center: Notif[]
  push: (n: Omit<Notif, 'id' | 'ts'> & {silent?: boolean}) => void
  dismiss: (id: string) => void
  clearCenter: () => void
}

export const useNotifs = create<NotifState>(set => ({
  toasts: [],
  center: [],
  push: n => {
    const notif: Notif = {id: nanoid(6), ts: Date.now(), ...n}
    set(s => ({
      toasts: [...s.toasts.slice(-3), notif],
      center: [notif, ...s.center].slice(0, 30),
    }))
    if (!n.silent) playNotify()
    // auto-dismiss the toast after 4.5s (stays in center)
    setTimeout(() => {
      set(s => ({toasts: s.toasts.filter(t => t.id !== notif.id)}))
    }, 4500)
  },
  dismiss: id =>
    set(s => ({
      toasts: s.toasts.filter(t => t.id !== id),
      center: s.center.filter(t => t.id !== id),
    })),
  clearCenter: () => set({center: []}),
}))

export function notify(app: string, title: string, body: string, open?: string) {
  useNotifs.getState().push({app, title, body, open})
}
