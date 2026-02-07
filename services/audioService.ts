
class AudioService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    this.playTone(400, 'sine', 0.2, 0.2);
    setTimeout(() => this.playTone(600, 'sine', 0.2, 0.1), 50);
  }

  playFall() {
    this.playTone(200, 'sawtooth', 0.5, 0.2);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.5, 0.1), 100);
  }

  playPoint() {
    this.playTone(800, 'triangle', 0.1, 0.1);
  }

  playStart() {
    this.playTone(440, 'square', 0.3, 0.1);
    setTimeout(() => this.playTone(554, 'square', 0.3, 0.1), 150);
    setTimeout(() => this.playTone(659, 'square', 0.3, 0.1), 300);
  }
}

export const audioService = new AudioService();
