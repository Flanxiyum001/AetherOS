// Synthesized UI sounds — zero audio assets, serverless by design.
let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(v: boolean) {
  enabled = v
}

/** persisted mute preference ("UI sounds" toggle in the  menu) */
export function soundEnabledPref() {
  try {
    return localStorage.getItem('aether:sound') !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabledPref(v: boolean) {
  try {
    localStorage.setItem('aether:sound', v ? 'on' : 'off')
  } catch {
    /* storage unavailable — this session only */
  }
  setSoundEnabled(v)
}

// apply the stored preference once at module load
setSoundEnabled(soundEnabledPref())

function ac(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  start: number,
  dur: number,
  gain = 0.06,
  type: OscillatorType = 'sine'
) {
  const a = ac()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  const t0 = a.currentTime + start
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(a.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

/** mac-style boot chord (F# major-ish bloom) */
export function playBoot() {
  tone(370, 0, 1.1, 0.045)
  tone(554, 0.06, 1.0, 0.035)
  tone(740, 0.12, 0.9, 0.028)
  tone(185, 0, 1.2, 0.03, 'triangle')
}

/** iMessage-style outgoing whoosh */
export function playMessageSent() {
  const a = ac()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'sine'
  const t0 = a.currentTime
  o.frequency.setValueAtTime(660, t0)
  o.frequency.exponentialRampToValueAtTime(1180, t0 + 0.11)
  g.gain.setValueAtTime(0.045, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
  o.connect(g).connect(a.destination)
  o.start(t0)
  o.stop(t0 + 0.2)
}

/** soft two-note incoming ding */
export function playMessageRecv() {
  tone(880, 0, 0.14, 0.04)
  tone(1174, 0.09, 0.18, 0.032)
}

/** transfer complete chime */
export function playTransferDone() {
  tone(987, 0, 0.12, 0.04)
  tone(1318, 0.1, 0.22, 0.04)
  tone(1567, 0.2, 0.3, 0.028)
}

/** notification pop */
export function playNotify() {
  tone(1318, 0, 0.09, 0.05, 'triangle')
  tone(1760, 0.07, 0.12, 0.03, 'triangle')
}

/** trash crumple — filtered noise burst */
export function playTrash() {
  const a = ac()
  if (!a) return
  const len = a.sampleRate * 0.22
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  }
  const src = a.createBufferSource()
  const g = a.createGain()
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 2400
  g.gain.value = 0.08
  src.buffer = buf
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

/** screenshot/camera shutter for voice-message start/stop tick */
export function playTick() {
  tone(1567, 0, 0.05, 0.035, 'square')
}
