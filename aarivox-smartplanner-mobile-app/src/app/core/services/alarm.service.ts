import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  private activeAudio: HTMLAudioElement | null = null;
  private isAlarmPlayingSignal = signal(false);
  private vibrationInterval: any = null;
  private synthInterval: any = null;

  isAlarmPlaying = this.isAlarmPlayingSignal.asReadonly();

  constructor() {}

  /**
   * Play alarm sound (with vibration). Supports custom sounds or local assets, falling back to Synthesized Web Audio.
   */
  async startAlarm(soundPath: string = 'assets/sounds/alarm-chime.mp3', loop: boolean = true) {
    if (this.isAlarmPlayingSignal()) {
      this.stopAlarm();
    }

    try {
      this.activeAudio = new Audio(soundPath);
      this.activeAudio.loop = loop;
      await this.activeAudio.play();
      this.isAlarmPlayingSignal.set(true);
      
      // Start recurring device vibration
      this.startVibration();
      console.log('Alarm started playing MP3: ' + soundPath);
    } catch (error) {
      console.warn('Failed to play MP3 audio. Activating Web Audio Synthesizer fallback.', error);
      
      // Start Synthesized chime & vibration fallbacks
      this.isAlarmPlayingSignal.set(true);
      this.startVibration();
      this.startSynthSequence();
    }
  }

  /**
   * Stop any active alarm audio, synthesizers, and clear vibration intervals.
   */
  stopAlarm() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
    
    this.stopSynthSequence();
    this.stopVibration();
    this.isAlarmPlayingSignal.set(false);
    console.log('Alarm stopped.');
  }

  /**
   * Trigger single vibration pulse
   */
  async triggerVibration(durationMs: number = 500) {
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.vibrate({ duration: durationMs });
    } catch (e) {
      if (navigator.vibrate) {
        navigator.vibrate(durationMs);
      } else {
        console.log('[Mock Vibration] Vibrating device for ' + durationMs + 'ms');
      }
    }
  }

  private startVibration() {
    this.stopVibration();
    // Vibrate 500ms on, 500ms off
    this.triggerVibration(500);
    this.vibrationInterval = setInterval(() => {
      this.triggerVibration(500);
    }, 1000);
  }

  private stopVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  /**
   * Synthesize a dual-tone chime sound sequence using modern Web Audio APIs.
   */
  private playSynthChime() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const playTone = (frequency: number, delay: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + delay);

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      // Play a high-quality dual-tone chord (D5 -> A5 -> D6)
      playTone(587.33, 0, 0.3);   // D5
      playTone(880.00, 0.1, 0.4);  // A5
      playTone(1174.66, 0.2, 0.5); // D6
    } catch (e) {
      console.warn('Web Audio synth failed:', e);
    }
  }

  private startSynthSequence() {
    this.stopSynthSequence();
    this.playSynthChime();
    this.synthInterval = setInterval(() => {
      this.playSynthChime();
    }, 2000); // repeat synth chord every 2 seconds
  }

  private stopSynthSequence() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
}
