import React, { useState, useEffect } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { Mic, MicOff, Volume2, RotateCcw, HelpCircle, XCircle, Settings, Send, Radio } from 'lucide-react';

interface VoiceStatusHUDProps {
  onCommand: (command: string) => void;
  onRepeat: () => void;
  onCancel: () => void;
  onHelp: () => void;
  currentStateName: string;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
  screenReaderAnnouncement: string;
}

export const VoiceStatusHUD: React.FC<VoiceStatusHUDProps> = ({
  onCommand,
  onRepeat,
  onCancel,
  onHelp,
  currentStateName,
  isHighContrast,
  onToggleHighContrast,
  screenReaderAnnouncement,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [textCommandInput, setTextCommandInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [micSupported, setMicSupported] = useState(true);

  useEffect(() => {
    setMicSupported(audioEngine.isRecognitionSupported());

    const unsubListening = audioEngine.subscribeListening((listening) => {
      setIsListening(listening);
    });

    const unsubSpeaking = audioEngine.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });

    const unsubTranscript = audioEngine.subscribeTranscript((transcript, isFinal) => {
      setLiveTranscript(transcript);
      if (isFinal) {
        // keep final transcript visible for a short duration
        setTimeout(() => {
          setLiveTranscript((prev) => (prev === transcript ? '' : prev));
        }, 4000);
      }
    });

    return () => {
      unsubListening();
      unsubSpeaking();
      unsubTranscript();
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      audioEngine.stopListening();
    } else {
      audioEngine.startListening({
        onResult: (transcript) => {
          onCommand(transcript);
        },
        onError: (err) => {
          console.warn('Voice HUD listen error:', err);
        },
      });
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textCommandInput.trim()) return;
    const cmd = textCommandInput.trim();
    setTextCommandInput('');
    onCommand(cmd);
  };

  return (
    <aside
      aria-label="Voice Interaction Bar"
      className={`border-b transition-colors ${
        isHighContrast
          ? 'bg-black border-amber-400 text-amber-300'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Hidden ARIA Live region for Screen Readers */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {screenReaderAnnouncement}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Main Status & Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Live Voice Activity Status Indicator */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold border ${
                isListening
                  ? isHighContrast
                    ? 'bg-amber-400 text-black border-amber-300 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : isSpeaking
                  ? isHighContrast
                    ? 'bg-white text-black border-white'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              aria-live="polite"
            >
              {isListening ? (
                <>
                  <Radio className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>LISTENING TO YOU</span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" aria-hidden="true" />
                  <span>SPEAKING INSTRUCTIONS</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" aria-hidden="true" />
                  <span>VOICE READY</span>
                </>
              )}
            </div>

            <div className="text-xs font-medium text-slate-400 hidden sm:block">
              State: <span className="font-semibold text-slate-200">{currentStateName}</span>
            </div>
          </div>

          {/* Center / Action Buttons with Accessible Keyboard Bindings */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleListening}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isHighContrast
                  ? 'bg-amber-400 hover:bg-amber-300 text-black'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop listening (shortcut Space)' : 'Start voice input (shortcut Space)'}
              title="Shortcut: Space bar"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" aria-hidden="true" />
                  <span>Stop Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" aria-hidden="true" />
                  <span>Speak (Space)</span>
                </>
              )}
            </button>

            <button
              onClick={onRepeat}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs border transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
                isHighContrast
                  ? 'border-amber-400 hover:bg-amber-400 hover:text-black text-amber-300'
                  : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              aria-label="Repeat last spoken instructions (shortcut R)"
              title="Shortcut: Press R"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Repeat (R)</span>
            </button>

            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs border border-rose-800/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
              aria-label="Cancel current payment (shortcut Escape)"
              title="Shortcut: Press Escape"
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cancel (Esc)</span>
            </button>

            <button
              onClick={onHelp}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs border transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
                isHighContrast
                  ? 'border-amber-400 hover:bg-amber-400 hover:text-black text-amber-300'
                  : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              aria-label="Spoken help and voice commands (shortcut H)"
              title="Shortcut: Press H"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Help (H)</span>
            </button>

            <button
              onClick={onToggleHighContrast}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
                isHighContrast
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              aria-label="Toggle High-Contrast AAA Mode"
              title="Toggle High Contrast Display"
            >
              {isHighContrast ? 'AAA Contrast: ON' : 'High Contrast'}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
              aria-label="Speech and audio settings"
              aria-expanded={showSettings}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Live Heard Transcript Banner */}
        {liveTranscript && (
          <div
            className={`mt-2.5 px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${
              isHighContrast
                ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-200'
            }`}
            aria-live="polite"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Heard:</span>
            <span className="font-semibold italic">"{liveTranscript}"</span>
          </div>
        )}

        {/* Settings Drawer (Speech Rate / Volume) */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="speech-rate-slider" className="block text-slate-400 mb-1 font-medium">
                Speech Rate: <span className="text-slate-200 font-semibold">{speechRate.toFixed(2)}x</span> (Slower for clarity)
              </label>
              <input
                id="speech-rate-slider"
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={speechRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeechRate(val);
                  audioEngine.setSpeechRate(val);
                }}
                className="w-full accent-amber-400"
              />
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-2 sm:pt-0">
              <div>
                Microphone API:{' '}
                <span className={micSupported ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  {micSupported ? 'Supported (Web Speech STT)' : 'Unsupported (Use fallback bar)'}
                </span>
              </div>
              <button
                onClick={() => audioEngine.playEarcon('success')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 border border-slate-700"
              >
                Test Audio Cue
              </button>
            </div>
          </div>
        )}

        {/* Fallback Command Input Bar (For environments without mic or user preference) */}
        <form onSubmit={handleTextSubmit} className="mt-2.5 flex items-center gap-2">
          <label htmlFor="text-command-input" className="sr-only">
            Type spoken command or response
          </label>
          <input
            id="text-command-input"
            type="text"
            value={textCommandInput}
            onChange={(e) => setTextCommandInput(e.target.value)}
            placeholder='Type spoken command or say it aloud (e.g. "make a payment", "Rahul Sharma", "500 rupees", "confirm")'
            className={`flex-1 px-3 py-2 text-xs rounded-lg border focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none transition-colors ${
              isHighContrast
                ? 'bg-black border-amber-400 text-amber-200 placeholder:text-amber-600'
                : 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500'
            }`}
          />
          <button
            type="submit"
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
              isHighContrast
                ? 'bg-amber-400 hover:bg-amber-300 text-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            aria-label="Send text command"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
