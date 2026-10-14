import React, { useState } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { HelpCircle, X, Sparkles, Send, Mic, Volume2, ShieldAlert } from 'lucide-react';

interface GeminiHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHighContrast: boolean;
  currentStateName: string;
}

export const GeminiHelpModal: React.FC<GeminiHelpModalProps> = ({
  isOpen,
  onClose,
  isHighContrast,
  currentStateName,
}) => {
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAskAI = async (textToAsk?: string) => {
    const q = (textToAsk || query).trim();
    if (!q) return;

    setIsLoading(true);
    setAiAnswer('');
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, currentStep: currentStateName }),
      });
      const data = await res.json();
      setAiAnswer(data.answer);
      audioEngine.speak(data.answer);
    } catch (err) {
      const fallback = 'VisionPay is ready. You can say "Make a payment" or "Repeat that" anytime.';
      setAiAnswer(fallback);
      audioEngine.speak(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'How do I make a payment?',
    'How does biometric security work for blind users?',
    'What voice commands can I use?',
    'Is real money transferred in this demo?',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
          isHighContrast
            ? 'bg-black border-amber-400 text-amber-300'
            : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-xl font-bold text-white">
                VisionPay Assistant & Help
              </h2>
              <p className="text-xs text-slate-400">Accessible spoken guidance powered by Gemini AI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Close help modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Architectural Guardrail Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Deterministic Guardrail: Gemini provides accessibility guidance and answers navigation questions. Gemini never initiates, modifies, or authorizes payments.
            </span>
          </div>

          {/* Ask AI Box */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Ask a question about VisionPay
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                placeholder="Ask about voice commands, security, or navigation..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
              <button
                disabled={isLoading || !query.trim()}
                onClick={() => handleAskAI()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isLoading ? 'Thinking...' : 'Ask AI'}</span>
              </button>
            </div>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(sq);
                    handleAskAI(sq);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 transition-colors"
                >
                  "{sq}"
                </button>
              ))}
            </div>

            {/* AI Response Display */}
            {aiAnswer && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Gemini Spoken Guidance</span>
                  </span>
                  <button
                    onClick={() => audioEngine.speak(aiAnswer)}
                    className="p-1 rounded text-emerald-300 hover:text-white"
                    aria-label="Replay AI answer"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <p className="leading-relaxed">{aiAnswer}</p>
              </div>
            )}
          </div>

          {/* Complete Voice Commands Cheat Sheet */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Key Voice Commands
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-400">"Make a payment"</div>
                <div className="text-slate-400 mt-0.5">Starts the guided 7-step payment process.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-400">"Repeat that" (Press R)</div>
                <div className="text-slate-400 mt-0.5">Repeats the previous spoken prompt aloud.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-400">"Cancel payment" (Press Esc)</div>
                <div className="text-slate-400 mt-0.5">Immediately stops the transaction safely.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-400">"Confirm details"</div>
                <div className="text-slate-400 mt-0.5">Proceeds to biometric or PIN authorization.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-400">"Change amount" / "Change recipient"</div>
                <div className="text-slate-400 mt-0.5">Returns to correct recipient or amount.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-400">"Check balance"</div>
                <div className="text-slate-400 mt-0.5">Announces available account balance.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
