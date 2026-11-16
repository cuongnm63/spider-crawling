/**
 * Hiệu ứng âm thanh tổng hợp bằng Web Audio, không cần file âm thanh.
 * AudioContext chỉ được tạo/mở lại sau thao tác của người dùng (chính sách autoplay),
 * nên gọi unlockAudio() trong sự kiện click (ví dụ nút "Bắt đầu").
 */

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(value: boolean): void {
  enabled = value
}

export function unlockAudio(): void {
  if (!enabled) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function audio(): AudioContext | null {
  if (!enabled || !ctx) return null
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOptions {
  type?: OscillatorType
  gain?: number
  slideTo?: number
}

function tone(freq: number, start: number, duration: number, { type = 'sine', gain = 0.2, slideTo }: ToneOptions = {}) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

/** Tiếng lửa: nhiễu trắng qua bộ lọc thông thấp quét từ cao xuống thấp. */
function whoosh(duration: number) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2400, t0)
  filter.frequency.exponentialRampToValueAtTime(200, t0 + duration)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.15)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  src.connect(filter).connect(g).connect(c.destination)
  src.start(t0)
}

export const sfx = {
  /** Tích tắc mỗi giây trong 3 giây cuối; giây cuối cao hơn */
  tick(last: boolean) {
    tone(last ? 1320 : 880, 0, 0.09, { type: 'square', gain: 0.07 })
  },
  correct() {
    tone(660, 0, 0.12, { type: 'triangle', gain: 0.22 })
    tone(990, 0.1, 0.22, { type: 'triangle', gain: 0.22 })
  },
  wrong() {
    tone(240, 0, 0.35, { type: 'sawtooth', gain: 0.1, slideTo: 110 })
  },
  win() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => tone(f, i * 0.13, 0.22, { type: 'triangle', gain: 0.2 }))
    tone(784, 0.55, 0.7, { type: 'triangle', gain: 0.14 })
    tone(1047, 0.55, 0.7, { type: 'triangle', gain: 0.18 })
  },
  burn() {
    whoosh(1.4)
    tone(180, 0.1, 0.9, { type: 'sawtooth', gain: 0.06, slideTo: 60 })
  },
}
