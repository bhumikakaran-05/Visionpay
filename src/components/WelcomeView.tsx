import React, { useEffect } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { Mic, Shield, EyeOff, Sparkles, ArrowRight, Play } from 'lucide-react';

interface WelcomeViewProps {
  onStartDemo: () => void;
  onGoToAuth: () => void;
  onOpenExhibitionBrief: () => void;
  onOpenTestRunner: () => void;
  isHighContrast: boolean;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onStartDemo,
  onGoToAuth,
  onOpenExhibitionBrief,
  onOpenTestRunner,
  isHighContrast,
}) => {
  useEffect(() => {
    audioEngine.speak(
      'Welcome to VisionPay. A voice-first accessible payment system for blind and visually impaired users. Say "Start demo" or press the space bar to begin.'
    );
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/30">
          <EyeOff className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span>ACCESSIBILITY FIRST &middot; VOICE DRIVEN</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          VisionPay
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The autonomous, voice-first payment system designed so blind users can identify recipients, review amounts, authorize securely, and hear verified results without sighted assistance.
        </p>

        {/* Primary Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartDemo}
            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center gap-3 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
              isHighContrast
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
            aria-label="Start Voice Demo Experience"
          >
            <Play className="w-5 h-5 fill-current" aria-hidden="true" />
            <span>Start Voice Demo (Say "Start")</span>
          </button>

          <button
            onClick={onGoToAuth}
            className="px-6 py-4 rounded-2xl font-semibold text-base transition-colors bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
            aria-label="Log in with PIN or Account"
          >
            Log In / Switch Account
          </button>
        </div>
      </div>

      {/* 3 Core Principles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          className={`p-6 rounded-2xl border space-y-2.5 ${
            isHighContrast
              ? 'bg-black border-amber-400 text-amber-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-200'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Mic className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-white">Voice-First Navigation</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every step is spoken aloud and accepts natural speech. No need to hunt for tiny buttons or squint at low-contrast displays.
          </p>
        </div>

        <div
          className={`p-6 rounded-2xl border space-y-2.5 ${
            isHighContrast
              ? 'bg-black border-amber-400 text-amber-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-200'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-white">Guaranteed Review</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Transactions are never charged without a full spoken read-back of recipient name, mobile ending digits, and rupee amount.
          </p>
        </div>

        <div
          className={`p-6 rounded-2xl border space-y-2.5 ${
            isHighContrast
              ? 'bg-black border-amber-400 text-amber-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-200'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-white">Safe College Demo</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Strictly labelled demo mode with idempotency guards and zero real money transfers. Perfect for faculty evaluation.
          </p>
        </div>
      </div>

      {/* College Project Evaluation Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white">College Major Project Deliverables</h4>
          <p className="text-xs text-slate-400">
            View Node/Express Port 5000 configuration, MongoDB Atlas schema, and automated test runners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTestRunner}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Run 17 Test Cases
          </button>
          <button
            onClick={onOpenExhibitionBrief}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-black transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Exhibition Brief (3-Min Script)
          </button>
        </div>
      </div>
    </div>
  );
};
