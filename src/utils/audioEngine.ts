// High-Fidelity Audio Engine: Web Audio Earcons + Speech Synthesis + Speech Recognition

export type EarconType =
  | 'start_listen'
  | 'stop_listen'
  | 'recognized'
  | 'error'
  | 'success'
  | 'warning'
  | 'step_advance'
  | 'cancel';

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private speechSynth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private lastSpokenText: string = '';
  private isSpeaking: boolean = false;
  private isListening: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private speechRate: number = 0.95; // slightly slower for maximum accessibility comprehension

  // Listeners
  private onSpeakingChangeCallbacks: Set<(isSpeaking: boolean) => void> = new Set();
  private onListeningChangeCallbacks: Set<(isListening: boolean) => void> = new Set();
  private onTranscriptCallbacks: Set<(transcript: string, isFinal: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.speechSynth = window.speechSynthesis;
        this.initVoice();
        if (this.speechSynth.onvoiceschanged !== undefined) {
          this.speechSynth.onvoiceschanged = () => this.initVoice();
        }
      }
    }
  }

  private initVoice() {
    if (!this.speechSynth) return;
    const voices = this.speechSynth.getVoices();
    // Prioritize natural Indian English, then clean English voices
    const inVoice = voices.find((v) => v.lang.includes('en-IN'));
    const gbVoice = voices.find((v) => v.lang.includes('en-GB'));
    const usVoice = voices.find((v) => v.lang.includes('en-US'));
    this.selectedVoice = inVoice || gbVoice || usVoice || voices[0] || null;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (this.speechSynth && !this.speechSynth.speaking) {
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        this.speechSynth.speak(primer);
      }
    } catch (e) {
      // ignore
    }
  }

  public vibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore
      }
    }
  }

  // ==========================================================================
  // EARCONS / ACCESSIBLE AUDIO FEEDBACK
  // ==========================================================================
  public playEarcon(type: EarconType) {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      switch (type) {
        case 'start_listen': {
          this.vibrate(40);
          // Ascending two-tone chime (Listening started)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now); // A4
          osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc1.stop(now + 0.1);
          osc2.start(now + 0.08);
          osc2.stop(now + 0.25);
          break;
        }

        case 'stop_listen': {
          this.vibrate(25);
          // Descending soft cue (Microphone closed)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'recognized': {
          // Quick positive recognition ping
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(784, now); // G5

          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'step_advance': {
          // Two pleasant ascending notes
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880, now + 0.07); // A5

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'success': {
          // Triad fanfare (C5 -> E5 -> G5 -> C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.12, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.35);
          });
          break;
        }

        case 'error': {
          // Low double buzz
          [0, 0.1].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now + delay);
            osc.frequency.exponentialRampToValueAtTime(160, now + delay + 0.08);

            gain.gain.setValueAtTime(0.08, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + delay);
            osc.stop(now + delay + 0.08);
          });
          break;
        }

        case 'cancel': {
          // Low downward slide
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'warning': {
          // Staccato alert beeps
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(440, now);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
      }
    } catch (e) {
      console.warn('Audio earcon error:', e);
    }
  }

  // ==========================================================================
  // TEXT-TO-SPEECH (TTS)
  // ==========================================================================
  public speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
      onStart?: () => void;
      interrupt?: boolean;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.speechSynth) {
        console.warn('Speech synthesis not supported in this environment');
        resolve();
        return;
      }

      // Prevent feedback loops: stop listening while speaking aloud
      if (this.isListening) {
        this.stopListening();
      }

      // Stop previous speech if interrupt is true (default true)
      if (options?.interrupt !== false) {
        this.speechSynth.cancel();
      }

      this.lastSpokenText = text;
      const utterance = new SpeechSynthesisUtterance(text);

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.rate = options?.rate || this.speechRate;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.notifySpeaking(true);
        if (options?.onStart) options.onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.notifySpeaking(false);
        if (options?.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        this.isSpeaking = false;
        this.notifySpeaking(false);
        if (options?.onEnd) options.onEnd();
        resolve();
      };

      this.speechSynth.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
      this.isSpeaking = false;
      this.notifySpeaking(false);
    }
  }

  public repeatLast(): Promise<void> {
    if (this.lastSpokenText) {
      return this.speak(`Repeating: ${this.lastSpokenText}`);
    } else {
      return this.speak('There is nothing to repeat yet. Please ask for help or say "make a payment".');
    }
  }

  public getLastSpoken(): string {
    return this.lastSpokenText;
  }

  public setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.6, Math.min(1.5, rate));
  }

  public getSpeechRate(): number {
    return this.speechRate;
  }

  // ==========================================================================
  // SPEECH RECOGNITION (STT)
  // ==========================================================================
  public isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public async requestMicrophonePermission(): Promise<'granted' | 'denied' | 'unsupported'> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return 'granted';
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          return 'denied';
        }
        return 'denied';
      }
    }
    if (!this.isRecognitionSupported()) {
      return 'unsupported';
    }
    return 'granted';
  }

  private silenceTimer: any = null;

  public startListening(callbacks: {
    onResult: (transcript: string) => void;
    onError?: (error: string, code?: 'not-allowed' | 'no-speech' | 'network' | 'aborted' | 'unsupported' | 'unknown') => void;
    onEnd?: () => void;
    onTimeout?: () => void;
    continuous?: boolean;
  }) {
    if (!this.isRecognitionSupported()) {
      callbacks.onError?.(
        'Speech recognition is not supported in this browser. Please open in Google Chrome or use the accessible text command fallback.',
        'unsupported'
      );
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Stop TTS if speaking so mic doesn't catch own voice
    this.stopSpeaking();
    this.clearSilenceTimer();

    try {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'en-IN'; // Default to Indian English recognition
      this.recognition.continuous = callbacks.continuous ?? false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 2;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.notifyListening(true);
        this.playEarcon('start_listen');

        // Set 8.5 second silence timeout
        this.silenceTimer = setTimeout(() => {
          if (this.isListening) {
            console.log('Voice interaction silence timeout reached');
            this.stopListening();
            callbacks.onTimeout?.();
            callbacks.onError?.('No speech was detected. Tap Retry Voice Input or tap anywhere on the screen to try again.', 'no-speech');
          }
        }, 8500);
      };

      this.recognition.onresult = (event: any) => {
        this.clearSilenceTimer();
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript) {
          this.notifyTranscript(interimTranscript, false);
        }

        if (finalTranscript) {
          const clean = finalTranscript.trim();
          this.notifyTranscript(clean, true);
          this.playEarcon('recognized');
          callbacks.onResult(clean);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.clearSilenceTimer();
        console.warn('Speech recognition error:', event.error);
        this.isListening = false;
        this.notifyListening(false);
        this.playEarcon('stop_listen');

        let msg = 'Could not understand speech. Tap Retry to speak again.';
        let code: 'not-allowed' | 'no-speech' | 'network' | 'aborted' | 'unsupported' | 'unknown' = 'unknown';

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          msg = 'Microphone permission was denied. Please allow microphone access in your browser settings, then tap Retry.';
          code = 'not-allowed';
        } else if (event.error === 'audio-capture') {
          msg = 'No microphone was detected. Please connect a working microphone and tap Retry.';
          code = 'not-allowed';
        } else if (event.error === 'no-speech') {
          msg = 'No speech was detected. Tap Retry or speak louder.';
          code = 'no-speech';
        } else if (event.error === 'network') {
          msg = 'Speech recognition network error. Please check your internet connection and tap Retry.';
          code = 'network';
        } else if (event.error === 'aborted') {
          msg = 'Speech recognition was cancelled.';
          code = 'aborted';
        }

        callbacks.onError?.(msg, code);
      };

      this.recognition.onend = () => {
        this.clearSilenceTimer();
        this.isListening = false;
        this.notifyListening(false);
        this.playEarcon('stop_listen');
        callbacks.onEnd?.();
      };

      this.recognition.start();
    } catch (e: any) {
      this.clearSilenceTimer();
      console.warn('Failed to start recognition:', e);
      this.isListening = false;
      this.notifyListening(false);
      callbacks.onError?.('Could not activate speech recognition. Tap Retry or use keyboard fallback.', 'unknown');
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  public stopListening() {
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        // Detach event listeners to prevent delayed events from firing into new recognition sessions
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
    this.notifyListening(false);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================
  public subscribeSpeaking(cb: (isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.add(cb);
    return () => this.onSpeakingChangeCallbacks.delete(cb);
  }

  public subscribeListening(cb: (isListening: boolean) => void) {
    this.onListeningChangeCallbacks.add(cb);
    return () => this.onListeningChangeCallbacks.delete(cb);
  }

  public subscribeTranscript(cb: (transcript: string, isFinal: boolean) => void) {
    this.onTranscriptCallbacks.add(cb);
    return () => this.onTranscriptCallbacks.delete(cb);
  }

  private notifySpeaking(val: boolean) {
    this.onSpeakingChangeCallbacks.forEach((cb) => cb(val));
  }

  private notifyListening(val: boolean) {
    this.onListeningChangeCallbacks.forEach((cb) => cb(val));
  }

  private notifyTranscript(t: string, isFinal: boolean) {
    this.onTranscriptCallbacks.forEach((cb) => cb(t, isFinal));
  }
}

export const audioEngine = new AudioEngine();
