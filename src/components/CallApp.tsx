import {useEffect, useRef, useState} from 'react'
import {motion} from 'framer-motion'
import {useOS} from '../store'
import {
  onCallRing,
  onCallAccept,
  onCallEnd,
  onPeerMedia,
  acceptCall,
  declineCall,
  hangUp,
  pushLocalStream,
  stopLocalMedia,
  placeCall,
  getLocalMedia,
} from '../net'
import {notify} from '../notify'
import {playNotify} from '../sound'

type CallState = {
  peerId: string
  peerName: string
  video: boolean
  status: 'ringing' | 'connecting' | 'active'
  incoming: boolean
} | null

let callStateRef: CallState = null
const listeners = new Set<(s: CallState) => void>()
function setCall(s: CallState) {
  callStateRef = s
  for (const l of listeners) l(s)
}
export function getCall() {
  return callStateRef
}
export function startOutbound(peerId: string, peerName: string, video: boolean) {
  setCall({peerId, peerName, video, status: 'connecting', incoming: false})
  void placeCall(peerId, video)
}

export default function CallApp() {
  const [, force] = useState(0)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [camOn, setCamOn] = useState(true)

  useEffect(() => {
    const l = () => force(v => v + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  useEffect(() => {
    onCallRing((peerId, video) => {
      if (callStateRef) {
        declineCall(peerId)
        return
      }
      playNotify()
      notify('system', 'Incoming Call', `Peer ${peerId.slice(0, 6)} is calling`, undefined)
      setCall({peerId, peerName: `Peer ${peerId.slice(0, 6)}`, video, status: 'ringing', incoming: true})
      useOS.getState().openApp('call')
    })
    onCallAccept(peerId => {
      const c = callStateRef
      if (c?.peerId === peerId) {
        setCall({...c, status: 'active'})
        const stream = getLocalMedia()
        if (stream) pushLocalStream(stream)
      }
    })
    onCallEnd((peerId, reason) => {
      const c = callStateRef
      if (c?.peerId === peerId) {
        endCallUi()
        notify('system', 'Call Ended', reason, undefined)
      }
    })
    onPeerMedia(stream => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = stream
        void remoteRef.current.play().catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const call = callStateRef

  const endCallUi = () => {
    stopLocalMedia()
    setCall(null)
    const callWin = useOS.getState().windows.find(w => w.appId === 'call')
    if (callWin) useOS.getState().closeWindow(callWin.id)
  }

  if (!call) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-[12px] text-black/40 dark:bg-[#232326] dark:text-white/40">
        No active call
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[#1c1c1e]">
      {/* remote video */}
      {call.video ? (
        <video ref={remoteRef} autoPlay playsInline className="min-h-0 flex-1 bg-black object-cover" />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-b from-[#2c2c30] to-[#1c1c1e]">
          <motion.div
            animate={call.status === 'active' ? {scale: [1, 1.04, 1]} : {scale: [1, 1.08, 1]}}
            transition={
              call.status === 'active'
                ? {duration: 3, repeat: Infinity}
                : {duration: 1.2, repeat: Infinity}
            }
            className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-[40px]"
          >
            👤
          </motion.div>
        </div>
      )}

      {/* local preview */}
      {call.status === 'active' && (
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className="absolute right-3 top-3 h-28 w-40 rounded-[10px] border border-white/20 bg-black object-cover shadow-lg"
        />
      )}

      {/* status / controls */}
      <div className="flex items-center justify-between gap-2 bg-[#111113] px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white/90">{call.peerName}</div>
          <div className="text-[11px] text-white/45">
            {call.status === 'ringing'
              ? 'Incoming call…'
              : call.status === 'connecting'
              ? 'Connecting…'
              : call.video
              ? 'Video call'
              : 'Voice call'}
          </div>
        </div>
        {call.status === 'ringing' && call.incoming ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                void acceptCall(call.peerId, call.video)
                setCall({...call, status: 'active'})
                const stream = getLocalMedia()
                if (stream) pushLocalStream(stream)
              }}
              className="mac-press flex h-10 w-10 items-center justify-center rounded-full bg-[#30d158] text-[15px] text-white"
              title="Accept"
            >
              📞
            </button>
            <button
              onClick={() => {
                declineCall(call.peerId)
                endCallUi()
              }}
              className="mac-press flex h-10 w-10 items-center justify-center rounded-full bg-[#ff453a] text-[15px] text-white"
              title="Decline"
            >
              ✕
            </button>
          </div>
        ) : call.status !== 'ringing' ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const track = getLocalMedia()?.getAudioTracks()[0]
                if (track) {
                  track.enabled = muted
                  setMuted(!muted)
                }
              }}
              className={`mac-press flex h-10 w-10 items-center justify-center rounded-full text-[15px] ${
                muted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
              }`}
              title="Mute"
            >
              {muted ? '🔇' : '🎙'}
            </button>
            {call.video && (
              <button
                onClick={() => {
                  const track = getLocalMedia()?.getVideoTracks()[0]
                  if (track) {
                    track.enabled = camOn
                    setCamOn(!camOn)
                  }
                }}
                className={`mac-press flex h-10 w-10 items-center justify-center rounded-full text-[15px] ${
                  camOn ? 'bg-white/10 text-white/80' : 'bg-white/20 text-white'
                }`}
                title="Camera"
              >
                🎥
              </button>
            )}
            <button
              onClick={() => {
                hangUp(call.peerId)
                endCallUi()
              }}
              className="mac-press flex h-10 w-10 items-center justify-center rounded-full bg-[#ff453a] text-[15px] text-white"
              title="Hang up"
            >
              📵
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              declineCall(call.peerId)
              endCallUi()
            }}
            className="mac-press flex h-10 w-10 items-center justify-center rounded-full bg-[#ff453a] text-[15px] text-white"
            title="Cancel"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// local media now accessed via net.getLocalMedia()
