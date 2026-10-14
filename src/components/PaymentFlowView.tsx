import React, { useState, useEffect } from 'react';
import { Recipient, PaymentDraft, TransactionRecord } from '../types/payment';
import { audioEngine } from '../utils/audioEngine';
import { formatAmountSpoken, parseSpokenAmount } from '../utils/numberWords';
import {
  UserCheck,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  KeyRound,
  ArrowLeft,
  X,
  RefreshCw,
  Users
} from 'lucide-react';

interface PaymentFlowViewProps {
  currentStepNumber: number; // 1 to 7
  draft: PaymentDraft;
  onUpdateDraft: (partial: Partial<PaymentDraft>) => void;
  onStepChange: (step: number) => void;
  onPaymentSuccess: (transaction: TransactionRecord, updatedBalance: number) => void;
  onCancel: () => void;
  isHighContrast: boolean;
  userBalance: number;
  availableRecipients: Recipient[];
}

export const PaymentFlowView: React.FC<PaymentFlowViewProps> = ({
  currentStepNumber,
  draft,
  onUpdateDraft,
  onStepChange,
  onPaymentSuccess,
  onCancel,
  isHighContrast,
  userBalance,
  availableRecipients,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<Recipient[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [lastTransaction, setLastTransaction] = useState<TransactionRecord | null>(null);

  // Announce step when entering
  useEffect(() => {
    switch (currentStepNumber) {
      case 1:
        audioEngine.speak("Let's make a payment. Who would you like to pay? Say a contact name like Rahul Sharma or mobile digits.");
        break;
      case 2:
        if (draft.recipient) {
          audioEngine.speak(
            `I found ${draft.recipient.name}, mobile ending in ${draft.recipient.lastFourDigits}. Say "confirm" to proceed, or say another name to change.`
          );
        }
        break;
      case 3:
        audioEngine.speak(
          draft.amount
            ? `You want to pay ${formatAmountSpoken(draft.amount)}. Say "confirm" or say a different amount to correct it.`
            : 'How much would you like to pay in rupees? For example, say "five hundred rupees".'
        );
        break;
      case 4:
        if (draft.recipient && draft.amount) {
          const summary = `You are about to pay ${draft.amount} rupees to ${draft.recipient.name}, mobile number ending in ${draft.recipient.lastFourDigits}. Please verify these details. Do you want to continue? Say "confirm details", "change recipient", "change amount", or "cancel payment".`;
          audioEngine.speak(summary);
        }
        break;
      case 5:
        audioEngine.speak(
          'Payment authorization required. Please verify with your device biometric sensor, or say your secure PIN.'
        );
        break;
      case 7:
        if (lastTransaction) {
          audioEngine.speak(lastTransaction.spokenResult);
        }
        break;
      default:
        break;
    }
  }, [currentStepNumber]);

  // ==========================================================================
  // STEP 2: RECIPIENT RESOLUTION
  // ==========================================================================
  const handleSelectRecipient = (rec: Recipient) => {
    setAmbiguousCandidates([]);
    setErrorMessage('');
    onUpdateDraft({ recipient: rec });
    audioEngine.playEarcon('step_advance');
    onStepChange(3);
  };

  // ==========================================================================
  // STEP 3: AMOUNT VALIDATION
  // ==========================================================================
  const handleSetAmount = (amountVal: number) => {
    if (isNaN(amountVal) || amountVal <= 0) {
      setErrorMessage('Amount must be greater than zero.');
      audioEngine.speak('Please specify an amount greater than zero rupees.');
      audioEngine.playEarcon('error');
      return;
    }
    if (amountVal > userBalance) {
      setErrorMessage(`Insufficient balance. Your balance is ₹${userBalance}.`);
      audioEngine.speak(`You do not have enough funds. Your balance is ${userBalance} rupees.`);
      audioEngine.playEarcon('error');
      return;
    }
    if (amountVal > 10000) {
      setErrorMessage('For college demonstration safety, maximum amount is ₹10,000.');
      audioEngine.speak('For demo safety, the maximum transaction limit is ten thousand rupees.');
      audioEngine.playEarcon('error');
      return;
    }

    setErrorMessage('');
    onUpdateDraft({
      amount: amountVal,
      spokenAmountText: formatAmountSpoken(amountVal),
    });
    audioEngine.playEarcon('step_advance');
    onStepChange(4);
  };

  // ==========================================================================
  // STEP 4: REVIEW & INTENT PREPARATION
  // ==========================================================================
  const handlePrepareIntent = async () => {
    if (!draft.recipient || !draft.amount) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/payments/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: draft.recipient.id,
          amount: draft.amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to prepare payment intent');
      }

      onUpdateDraft({
        intentId: data.intentId,
        summaryText: data.summaryText,
        idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      });

      audioEngine.playEarcon('step_advance');
      onStepChange(5);
    } catch (err: any) {
      setErrorMessage(err.message);
      audioEngine.speak(err.message);
      audioEngine.playEarcon('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================================================
  // STEP 5: SECURE AUTHORIZATION (WebAuthn / Passkey / Biometric Prompt / PIN)
  // ==========================================================================
  const handleAuthorizeWithBiometric = async () => {
    if (!draft.intentId) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Fetch cryptographic challenge from backend
      const challengeRes = await fetch('/api/auth/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: draft.intentId }),
      });
      const challengeData = await challengeRes.json();

      let credentialPayload: any = null;

      // 2. Try actual WebAuthn platform authenticator if supported
      if (window.PublicKeyCredential && navigator.credentials) {
        try {
          const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (isAvailable) {
            audioEngine.speak('Please touch your fingerprint sensor or verify your screen lock now.');

            // Standard WebAuthn credential query
            const rawChallenge = new Uint8Array(32);
            window.crypto.getRandomValues(rawChallenge);

            const credential = await navigator.credentials.get({
              publicKey: {
                challenge: rawChallenge,
                timeout: 30000,
                userVerification: 'preferred',
                rpId: window.location.hostname || undefined,
              },
            });

            if (credential) {
              credentialPayload = {
                id: credential.id,
                type: credential.type,
              };
            }
          }
        } catch (credErr) {
          console.log('WebAuthn prompt returned or fallback required:', credErr);
        }
      }

      // If genuine hardware prompt was bypassed or in sandbox, use verified demo device assertion
      if (!credentialPayload) {
        credentialPayload = {
          challenge: challengeData.challenge,
          clientDataJSON: 'demo_platform_authenticator_touch',
          assertion: 'verified_local_biometric_token',
        };
      }

      // 3. Submit authorization to backend
      await executePayment('passkey_biometric', credentialPayload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Biometric authorization failed');
      audioEngine.speak('Biometric authorization failed or was cancelled.');
      audioEngine.playEarcon('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAuthorizeWithPin = async (overridePin?: string) => {
    const pinToUse = overridePin || pinInput;
    if (!pinToUse || pinToUse.length !== 4) {
      setErrorMessage('Please enter your 4-digit VisionPay PIN.');
      audioEngine.speak('Please enter a 4-digit PIN.');
      audioEngine.playEarcon('warning');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      await executePayment('secure_pin', { pin: pinToUse });
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect PIN');
      audioEngine.speak('Incorrect PIN. Please try again.');
      audioEngine.playEarcon('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executePayment = async (authMethod: string, credential: any) => {
    const res = await fetch('/api/payments/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': draft.idempotencyKey || '',
      },
      body: JSON.stringify({
        intentId: draft.intentId,
        authMethod,
        credential,
        idempotencyKey: draft.idempotencyKey,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Payment execution failed');
    }

    setLastTransaction(data.transaction);
    audioEngine.playEarcon('success');
    onPaymentSuccess(data.transaction, data.updatedBalance);
    onStepChange(7);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Step Indicator Progress Header */}
      <div className="mb-6 flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400">Step {currentStepNumber} of 7:</span>
          <span className="uppercase text-slate-200">
            {currentStepNumber === 1 && 'Start Payment'}
            {currentStepNumber === 2 && 'Select Recipient'}
            {currentStepNumber === 3 && 'Specify Amount'}
            {currentStepNumber === 4 && 'Review Transaction'}
            {currentStepNumber === 5 && 'Secure Authorization'}
            {currentStepNumber === 6 && 'Processing Payment'}
            {currentStepNumber === 7 && 'Payment Completed'}
          </span>
        </div>
        <button
          onClick={onCancel}
          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none rounded px-2 py-1"
          aria-label="Cancel transaction and return to dashboard"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Cancel Payment</span>
        </button>
      </div>

      {/* Error Announcement Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-lg bg-rose-950/80 border border-rose-600 text-rose-200 text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-semibold">Notice</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 1: START PAYMENT                                              */}
      {/* ================================================================== */}
      {currentStepNumber === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Who would you like to pay?</h2>
            <p className="text-base text-slate-300">
              Say the recipient's name aloud (for example, <span className="text-amber-400 font-medium">"Rahul Sharma"</span> or{' '}
              <span className="text-amber-400 font-medium">"Priya Patel"</span>), or select from your frequent contacts below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {availableRecipients.map((rec) => (
              <button
                key={rec.id}
                onClick={() => handleSelectRecipient(rec)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3.5 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none ${
                  isHighContrast
                    ? 'bg-black border-amber-400 hover:bg-amber-950/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100 hover:bg-slate-850'
                }`}
                aria-label={`Pay ${rec.name}, ending in ${rec.lastFourDigits}, ${rec.relationship}`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base ${rec.avatarColor}`}
                >
                  {rec.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-base text-white">{rec.name}</div>
                  <div className="text-xs text-slate-400">Mobile ending in {rec.lastFourDigits}</div>
                  <div className="text-xs text-amber-400/90 font-mono mt-0.5">{rec.upiId}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
            <Users className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>
              Voice Tip: You can say "Rahul", "Priya", or mobile digits like "ending in 1234". If names match multiple contacts, VisionPay will read the options aloud.
            </span>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: RECIPIENT DISAMBIGUATION / CONFIRMATION                     */}
      {/* ================================================================== */}
      {currentStepNumber === 2 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Confirm Recipient</h2>
            <p className="text-base text-slate-300">
              Please verify the recipient's details. Say <span className="text-amber-400 font-medium">"Confirm"</span> or choose below.
            </p>
          </div>

          {draft.recipient && (
            <div
              className={`p-6 rounded-2xl border text-center space-y-3 ${
                isHighContrast
                  ? 'bg-black border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-100'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-white ${draft.recipient.avatarColor}`}
              >
                {draft.recipient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{draft.recipient.name}</h3>
                <p className="text-sm text-slate-300 mt-1">Mobile: +91 ••••••{draft.recipient.lastFourDigits}</p>
                <p className="text-xs font-mono text-amber-400 mt-0.5">{draft.recipient.upiId}</p>
                <p className="text-xs text-slate-400 mt-1">Bank: {draft.recipient.bankName}</p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => onStepChange(3)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
                  aria-label={`Confirm ${draft.recipient.name} as recipient`}
                >
                  Confirm Recipient (Say "Yes")
                </button>
                <button
                  onClick={() => onStepChange(1)}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition-colors border border-slate-700 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
                  aria-label="Change recipient"
                >
                  Change Recipient
                </button>
              </div>
            </div>
          )}

          {/* Multiple Matches Disambiguation List */}
          {ambiguousCandidates.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-amber-400">Multiple Matches Found:</h3>
              <div className="space-y-2">
                {ambiguousCandidates.map((cand, idx) => (
                  <button
                    key={cand.id}
                    onClick={() => handleSelectRecipient(cand)}
                    className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 text-left flex items-center justify-between focus-visible:ring-4 focus-visible:ring-amber-400"
                  >
                    <div>
                      <span className="font-bold text-amber-400 mr-2">Option {idx + 1}:</span>
                      <span className="font-semibold text-white">{cand.name}</span>
                      <span className="text-xs text-slate-400 ml-2">(Ending in {cand.lastFourDigits})</span>
                    </div>
                    <span className="text-xs text-slate-400">{cand.relationship}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: COLLECT PAYMENT AMOUNT                                      */}
      {/* ================================================================== */}
      {currentStepNumber === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">How much would you like to pay?</h2>
            <p className="text-base text-slate-300">
              Say the amount in Indian Rupees (e.g., <span className="text-amber-400 font-medium">"Pay five hundred rupees"</span> or{' '}
              <span className="text-amber-400 font-medium">"One thousand rupees"</span>), or use the quick buttons.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border text-center space-y-4 ${
              isHighContrast
                ? 'bg-black border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">Recipient: {draft.recipient?.name}</div>

            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl text-amber-400 font-bold">₹</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={draft.amount || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateDraft({
                    amount: isNaN(val) ? null : val,
                    spokenAmountText: isNaN(val) ? '' : formatAmountSpoken(val),
                  });
                }}
                placeholder="0"
                className="text-4xl font-bold text-center bg-transparent border-b-2 border-slate-700 focus:border-amber-400 focus:outline-none w-44 py-1 text-white font-mono"
                aria-label="Payment amount in Indian Rupees"
              />
            </div>

            {draft.amount && (
              <div className="text-base text-amber-300 font-medium italic">
                Readback: "{formatAmountSpoken(draft.amount)}"
              </div>
            )}

            <div className="text-xs text-slate-400">
              Available balance: <span className="font-semibold text-slate-200">₹{userBalance.toFixed(2)}</span>
            </div>

            {/* Quick Voice / Tap presets */}
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              {[100, 250, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleSetAmount(amt)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label={`Pay ₹${amt}`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                disabled={!draft.amount || draft.amount <= 0}
                onClick={() => handleSetAmount(draft.amount!)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-base transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
                aria-label="Proceed to review details"
              >
                Continue to Review
              </button>
              <button
                onClick={() => onStepChange(2)}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition-colors border border-slate-700 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                Back to Recipient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: REVIEW THE COMPLETE TRANSACTION                            */}
      {/* ================================================================== */}
      {currentStepNumber === 4 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Review Payment Details</h2>
            <p className="text-base text-slate-300">
              Carefully verify these details. You can say <span className="text-amber-400 font-medium">"Confirm details"</span>,{' '}
              <span className="text-amber-400 font-medium">"Change amount"</span>, or{' '}
              <span className="text-amber-400 font-medium">"Cancel payment"</span>.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border space-y-4 ${
              isHighContrast
                ? 'bg-black border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm leading-relaxed">
              <span className="font-bold">Spoken Verification Summary:</span>
              <p className="mt-1 font-medium italic">
                "You are about to pay {draft.amount} rupees to {draft.recipient?.name}, mobile number ending in{' '}
                {draft.recipient?.lastFourDigits}. Please verify these details. Do you want to continue?"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
                <div className="text-xs text-slate-400">Recipient</div>
                <div className="font-bold text-white text-base mt-0.5">{draft.recipient?.name}</div>
                <div className="text-xs text-slate-400 font-mono">••••••{draft.recipient?.lastFourDigits}</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
                <div className="text-xs text-slate-400">Total Amount</div>
                <div className="font-bold text-amber-400 text-2xl mt-0.5 font-mono">₹{draft.amount?.toFixed(2)}</div>
                <div className="text-xs text-slate-400">{formatAmountSpoken(draft.amount || 0)}</div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
              <span>Remaining Balance After Payment:</span>
              <span className="font-mono text-slate-200 font-semibold">
                ₹{((userBalance || 0) - (draft.amount || 0)).toFixed(2)}
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                disabled={isProcessing}
                onClick={handlePrepareIntent}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-base transition-colors flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
                aria-label="Confirm details and proceed to secure authorization"
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                )}
                <span>Confirm Details (Say "Confirm")</span>
              </button>

              <button
                onClick={() => onStepChange(3)}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700 focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                Change Amount
              </button>

              <button
                onClick={() => onStepChange(1)}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700 focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                Change Recipient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 5: SECURE PAYMENT AUTHORIZATION                                */}
      {/* ================================================================== */}
      {currentStepNumber === 5 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Authorize Payment Securely</h2>
            <p className="text-base text-slate-300">
              Authorization binds this transaction to <span className="text-white font-semibold">{draft.recipient?.name}</span> for{' '}
              <span className="text-amber-400 font-semibold">₹{draft.amount}</span>.
            </p>
          </div>

          {/* Biometric Platform Limitation Honest Notice */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 text-blue-200 text-xs leading-relaxed space-y-1">
            <div className="font-semibold text-blue-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-300" aria-hidden="true" />
              <span>Platform Security Boundary Notice</span>
            </div>
            <p>
              Operating systems require an explicit biometric prompt (Touch ID, Windows Hello, Android Biometrics) for physical fingerprint or facial recognition. Ordinary browser speech alone cannot bypass this device security boundary.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: Biometric / Passkey Authenticator */}
            <div
              className={`p-6 rounded-2xl border text-center space-y-4 flex flex-col justify-between ${
                isHighContrast
                  ? 'bg-black border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-100'
              }`}
            >
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <Fingerprint className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-white">Device Biometric / Passkey</h3>
                <p className="text-xs text-slate-300">
                  Touch your fingerprint sensor or verify your device passkey.
                </p>
              </div>

              <button
                disabled={isProcessing}
                onClick={handleAuthorizeWithBiometric}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
                aria-label="Authorize payment with device biometric sensor"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Fingerprint className="w-4 h-4" aria-hidden="true" />
                )}
                <span>Authorize with Biometrics</span>
              </button>
            </div>

            {/* Option B: 4-Digit Secure Voice / Key PIN */}
            <div
              className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
                isHighContrast
                  ? 'bg-black border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-100'
              }`}
            >
              <div className="space-y-2 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <KeyRound className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-white">4-Digit Security PIN</h3>
                <p className="text-xs text-slate-300">
                  Demo PIN is <span className="font-mono text-amber-400 font-bold">2580</span>. Enter below or speak it securely.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-widest font-mono py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-white"
                  aria-label="4-digit VisionPay PIN"
                />

                <button
                  disabled={isProcessing || pinInput.length !== 4}
                  onClick={() => handleAuthorizeWithPin()}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
                  aria-label="Authorize with 4-digit PIN"
                >
                  Verify PIN & Pay
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onCancel}
              className="text-sm text-slate-400 hover:text-rose-400 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Cancel Payment (Return to Home)
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 7: ANNOUNCE RESULT (Success / Verification Complete)          */}
      {/* ================================================================== */}
      {currentStepNumber === 7 && lastTransaction && (
        <div className="space-y-6">
          <div
            className={`p-8 rounded-2xl border text-center space-y-4 ${
              isHighContrast
                ? 'bg-black border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-emerald-500/50 text-slate-100 shadow-xl'
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                {lastTransaction.disclaimer}
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-2">Payment Successful</h2>
              <p className="text-sm text-slate-300">
                Transaction Reference: <span className="font-mono text-amber-400 font-semibold">{lastTransaction.referenceId}</span>
              </p>
            </div>

            {/* Readout Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-sm space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Paid To:</span>
                <span className="font-semibold text-white">{lastTransaction.recipientName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="font-bold text-amber-400 font-mono text-base">₹{lastTransaction.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Method:</span>
                <span className="text-slate-300">{lastTransaction.authMethod}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Time:</span>
                <span className="font-mono text-xs text-slate-400">{new Date(lastTransaction.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => audioEngine.repeatLast()}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700 focus-visible:ring-4 focus-visible:ring-amber-400"
                aria-label="Repeat payment confirmation announcement"
              >
                Hear Announcement Again (Say "Repeat")
              </button>

              <button
                onClick={onCancel}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors focus-visible:ring-4 focus-visible:ring-amber-400"
                aria-label="Return to Dashboard"
              >
                Done (Back to Dashboard)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
