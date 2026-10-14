import React, { useState } from 'react';
import { X, BookOpen, Terminal, Database, Shield, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface ExhibitionBriefDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isHighContrast: boolean;
}

export const ExhibitionBriefDrawer: React.FC<ExhibitionBriefDrawerProps> = ({
  isOpen,
  onClose,
  isHighContrast,
}) => {
  const [activeTab, setActiveTab] = useState<'SCRIPT' | 'BACKEND' | 'DATABASE' | 'FEATURES' | 'SECURITY'>('SCRIPT');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
    >
      <div className="w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden border-l bg-white border-slate-200 text-[#0A192F]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="brief-title" className="text-xl font-bold text-[#0A192F]">
                VisionPay Technical Documentation & Brief
              </h2>
              <p className="text-xs text-slate-500">
                Port 5000 & 3000 Node.js Configuration, MongoDB Atlas Schemas & 3-Minute Script
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Close exhibition brief"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-2 text-xs font-semibold overflow-x-auto bg-slate-50/50">
          {[
            { id: 'SCRIPT', label: '3-Min Demo Script' },
            { id: 'BACKEND', label: 'Backend Port 5000 & 3000' },
            { id: 'DATABASE', label: 'MongoDB Schema' },
            { id: 'FEATURES', label: 'Feature Matrix' },
            { id: 'SECURITY', label: 'Production Security' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1 leading-relaxed">
          {/* TAB 1: 3-MINUTE SCRIPT */}
          {activeTab === 'SCRIPT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                <span className="font-bold">Demonstration Goal:</span> Prove that a blind user can complete a full ₹500 payment to Rahul Sharma from scratch using solely spoken dialogue and tactile biometric authorization in under 3 minutes.
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Minute 0:00 - 0:45 &middot; Introduction & Voice Launch</div>
                  <p className="text-slate-300 mt-1">
                    1. Open VisionPay. System automatically speaks greeting: <em>"Welcome to VisionPay..."</em>
                  </p>
                  <p className="text-slate-300 mt-1">
                    2. Say or press Space: <strong>"Log in as demo"</strong>. Account loads Aarav Sharma with ₹15,000 balance.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Minute 0:45 - 1:30 &middot; Recipient & Amount Dialogue</div>
                  <p className="text-slate-300 mt-1">
                    3. User says: <strong>"Make a payment"</strong>. VisionPay asks: <em>"Let's make a payment. Who would you like to pay?"</em>
                  </p>
                  <p className="text-slate-300 mt-1">
                    4. User says: <strong>"Rahul Sharma"</strong>. VisionPay verifies: <em>"I found Rahul Sharma, mobile ending in 1234. Say 'confirm'..."</em>
                  </p>
                  <p className="text-slate-300 mt-1">
                    5. User says: <strong>"Pay five hundred rupees"</strong>. VisionPay parses words into ₹500 and reads back: <em>"You want to pay five hundred rupees."</em>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Minute 1:30 - 2:30 &middot; Review, WebAuthn & Authorization</div>
                  <p className="text-slate-300 mt-1">
                    6. VisionPay reads complete review: <em>"You are about to pay five hundred rupees to Rahul Sharma, ending in 1234. Do you want to continue?"</em>
                  </p>
                  <p className="text-slate-300 mt-1">
                    7. User says: <strong>"Confirm details"</strong>.
                  </p>
                  <p className="text-slate-300 mt-1">
                    8. Device biometric prompt triggers (or 4-digit PIN <code className="text-amber-400">2580</code>). Explain OS prompt boundary to faculty.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-bold text-white text-sm">Minute 2:30 - 3:00 &middot; Verified Result & Idempotency Guard</div>
                  <p className="text-slate-300 mt-1">
                    9. VisionPay announces: <em>"Your demo payment of five hundred rupees to Rahul Sharma was successful. No real money was transferred."</em>
                  </p>
                  <p className="text-slate-300 mt-1">
                    10. Show transaction receipt <span className="font-mono text-amber-400">VP-DEMO-XXXXX</span> in history.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BACKEND & PORTS */}
          {activeTab === 'BACKEND' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-white text-sm">Port Architecture Setup:</span>
                <p className="text-slate-400 mt-1">
                  In this unified deployment, Express runs on <strong className="text-emerald-400">Port 3000</strong> (serving both API and Vite frontend seamlessly). For your standalone college setup where your Express backend is on <strong className="text-amber-400">Port 5000</strong>, CORS is enabled and standard proxying is supported.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-white">Startup Commands:</span>
                <pre className="p-3 rounded-lg bg-slate-950 font-mono text-emerald-400 text-[11px] overflow-x-auto">
{`# 1. Install dependencies
npm install

# 2. Run unified server (Port 3000)
npm run dev

# 3. For Standalone Port 5000 backend test:
PORT=5000 npx tsx server.ts`}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-white">Environment Variables (.env):</span>
                <pre className="p-3 rounded-lg bg-slate-950 font-mono text-slate-300 text-[11px] overflow-x-auto">
{`PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/visionpay
APP_URL=http://localhost:3000`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: MONGODB SCHEMA */}
          {activeTab === 'DATABASE' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-white">User Schema (Mongoose):</span>
                <pre className="p-3 rounded-lg bg-slate-950 font-mono text-slate-300 text-[11px] overflow-x-auto">
{`const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  mobile: { type: String, unique: true, match: /^\\d{10}$/ },
  pinHash: { type: String, required: true }, // SHA-256 / bcrypt
  balance: { type: Number, default: 15000.0 },
  hasPasskey: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});`}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-white">Transaction Schema (Mongoose):</span>
                <pre className="p-3 rounded-lg bg-slate-950 font-mono text-slate-300 text-[11px] overflow-x-auto">
{`const TransactionSchema = new mongoose.Schema({
  referenceId: { type: String, unique: true }, // e.g. VP-DEMO-12345
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientId: { type: String, required: true },
  recipientName: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['COMPLETED', 'FAILED', 'CANCELLED'] },
  authMethod: { type: String, required: true },
  isDemo: { type: Boolean, default: true },
  disclaimer: { type: String, default: 'DEMO — NO REAL MONEY TRANSFERRED' },
  idempotencyKey: { type: String, unique: true },
  timestamp: { type: Date, default: Date.now }
});`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURE MATRIX */}
          {activeTab === 'FEATURES' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Fully Implemented & Functional:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Full 7-step guided voice payment workflow with state transitions.</li>
                  <li>SpeechSynthesis TTS with rate control, repetition ("Repeat that"), and earcons.</li>
                  <li>SpeechRecognition STT with live interim transcript and keyboard/text fallback.</li>
                  <li>Recipient directory search, fuzzy match, and spoken ambiguity disambiguation.</li>
                  <li>Indian Rupee spoken number parser (converts "five hundred rupees" to 500).</li>
                  <li>Mandatory spoken review of recipient, ending digits, and amount.</li>
                  <li>Cryptographic WebAuthn passkey challenge & secure 4-digit PIN authorization.</li>
                  <li>Server-side idempotency guard (X-Idempotency-Key) against duplicate submissions.</li>
                  <li>Gemini 3.8 Flash AI accessible assistant with deterministic payment boundaries.</li>
                  <li>High-contrast AAA mode and complete ARIA live-assertive screen reader support.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Clearly Simulated / Demonstrative:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Bank/UPI Money Transfer: Simulated exhibition ledger with zero real money transferred. Stamped "VP-DEMO-XXXXX".</li>
                  <li>Hardware Biometrics: Browser-level WebAuthn fallback handles sandbox environments while honestly explaining OS prompt boundaries.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: PRODUCTION SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800 text-blue-200 space-y-2">
                <span className="font-bold text-blue-100 text-sm">Real-World Production Requirements:</span>
                <p>
                  To transition VisionPay from a college major project to a live banking application in India:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li><strong>NPCI / RBI UPI Compliance:</strong> Must integrate NPCI Common Library (CL) on Android/iOS with hardware-backed MPIN entry.</li>
                  <li><strong>PCI-DSS Level 1 Certification:</strong> Strict network segmentation, HSM (Hardware Security Module) key management, and zero plaintext PIN handling.</li>
                  <li><strong>FIDO2 / WebAuthn Level 3:</strong> Cryptographic public-key credential attestation with device resident keys.</li>
                  <li><strong>Biometric Boundary:</strong> Physical sensors must remain isolated inside Secure Enclaves (Apple T2/A-series, Android StrongBox/TEE); browser JavaScript can never inspect raw fingerprint images.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
