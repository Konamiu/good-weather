// 全代码合成音频：蝉鸣 / 8-bit BGM / 音效。真实录音（她的歌）后续以文件形式接入
type Step = [freq: number, at: number, dur: number]

export class AudioSys {
  private ac: AudioContext | null = null
  private bgmTimer = 0
  private cicadaGain: GainNode | null = null
  mode: 'day' | 'dusk' | 'off' = 'off'

  init() {
    if (this.ac) return
    this.ac = new AudioContext()
  }

  private osc(freq: number, at: number, dur: number, gain = 0.06, type: OscillatorType = 'square') {
    if (!this.ac) return
    const o = this.ac.createOscillator()
    const g = this.ac.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(gain, this.ac.currentTime + at)
    g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + at + dur)
    o.connect(g)
    g.connect(this.ac.destination)
    o.start(this.ac.currentTime + at)
    o.stop(this.ac.currentTime + at + dur + 0.05)
  }

  beep(seq: Step[], gain = 0.08) {
    seq.forEach(([f, at, d]) => this.osc(f, at, d, gain))
  }

  sndMsg() { this.beep([[880, 0, 0.09], [1175, 0.1, 0.12]]) }
  sndNo() { this.beep([[220, 0, 0.12]]) }
  sndOk() { this.beep([[523, 0, 0.07], [659, 0.08, 0.07], [784, 0.16, 0.1]]) }

  cicada(on: boolean) {
    if (!this.ac) return
    if (on && !this.cicadaGain) {
      const buf = this.ac.createBuffer(1, this.ac.sampleRate * 2, this.ac.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const src = this.ac.createBufferSource()
      src.buffer = buf
      src.loop = true
      const bp = this.ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 4200
      bp.Q.value = 8
      const g = this.ac.createGain()
      g.gain.value = 0.05
      const lfo = this.ac.createOscillator()
      lfo.frequency.value = 11
      const lg = this.ac.createGain()
      lg.gain.value = 0.03
      lfo.connect(lg)
      lg.connect(g.gain)
      src.connect(bp)
      bp.connect(g)
      g.connect(this.ac.destination)
      src.start()
      lfo.start()
      this.cicadaGain = g
    } else if (!on && this.cicadaGain) {
      this.cicadaGain.gain.linearRampToValueAtTime(0, this.ac.currentTime + 2)
      this.cicadaGain = null
    }
  }

  /** 轻快小调循环；dusk 模式降八度减速 */
  bgm(mode: 'day' | 'dusk' | 'off') {
    if (this.mode === mode) return
    this.mode = mode
    clearInterval(this.bgmTimer)
    if (mode === 'off') return
    const mel = [659, 784, 880, 784, 659, 587, 659, 0, 523, 587, 659, 784, 659, 587, 523, 0]
    let i = 0
    const step = mode === 'day' ? 280 : 420
    this.bgmTimer = window.setInterval(() => {
      const f = mel[i++ % mel.length]
      if (f) this.osc(mode === 'day' ? f : f / 2, 0, 0.22, 0.045)
    }, step)
  }
}
