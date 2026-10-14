import React, { useEffect } from 'react';
import { User, Recipient } from '../types/payment';
import { audioEngine } from '../utils/audioEngine';
import {
  CreditCard,
  Send,
  History,
  Users,
  Volume2,
  HelpCircle,
  LogOut,
  IndianRupee,
  ShieldCheck,
  Play
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  onStartPayment: () => void;
  onOpenHistory: () => void;
  onOpenRecipients: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  isHighContrast: boolean;
  recipients: Recipient[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onStartPayment,
  onOpenHistory,
  onOpenRecipients,
  onOpenHelp,
  onLogout,
  isHighContrast,
  recipients,
}) => {
  useEffect(() => {
    audioEngine.speak(
      `VisionPay home dashboard. Your available balance is ${user.balance} rupees. Say "make a payment" to send money, or "repeat that" to hear this again.`
    );
  }, []);

  const handleReadBalance = () => {
    audioEngine.speak(`Your current available balance is ${user.balance} rupees.`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Account Balance Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all ${
          isHighContrast
            ? 'bg-black border-amber-400 text-amber-300'
            : 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 text-white shadow-xl'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>VisionPay Verified Account &middot; {user.name}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-amber-400">
                ₹{user.balance.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">INR (DEMO)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Mobile: +91 ••••••{user.mobile.slice(-4)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReadBalance}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:ring-4 focus-visible:ring-amber-400"
              aria-label="Read balance aloud"
            >
              <Volume2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Read Balance</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-2.5 rounded-xl bg-slate-850 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs transition-colors focus-visible:ring-4 focus-visible:ring-amber-400"
              aria-label="Log out of VisionPay"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Voice Action: Make a Payment */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Primary Action</span>
          <span className="text-xs font-mono font-normal text-slate-400">(Voice Command: "Make a payment")</span>
        </h2>

        <button
          onClick={onStartPayment}
          className={`w-full p-6 sm:p-8 rounded-3xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none shadow-lg ${
            isHighContrast
              ? 'bg-amber-400 hover:bg-amber-300 border-amber-300 text-black'
              : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
          }`}
          aria-label="Make a payment. Say 'Make a payment' to start."
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner ${
                isHighContrast ? 'bg-black text-amber-400' : 'bg-emerald-700 text-white'
              }`}
            >
              <Send className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <div className="text-2xl font-black">Make a Payment</div>
              <p
                className={`text-sm mt-0.5 ${
                  isHighContrast ? 'text-slate-900 font-medium' : 'text-emerald-100'
                }`}
              >
                Say <span className="underline font-bold">"Make a payment"</span> or press to start the guided workflow.
              </p>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
              isHighContrast ? 'bg-black text-white' : 'bg-emerald-700/80 text-white'
            }`}
          >
            Say "Make Payment" &rarr;
          </div>
        </button>
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Transaction History */}
        <button
          onClick={onOpenHistory}
          className={`p-5 rounded-2xl border text-left space-y-2 transition-all focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
            isHighContrast
              ? 'bg-black border-amber-400 hover:bg-amber-950/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
          }`}
          aria-label="View and hear past transactions"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
            <History className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="font-bold text-white text-base">Transaction History</div>
          <p className="text-xs text-slate-400">
            Hear past transaction records and references. (Say "History")
          </p>
        </button>

        {/* Verified Directory */}
        <button
          onClick={onOpenRecipients}
          className={`p-5 rounded-2xl border text-left space-y-2 transition-all focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
            isHighContrast
              ? 'bg-black border-amber-400 hover:bg-amber-950/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
          }`}
          aria-label="View verified contact directory"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="font-bold text-white text-base">Verified Contacts</div>
          <p className="text-xs text-slate-400">
            {recipients.length} saved beneficiaries ready for voice payment. (Say "Contacts")
          </p>
        </button>

        {/* AI & Accessible Help */}
        <button
          onClick={onOpenHelp}
          className={`p-5 rounded-2xl border text-left space-y-2 transition-all focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
            isHighContrast
              ? 'bg-black border-amber-400 hover:bg-amber-950/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
          }`}
          aria-label="Ask VisionPay Assistant or hear command guide"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="font-bold text-white text-base">Spoken Help & AI</div>
          <p className="text-xs text-slate-400">
            Voice commands list and Gemini AI assistant. (Say "Help")
          </p>
        </button>
      </div>
    </div>
  );
};
