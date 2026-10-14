import React from 'react';
import { Recipient } from '../types/payment';
import { audioEngine } from '../utils/audioEngine';
import { Users, X, Volume2, Send } from 'lucide-react';

interface RecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  onSelectRecipient: (recipient: Recipient) => void;
  isHighContrast: boolean;
}

export const RecipientsModal: React.FC<RecipientsModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onSelectRecipient,
  isHighContrast,
}) => {
  if (!isOpen) return null;

  const handleReadAll = () => {
    const list = recipients
      .map((r, i) => `${i + 1}: ${r.name}, mobile ending in ${r.lastFourDigits}, ${r.relationship}.`)
      .join(' ');
    audioEngine.speak(`You have ${recipients.length} saved contacts: ${list}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipients-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className={`w-full max-w-xl max-h-[85vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
          isHighContrast
            ? 'bg-black border-amber-400 text-amber-300'
            : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="recipients-modal-title" className="text-xl font-bold text-white">
                Verified Beneficiaries
              </h2>
              <p className="text-xs text-slate-400">Contacts available for voice-first payment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReadAll}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Read all contacts aloud"
            >
              <Volume2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Read List</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Close contacts modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {recipients.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base ${rec.avatarColor}`}
                >
                  {rec.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-white text-base">{rec.name}</div>
                  <div className="text-xs text-slate-400">
                    Mobile: +91 ••••••{rec.lastFourDigits} &middot; {rec.relationship}
                  </div>
                  <div className="text-xs text-amber-400/80 font-mono">{rec.upiId}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectRecipient(rec);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-amber-400"
                aria-label={`Pay ${rec.name}`}
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pay</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
