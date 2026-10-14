import React from 'react';
import { TransactionRecord } from '../types/payment';
import { audioEngine } from '../utils/audioEngine';
import { History, X, Volume2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionRecord[];
  isHighContrast: boolean;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  transactions,
  isHighContrast,
}) => {
  if (!isOpen) return null;

  const handleReadAll = () => {
    if (transactions.length === 0) {
      audioEngine.speak('You have no past transactions.');
      return;
    }
    const summary = transactions
      .slice(0, 3)
      .map(
        (tx, idx) =>
          `Transaction ${idx + 1}: ${tx.amount} rupees to ${tx.recipientName}, reference ${tx.referenceId}, status ${tx.status}.`
      )
      .join(' ');
    audioEngine.speak(`Here are your latest transactions: ${summary}`);
  };

  const handleReadOne = (tx: TransactionRecord) => {
    audioEngine.speak(
      `Transaction of ${tx.amount} rupees to ${tx.recipientName}. Status ${tx.status}. Reference number ${tx.referenceId}. Authenticated with ${tx.authMethod}.`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className={`w-full max-w-2xl max-h-[85vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
          isHighContrast
            ? 'bg-black border-amber-400 text-amber-300'
            : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <History className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="history-modal-title" className="text-xl font-bold text-white">
                Transaction History
              </h2>
              <p className="text-xs text-slate-400">
                All records stamped with "DEMO — NO REAL MONEY TRANSFERRED".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReadAll}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Read all transactions aloud"
            >
              <Volume2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Read Aloud</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Close transaction history"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No transactions recorded yet.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{tx.recipientName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Ref: <span className="font-mono text-slate-300 font-semibold">{tx.referenceId}</span> &middot;{' '}
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">Method: {tx.authMethod}</div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                  <span className="font-mono text-xl font-bold text-amber-400">₹{tx.amount.toFixed(2)}</span>
                  <button
                    onClick={() => handleReadOne(tx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label={`Read details of transaction for ${tx.recipientName}`}
                    title="Speak details"
                  >
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
