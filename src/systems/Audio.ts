let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return ctx
}

function playTone(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.15, slide?: number) {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur)
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur)
}

export const Audio = {
  axe() { playTone(220, 0.08, 'square', 0.12); playTone(110, 0.12, 'sawtooth', 0.08) },
  pickaxe() { playTone(300, 0.06, 'square', 0.12); playTone(150, 0.1, 'triangle', 0.08) },
  sword() { playTone(440, 0.07, 'sawtooth', 0.1); playTone(660, 0.05, 'square', 0.06) },
  frost() { playTone(880, 0.2, 'sine', 0.1, 440); playTone(660, 0.25, 'sine', 0.08, 330) },
  lightning() { playTone(1200, 0.15, 'sawtooth', 0.12, 200); playTone(900, 0.2, 'square', 0.08, 150) },
  loot() { playTone(660, 0.08, 'sine', 0.12); setTimeout(() => playTone(880, 0.1, 'sine', 0.12), 80); setTimeout(() => playTone(1100, 0.12, 'sine', 0.12), 160) },
  campfire() { playTone(120, 0.3, 'sawtooth', 0.05) },
  hit() { playTone(180, 0.06, 'square', 0.1) },
  dodge() { playTone(500, 0.08, 'triangle', 0.08, 300) },
  build() { playTone(330, 0.1, 'square', 0.1); playTone(440, 0.1, 'square', 0.1) },
  eat() { playTone(400, 0.08, 'sine', 0.08); playTone(520, 0.08, 'sine', 0.08) },
}
