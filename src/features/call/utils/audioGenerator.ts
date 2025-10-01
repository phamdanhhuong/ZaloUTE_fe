/**
 * Audio Generator Utility
 * Generates call sounds programmatically using Web Audio API
 */

export interface GeneratedSoundOptions {
  frequency?: number;
  duration?: number;
  volume?: number;
  type?: OscillatorType;
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * Service for generating call sounds using Web Audio API
 */
export class AudioGeneratorService {
  private static instance: AudioGeneratorService;
  private audioContext: AudioContext | null = null;

  private constructor() {
    this.initializeAudioContext();
  }

  public static getInstance(): AudioGeneratorService {
    if (!AudioGeneratorService.instance) {
      AudioGeneratorService.instance = new AudioGeneratorService();
    }
    return AudioGeneratorService.instance;
  }

  private initializeAudioContext(): void {
    try {
      if (typeof window !== 'undefined') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } catch (error) {
      console.error('Web Audio API not supported:', error);
    }
  }

  /**
   * Generate a simple tone
   */
  public async generateTone(options: GeneratedSoundOptions = {}): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      console.error('AudioContext not available');
      return null;
    }

    const {
      frequency = 440,
      duration = 1,
      volume = 0.3,
      type = 'sine',
      fadeIn = 0.1,
      fadeOut = 0.1
    } = options;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let amplitude = volume;

      // Apply fade in
      if (t < fadeIn) {
        amplitude *= t / fadeIn;
      }

      // Apply fade out
      if (t > duration - fadeOut) {
        amplitude *= (duration - t) / fadeOut;
      }

      // Generate waveform
      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'triangle':
          sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
          break;
      }

      data[i] = sample * amplitude;
    }

    return buffer;
  }

  /**
   * Generate ringtone (alternating tones)
   */
  public async generateRingtone(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 4; // 4 seconds
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const ringCycle = t % 2; // 2-second cycle
      
      let sample = 0;
      if (ringCycle < 1) {
        // First second: dual tone (like phone ring)
        const freq1 = 440; // A4
        const freq2 = 554; // C#5
        sample = 0.2 * (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t));
        
        // Envelope for ring pattern
        const envelope = Math.sin(Math.PI * ringCycle);
        sample *= envelope;
      }
      // Second second: silence
      
      data[i] = sample;
    }

    return buffer;
  }

  /**
   * Generate busy tone
   */
  public async generateBusyTone(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 3;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const cycle = t % 1; // 1-second cycle
      
      let sample = 0;
      if (cycle < 0.5) {
        // 0.5 second tone
        const frequency = 480;
        sample = 0.3 * Math.sin(2 * Math.PI * frequency * t);
      }
      // 0.5 second silence
      
      data[i] = sample;
    }

    return buffer;
  }

  /**
   * Generate connection established sound
   */
  public async generateConnectedTone(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.8;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Ascending tone to indicate connection
      const baseFreq = 300;
      const endFreq = 600;
      const frequency = baseFreq + (endFreq - baseFreq) * (t / duration);
      
      const envelope = Math.exp(-t * 3); // Decay envelope
      const sample = 0.2 * Math.sin(2 * Math.PI * frequency * t) * envelope;
      
      data[i] = sample;
    }

    return buffer;
  }

  /**
   * Generate call end tone
   */
  public async generateEndTone(): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 1;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Descending tone to indicate end
      const baseFreq = 400;
      const endFreq = 200;
      const frequency = baseFreq - (baseFreq - endFreq) * (t / duration);
      
      const envelope = Math.exp(-t * 2); // Decay envelope
      const sample = 0.15 * Math.sin(2 * Math.PI * frequency * t) * envelope;
      
      data[i] = sample;
    }

    return buffer;
  }

  /**
   * Play generated audio buffer
   */
  public async playBuffer(buffer: AudioBuffer, loop: boolean = false): Promise<AudioBufferSourceNode | null> {
    if (!this.audioContext || !buffer) return null;

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(this.audioContext.destination);
    source.start();

    return source;
  }

  /**
   * Create and cache generated sounds
   */
  public async createCallSounds(): Promise<{[key: string]: AudioBuffer}> {
    const sounds: {[key: string]: AudioBuffer} = {};

    try {
      const [ringtone, busyTone, connectedTone, endTone] = await Promise.all([
        this.generateRingtone(),
        this.generateBusyTone(),
        this.generateConnectedTone(),
        this.generateEndTone()
      ]);

      if (ringtone) sounds.incoming = ringtone;
      if (ringtone) sounds.outgoing = ringtone; // Same as incoming for now
      if (connectedTone) sounds.connected = connectedTone;
      if (endTone) sounds.ended = endTone;
      if (busyTone) sounds.busy = busyTone;


      return sounds;
    } catch (error) {
      console.error('Failed to generate call sounds:', error);
      return {};
    }
  }

  /**
   * Get audio context state
   */
  public getAudioContextState(): AudioContextState | null {
    return this.audioContext?.state || null;
  }

  /**
   * Resume audio context (required for user interaction)
   */
  public async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Lazy getter for singleton instance (only initialize on client-side)
export const getAudioGeneratorService = (): AudioGeneratorService => {
  if (typeof window === 'undefined') {
    // Return a mock service for SSR
    return {
      createCallSounds: async () => ({}),
      generateTone: async () => null,
      generateRingtone: async () => null,
      generateBusyTone: async () => null,
      generateConnectedBeep: async () => null,
      generateEndCallTone: async () => null,
      playBuffer: async () => null,
      resumeAudioContext: async () => {}
    } as any;
  }
  return AudioGeneratorService.getInstance();
};