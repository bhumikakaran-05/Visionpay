import React, { useState, useEffect, useRef } from 'react';
import { WorkflowState, PaymentDraft, TransactionRecord, VoiceStatus } from '../types/payment';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import {
  RotateCcw,
  X,
  Keyboard,
  Send,
  Fingerprint,
  RefreshCw,
  AlertCircle,
  Radio,
  Volume2,
  MicOff,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface MobileVoiceScreenProps {
  workflowState: WorkflowState;
  paymentStep: number;
  voiceStatus: VoiceStatus;
  systemPromptText: string;
  heardTranscript: string;
  screenReaderAnnouncement: string;
  onScreenTap: () => void;
  onRepeat: () => void;
  onCancel: () => void;
  onHelp: () => void;
  onRetryMicPermission: () => void;
  onSendTextCommand: (cmd: string) => void;
  draft: PaymentDraft;
  lastTransaction: TransactionRecord | null;
  onQuickPinSubmit?: (pin: string) => void;
  onBiometricAuthorize?: () => void;
  micErrorMessage?: string | null;
  recognitionError?: string | null;
  onRetryRecognition?: () => void;
  lastRecognizedSpeech?: string;
  onOpenDevTools?: () => void;
}

export const MobileVoiceScreen: React.FC<MobileVoiceScreenProps> = ({
  workflowState,
  paymentStep,
  voiceStatus,
  systemPromptText,
  heardTranscript,
  screenReaderAnnouncement,
  onScreenTap,
  onRepeat,
  onCancel,
  onHelp,
  onRetryMicPermission,
  onSendTextCommand,
  draft,
  lastTransaction,
  onQuickPinSubmit,
  onBiometricAuthorize,
  micErrorMessage,
  recognitionError,
  onRetryRecognition,
  lastRecognizedSpeech,
  onOpenDevTools,
}) => {
  const [showKeyboardFallback, setShowKeyboardFallback] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [pinEntry, setPinEntry] = useState('');
  const [logoTapCount, setLogoTapCount] = useState(0);
  const textInputRef = useRef<HTMLInputElement>(null);

  // If mic becomes unavailable, auto-open keyboard fallback for accessibility
  useEffect(() => {
    if (voiceStatus === 'MICROPHONE_UNAVAILABLE') {
      setShowKeyboardFallback(true);
    }
  }, [voiceStatus]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const cmd = textInput.trim();
    setTextInput('');
    onSendTextCommand(cmd);
  };

  const handleLogoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCount = logoTapCount + 1;
    setLogoTapCount(newCount);
    if (newCount >= 3) {
      setLogoTapCount(0);
      onOpenDevTools?.();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] max-h-[100dvh] flex flex-col justify-between bg-[#FAF9F6] text-[#0A192F] relative select-none font-sans overflow-hidden">
      {/* Screen Reader ARIA Live Region */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {screenReaderAnnouncement}
      </div>

      {/* 1. Header: VisionPay Identity + Status Indicator (Synchronized) */}
      <header className="px-5 py-3 flex items-center justify-between border-b border-slate-200/90 z-20 shrink-0 bg-white/80 backdrop-blur-sm">
        <div
          onClick={handleLogoTap}
          className="flex items-center gap-2.5 cursor-pointer"
          title="VisionPay"
          role="banner"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
            V
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-[#0A192F] text-base leading-tight block">
              VisionPay
            </span>
            <span className="block text-[10px] text-blue-700 font-semibold tracking-wide">
              Voice-First Accessible Banking
            </span>
          </div>
        </div>

        {/* Synchronized Live Voice Status Tag */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
              voiceStatus === 'SPEAKING'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : voiceStatus === 'LISTENING'
                ? 'bg-blue-50 text-blue-700 border-blue-400 animate-pulse'
                : voiceStatus === 'PROCESSING'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : voiceStatus === 'MICROPHONE_UNAVAILABLE'
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : voiceStatus === 'ERROR'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {voiceStatus === 'SPEAKING' ? (
              <>
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>SPEAKING</span>
              </>
            ) : voiceStatus === 'LISTENING' ? (
              <>
                <Radio className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>LISTENING</span>
              </>
            ) : voiceStatus === 'PROCESSING' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>PROCESSING</span>
              </>
            ) : voiceStatus === 'MICROPHONE_UNAVAILABLE' ? (
              <>
                <MicOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>MIC BLOCKED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" />
                <span>READY</span>
              </>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowKeyboardFallback(!showKeyboardFallback);
              if (!showKeyboardFallback) {
                setTimeout(() => textInputRef.current?.focus(), 150);
              }
            }}
            className={`p-1.5 rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${
              showKeyboardFallback
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle Accessible Keyboard Input"
            aria-label={showKeyboardFallback ? 'Hide text input fallback' : 'Show text input fallback'}
            aria-expanded={showKeyboardFallback}
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Status Banners: Microphone Permission Notice, Listening Announcement, or Recognition Error Notice */}
      {voiceStatus === 'MICROPHONE_UNAVAILABLE' && (
        <div
          role="alert"
          className="mx-4 mt-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs shrink-0 flex flex-col gap-2 shadow-xs"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Microphone Access Denied: </span>
              {micErrorMessage || 'Permission is required for voice interaction. Please allow microphone in browser site settings.'}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onRetryMicPermission}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-400 shadow-sm transition-colors"
              aria-label="Retry microphone permission request"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Permission</span>
            </button>
            <span className="text-[11px] text-rose-700">Or use the keyboard below.</span>
          </div>
        </div>
      )}

      {/* Clear Listening Announcement Banner */}
      {voiceStatus === 'LISTENING' && (
        <div
          role="status"
          aria-live="assertive"
          className="mx-4 mt-2 px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-400 text-blue-900 text-xs shrink-0 flex items-center justify-between shadow-xs animate-pulse"
        >
          <div className="flex items-center gap-2 font-bold">
            <Radio className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Listening for your voice... Speak your response now</span>
          </div>
          <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-mono font-semibold">
            Chrome Mic
          </span>
        </div>
      )}

      {/* Helpful Recognition Error Notice & User Retry */}
      {voiceStatus === 'ERROR' && recognitionError && (
        <div
          role="alert"
          className="mx-4 mt-2 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs shrink-0 flex flex-col gap-2 shadow-xs"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Voice Recognition Notice: </span>
              <span>{recognitionError}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRetryRecognition) onRetryRecognition();
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-400 shadow-sm transition-colors"
              aria-label="Retry speech recognition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Voice Input</span>
            </button>
            <span className="text-[11px] text-amber-800">Or tap anywhere on the screen</span>
          </div>
        </div>
      )}

      {/* 3. Central Interactive Touch Surface (Responsive, No Overflow) */}
      <main
        onClick={onScreenTap}
        className="flex-1 flex flex-col items-center justify-center px-6 py-2 text-center cursor-pointer active:bg-blue-50/30 transition-colors touch-manipulation z-10 overflow-y-auto"
        role="button"
        tabIndex={0}
        aria-label="Tap anywhere on the screen to interact. Voice prompt is active."
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onScreenTap();
          }
        }}
      >
        {/* Step Indicator (If in active payment workflow) */}
        {workflowState.startsWith('STEP_') && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span>STEP {paymentStep} OF 7</span>
            <span>&middot;</span>
            <span className="uppercase font-sans font-bold">
              {paymentStep === 1 && 'Select Recipient'}
              {paymentStep === 2 && 'Verify Recipient'}
              {paymentStep === 3 && 'Payment Amount'}
              {paymentStep === 4 && 'Review Transaction'}
              {paymentStep === 5 && 'Authorization'}
              {paymentStep === 6 && 'Executing'}
              {paymentStep === 7 && 'Verified Result'}
            </span>
          </div>
        )}

        {/* Visualizer reflecting actual state */}
        <SoundWaveVisualizer status={voiceStatus} />

        {/* Single Clear Spoken Question / Prompt */}
        <div className="max-w-sm space-y-3 mt-1">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0A192F] leading-snug">
            {systemPromptText}
          </h1>

          {/* Display Recognized Speech on Screen for Debugging */}
          <div
            className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center justify-between max-w-sm mx-auto shadow-xs text-left"
            aria-live="polite"
            title="Speech recognition debug output"
          >
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <span className="text-[10px] uppercase tracking-wider bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                Recognized:
              </span>
              <span className="font-mono text-blue-900 font-bold truncate">
                {heardTranscript || lastRecognizedSpeech ? (
                  `"${heardTranscript || lastRecognizedSpeech}"`
                ) : (
                  <span className="text-slate-400 font-normal italic">None yet (speak to test)</span>
                )}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500 shrink-0 uppercase font-semibold">
              {voiceStatus}
            </span>
          </div>

          {/* Transaction Review Summary on Step 4 */}
          {paymentStep === 4 && draft.recipient && draft.amount && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 text-left text-xs space-y-1.5 mt-1 shadow-sm cursor-default"
            >
              <div className="flex justify-between items-center text-slate-600">
                <span>To:</span>
                <span className="font-bold text-[#0A192F] text-sm">{draft.recipient.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Mobile Number:</span>
                <span className="font-mono text-slate-800 font-semibold">{draft.recipient.mobile}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Verified Provider:</span>
                <span className="font-semibold text-slate-700">{draft.recipient.bankName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Funding Source:</span>
                <span className="font-semibold text-blue-800">VisionPay Test Balance</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1">
                <span>Amount:</span>
                <span className="font-mono text-blue-700 font-extrabold text-base">₹{draft.amount.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-amber-800 bg-amber-50 rounded-lg p-1.5 font-medium">
                Notice: Development sandbox test mode. No real money or bank transfer will occur.
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5 italic text-center">
                Say "Confirm details" to continue, "Change amount", or "Cancel payment".
              </p>
            </div>
          )}

          {/* Authentication on Step 5 */}
          {paymentStep === 5 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5 cursor-default shadow-sm"
            >
              <div className="text-[11px] text-slate-600 text-center font-medium">
                Funding Source: <span className="font-bold text-slate-800">VisionPay Test Wallet (Sandbox)</span>
              </div>
              <button
                onClick={onBiometricAuthorize}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors focus-visible:ring-4 focus-visible:ring-blue-300"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Verify Biometric Sensor / Passkey</span>
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={pinEntry}
                  onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, ''))}
                  placeholder="Demo PIN: 2580"
                  className="flex-1 py-1.5 text-center font-mono text-base rounded-xl bg-slate-50 border border-slate-300 text-[#0A192F] focus:border-blue-600 focus:outline-none"
                  aria-label="Enter 4-digit VisionPay PIN"
                />
                <button
                  onClick={() => onQuickPinSubmit && onQuickPinSubmit(pinEntry)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                >
                  Verify PIN
                </button>
              </div>
            </div>
          )}

          {/* Outcome Receipt on Step 7 */}
          {paymentStep === 7 && lastTransaction && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-3.5 rounded-2xl bg-white border border-emerald-300 text-left text-xs space-y-1.5 mt-1 shadow-sm cursor-default"
            >
              <div className="text-center font-mono font-bold text-blue-700 text-[10px] uppercase tracking-wide bg-blue-50 py-1 rounded-md">
                {lastTransaction.disclaimer || 'DEVELOPMENT SANDBOX — NO REAL MONEY TRANSFERRED'}
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Reference ID:</span>
                <span className="font-mono text-[#0A192F] font-bold">{lastTransaction.referenceId}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Recipient:</span>
                <span className="font-bold text-[#0A192F]">{lastTransaction.recipientName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Funding Source:</span>
                <span className="text-blue-800 font-medium">VisionPay Test Balance</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount:</span>
                <span className="font-mono text-emerald-700 font-bold text-sm">₹{lastTransaction.amount}</span>
              </div>
              <div className="text-center text-[11px] text-emerald-800 bg-emerald-50 rounded-lg p-1.5 font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Returning to home screen automatically...</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Spoken State Helper Text */}
        <div className="mt-6 text-xs font-semibold tracking-wider text-slate-500">
          {voiceStatus === 'MICROPHONE_UNAVAILABLE' ? (
            <span className="text-rose-700 font-bold uppercase">&bull; Voice Input Disabled &middot; Tap Retry or Use Keyboard</span>
          ) : voiceStatus === 'LISTENING' ? (
            <span className="text-blue-700 font-bold uppercase animate-pulse">&bull; Listening to voice... Tap anywhere to stop</span>
          ) : voiceStatus === 'SPEAKING' ? (
            <span className="text-emerald-700 font-bold uppercase">&bull; Speaking prompt... Tap anywhere to interrupt & speak</span>
          ) : voiceStatus === 'PROCESSING' ? (
            <span className="text-blue-800 font-bold uppercase">&bull; Processing request...</span>
          ) : (
            <span className="text-slate-600 uppercase font-medium">&bull; Tap anywhere on screen to speak</span>
          )}
        </div>
      </main>

      {/* 4. Accessible Keyboard Fallback Input Drawer */}
      {showKeyboardFallback && (
        <form
          onSubmit={handleTextSubmit}
          className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center gap-2 z-20 shadow-sm shrink-0"
          aria-label="Accessible command text entry"
        >
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder='Type command (e.g. "make a payment", "Rahul", "500", "confirm")'
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-[#0A192F] focus:border-blue-600 focus:outline-none"
            aria-label="Type spoken command"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
            aria-label="Send text command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* 5. Minimal Tactile Bottom Bar (Predictable Actions) */}
      <footer className="px-5 py-3 border-t border-slate-200 bg-white z-20 shrink-0">
        <div className="grid grid-cols-3 gap-2.5">
          {/* Left: Repeat Prompt (R) */}
          <button
            onClick={onRepeat}
            className="py-2.5 px-2 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-[#0A192F] text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all focus-visible:ring-4 focus-visible:ring-blue-300"
            aria-label="Repeat last prompt aloud (or press R)"
          >
            <RotateCcw className="w-4 h-4 text-blue-700" />
            <span>Repeat</span>
          </button>

          {/* Center: Tap to Speak / Mic Toggle */}
          <button
            onClick={onScreenTap}
            className={`py-3 px-2 rounded-2xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all shadow-md active:scale-95 focus-visible:ring-4 focus-visible:ring-blue-300 ${
              voiceStatus === 'MICROPHONE_UNAVAILABLE'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : voiceStatus === 'LISTENING'
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            aria-label={
              voiceStatus === 'MICROPHONE_UNAVAILABLE'
                ? 'Microphone blocked. Tap to retry permission.'
                : voiceStatus === 'LISTENING'
                ? 'Stop listening'
                : 'Start speaking (or press Space)'
            }
          >
            <span className="text-xs sm:text-sm font-black">
              {voiceStatus === 'MICROPHONE_UNAVAILABLE'
                ? 'Retry Mic'
                : voiceStatus === 'LISTENING'
                ? 'Stop Mic'
                : 'Speak'}
            </span>
            <span className="text-[10px] font-mono opacity-90">(Tap Screen)</span>
          </button>

          {/* Right: Cancel Transaction (Esc) */}
          <button
            onClick={onCancel}
            className="py-2.5 px-2 rounded-2xl bg-slate-50 hover:bg-rose-50 active:scale-95 border border-slate-200 text-slate-700 hover:text-rose-700 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all focus-visible:ring-4 focus-visible:ring-blue-300"
            aria-label="Cancel current transaction (or press Escape)"
          >
            <X className="w-4 h-4 text-rose-600" />
            <span>Cancel</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
