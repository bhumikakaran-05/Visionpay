import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkflowState, User, Recipient, PaymentDraft, TransactionRecord, VoiceStatus } from './types/payment';
import { audioEngine } from './utils/audioEngine';
import { parseSpokenAmount, formatAmountSpoken, parseSpokenMobile, formatMobileSpokenDigits } from './utils/numberWords';
import { MobileVoiceScreen } from './components/MobileVoiceScreen';
import { ExhibitionBriefDrawer } from './components/ExhibitionBriefDrawer';
import { TestRunnerModal } from './components/TestRunnerModal';
import { GeminiHelpModal } from './components/GeminiHelpModal';

const EMPTY_DRAFT: PaymentDraft = {
  recipient: null,
  amount: null,
  spokenAmountText: '',
  intentId: null,
  summaryText: '',
  authMethod: 'passkey_biometric',
  idempotencyKey: null,
};

export default function App() {
  // Navigation & Workflow State
  const [workflowState, setWorkflowState] = useState<WorkflowState>('WELCOME');
  const [paymentStep, setPaymentStep] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<PaymentDraft>(EMPTY_DRAFT);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [lastTransaction, setLastTransaction] = useState<TransactionRecord | null>(null);

  // In-flight authorization guard to prevent duplicate submissions
  const isAuthorizingRef = useRef(false);

  // Explicit Synchronized Voice Interaction State
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('IDLE');
  const [systemPromptText, setSystemPromptText] = useState(
    'Welcome to VisionPay. Accessible payments made simple. Tap anywhere on the screen to begin.'
  );
  const [heardTranscript, setHeardTranscript] = useState('');
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState(
    'VisionPay ready. Welcome to VisionPay. Accessible payments made simple. Tap anywhere on the screen to begin.'
  );
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [lastRecognizedSpeech, setLastRecognizedSpeech] = useState<string>('');

  // Developer & Evaluator Modals (Kept separate from customer-facing view)
  const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);
  const [isExhibitionBriefOpen, setIsExhibitionBriefOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // State Reference for safe async callbacks
  const stateRef = useRef({
    workflowState,
    paymentStep,
    draft,
    user,
    voiceStatus,
  });
  useEffect(() => {
    stateRef.current = { workflowState, paymentStep, draft, user, voiceStatus };
  }, [workflowState, paymentStep, draft, user, voiceStatus]);

  // Load Contacts & Pre-seed Demo User Session
  useEffect(() => {
    fetch('/api/recipients')
      .then((res) => res.json())
      .then((data) => {
        if (data.recipients) setRecipients(data.recipients);
      })
      .catch((err) => console.warn('Failed to fetch recipients:', err));

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDemoLogin: true }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.warn('Failed to initialize session:', err));

    // Developer mode shortcut via query param (?dev=true)
    if (typeof window !== 'undefined' && window.location.search.includes('dev=true')) {
      setIsDevMenuOpen(true);
    }
  }, []);

  // Listen to Audio Engine Events & Keep Status Synchronized
  useEffect(() => {
    const unsubListening = audioEngine.subscribeListening((listening) => {
      if (listening) {
        setVoiceStatus('LISTENING');
        setScreenReaderAnnouncement('Microphone listening. Speak your response now.');
      } else {
        setVoiceStatus((prev) => (prev === 'LISTENING' ? 'IDLE' : prev));
      }
    });

    const unsubSpeaking = audioEngine.subscribeSpeaking((speaking) => {
      if (speaking) {
        setVoiceStatus('SPEAKING');
      } else {
        setVoiceStatus((prev) => (prev === 'SPEAKING' ? 'IDLE' : prev));
      }
    });

    const unsubTranscript = audioEngine.subscribeTranscript((text, isFinal) => {
      setHeardTranscript(text);
      if (isFinal) {
        setTimeout(() => {
          setHeardTranscript((prev) => (prev === text ? '' : prev));
        }, 3500);
      }
    });

    return () => {
      unsubListening();
      unsubSpeaking();
      unsubTranscript();
    };
  }, []);

  // Opening Spoken Greeting on Load (Respects autoplay)
  useEffect(() => {
    const greeting =
      'Welcome to VisionPay. Accessible payments made simple. Tap anywhere on the screen to begin.';
    setSystemPromptText(greeting);
    setScreenReaderAnnouncement(greeting);
    audioEngine.speak(greeting).catch(() => {
      // Browser autoplay restriction will be unlocked on user's first tap
    });
  }, []);

  // Reference to handleVoiceCommand to avoid circular dependencies
  const handleVoiceCommandRef = useRef<(cmd: string) => void>(() => {});
  const triggerListeningRef = useRef<() => void>(() => {});

  // Central Spoken Prompt Engine (Pauses mic during speech to prevent feedback loops)
  const updatePromptAndSpeak = useCallback(
    (text: string, andListenAfter = true) => {
      setSystemPromptText(text);
      setScreenReaderAnnouncement(text);
      setVoiceStatus('SPEAKING');

      audioEngine.speak(text, {
        onStart: () => {
          setVoiceStatus('SPEAKING');
        },
        onEnd: () => {
          setVoiceStatus('IDLE');
          if (andListenAfter && stateRef.current.voiceStatus !== 'MICROPHONE_UNAVAILABLE') {
            setTimeout(() => {
              if (!audioEngine.getIsListening() && !audioEngine.getIsSpeaking()) {
                if (triggerListeningRef.current) {
                  triggerListeningRef.current();
                }
              }
            }, 300);
          }
        },
      });
    },
    []
  );

  // Retry Microphone Permission Flow
  const handleRetryMicPermission = useCallback(async () => {
    audioEngine.unlockAudio();
    setVoiceStatus('PROCESSING');
    setRecognitionError(null);
    setScreenReaderAnnouncement('Requesting microphone permission...');

    const result = await audioEngine.requestMicrophonePermission();
    if (result === 'granted') {
      setVoiceStatus('IDLE');
      setMicErrorMessage(null);
      setRecognitionError(null);
      const okMsg = 'Microphone permission granted. What would you like to do? You can say: Make a payment, Check balance, or Help.';
      updatePromptAndSpeak(okMsg, true);
    } else if (result === 'unsupported') {
      setVoiceStatus('ERROR');
      const unsupp = 'Speech recognition is not supported in this browser. Please open in Google Chrome or use the keyboard fallback below.';
      setRecognitionError(unsupp);
      setScreenReaderAnnouncement(unsupp);
      audioEngine.speak(unsupp);
    } else {
      setVoiceStatus('MICROPHONE_UNAVAILABLE');
      setMicErrorMessage('Microphone access is denied. Please allow microphone permission in your browser site settings.');
      const stillBlocked = 'Microphone access is denied. Please allow microphone in your browser address bar or use the keyboard fallback.';
      setScreenReaderAnnouncement(stillBlocked);
      audioEngine.speak(stillBlocked);
    }
  }, [updatePromptAndSpeak]);

  // Helper to trigger voice listening safely
  const triggerListening = useCallback(() => {
    if (stateRef.current.voiceStatus === 'MICROPHONE_UNAVAILABLE') {
      handleRetryMicPermission();
      return;
    }

    setRecognitionError(null);

    // Verify browser support for SpeechRecognition
    if (!audioEngine.isRecognitionSupported()) {
      setVoiceStatus('ERROR');
      const unsupp = 'Speech recognition is not supported in this browser. Please open in Google Chrome or use the accessible text command input.';
      setRecognitionError(unsupp);
      setScreenReaderAnnouncement(unsupp);
      audioEngine.speak(unsupp);
      return;
    }

    audioEngine.startListening({
      onResult: (transcript) => {
        setRecognitionError(null);
        setLastRecognizedSpeech(transcript);
        if (handleVoiceCommandRef.current) {
          handleVoiceCommandRef.current(transcript);
        }
      },
      onError: (errText, code) => {
        if (code === 'unsupported') {
          setVoiceStatus('ERROR');
          const unsupp = 'Speech recognition is not supported in this browser. Please open in Google Chrome or use the keyboard fallback.';
          setRecognitionError(unsupp);
          setScreenReaderAnnouncement(unsupp);
          audioEngine.speak(unsupp);
        } else if (code === 'not-allowed') {
          audioEngine.stopListening();
          setVoiceStatus('MICROPHONE_UNAVAILABLE');
          setMicErrorMessage('Microphone access is denied. Please allow microphone permission in your browser settings.');
          const alertMsg = 'Microphone access is denied. Please allow microphone permission in your browser site settings, then tap Retry Microphone.';
          setScreenReaderAnnouncement(alertMsg);
          audioEngine.speak(alertMsg);
        } else if (code === 'no-speech') {
          setVoiceStatus('ERROR');
          const noSpeechMsg = "I didn't hear anything. Tap Retry Voice Input or tap anywhere on the screen to speak again.";
          setRecognitionError('No speech was detected. Tap Retry Voice Input or tap anywhere on the screen to try again.');
          setScreenReaderAnnouncement(noSpeechMsg);
          updatePromptAndSpeak(noSpeechMsg, false);
        } else {
          setVoiceStatus('ERROR');
          const errMsg = `Voice notice: ${errText}. Tap Retry to speak again.`;
          setRecognitionError(errText);
          setScreenReaderAnnouncement(errMsg);
          updatePromptAndSpeak(errMsg, false);
        }
      },
      onTimeout: () => {
        setVoiceStatus('ERROR');
        const timeoutMsg = "No speech detected. Tap Retry Voice Input or tap anywhere on the screen to try again.";
        setRecognitionError('Speech recognition timed out without detecting speech. Tap Retry to speak again.');
        setScreenReaderAnnouncement(timeoutMsg);
      },
    });
  }, [handleRetryMicPermission, updatePromptAndSpeak]);

  useEffect(() => {
    triggerListeningRef.current = triggerListening;
  }, [triggerListening]);

  // Explicit Retry Handler for user to retry after recognition errors
  const handleRetryRecognition = useCallback(() => {
    setRecognitionError(null);
    audioEngine.unlockAudio();
    triggerListening();
  }, [triggerListening]);

  // ==========================================================================
  // CONVERSATION STATE MACHINE
  // ==========================================================================
  const handleVoiceCommand = useCallback(
    async (rawCommand: string) => {
      const lower = rawCommand.toLowerCase().trim();
      const current = stateRef.current;
      console.log('Voice Command received in state:', current.workflowState, lower);
      setScreenReaderAnnouncement(`Recognized: ${rawCommand}`);
      setLastRecognizedSpeech(rawCommand);
      setRecognitionError(null);

      // 1. UNIVERSAL CONVERSATION COMMANDS
      if (lower.includes('repeat') || lower.includes('what did you say') || lower.includes('pardon')) {
        audioEngine.repeatLast();
        return;
      }

      if (lower.includes('stop listening') || lower.includes('quiet') || lower.includes('mute')) {
        audioEngine.stopListening();
        setVoiceStatus('IDLE');
        audioEngine.speak('Microphone stopped. Tap anywhere on the screen when ready to speak.');
        return;
      }

      if (
        lower.includes('cancel payment') ||
        lower.includes('stop payment') ||
        (lower === 'cancel' && current.workflowState.startsWith('STEP_'))
      ) {
        audioEngine.playEarcon('cancel');
        setDraft(EMPTY_DRAFT);
        setWorkflowState('DASHBOARD');
        setPaymentStep(1);
        updatePromptAndSpeak('Payment cancelled. What would you like to do? You can say: Make a payment, Check balance, or Help.');
        return;
      }

      if (lower.includes('check balance') || lower.includes('my balance') || lower.includes('how much money')) {
        const bal = current.user?.balance || 15000;
        updatePromptAndSpeak(`Your available balance is ${bal} rupees. Say "make a payment" to send money, or "help" for commands.`);
        return;
      }

      if (lower.includes('help') || lower.includes('what can i say') || lower.includes('commands')) {
        updatePromptAndSpeak(
          'You can say: "Make a payment", "Rahul Sharma", "Pay five hundred rupees", "Confirm details", "Repeat that", or "Cancel payment". What would you like to do?'
        );
        return;
      }

      // 2. CONVERSATION WORKFLOW STEPS

      // A. WELCOME or DASHBOARD -> "Make a payment"
      if (current.workflowState === 'WELCOME' || current.workflowState === 'DASHBOARD') {
        if (
          lower.includes('payment') ||
          lower.includes('pay') ||
          lower.includes('send') ||
          lower.includes('transfer') ||
          lower.includes('start') ||
          lower.includes('begin')
        ) {
          setWorkflowState('STEP_1_START');
          setPaymentStep(1);
          setDraft(EMPTY_DRAFT);
          audioEngine.playEarcon('step_advance');
          updatePromptAndSpeak("Let's make a payment. Who would you like to pay?");
          return;
        }
      }

      // B. STEP 1: RECIPIENT IDENTIFICATION (Saved Contact or Mobile Number Spoken Aloud)
      if (current.workflowState === 'STEP_1_START' || current.paymentStep === 1) {
        setVoiceStatus('PROCESSING');

        // Allow user to say "retry" or "try again"
        if (lower === 'retry' || lower === 'try again' || lower === 'retry recipient') {
          audioEngine.playEarcon('step_advance');
          updatePromptAndSpeak('Please say the contact name or ten-digit mobile number again.');
          return;
        }

        // 1. Check if user spoke a mobile number or attempted one
        const mobileCheck = parseSpokenMobile(rawCommand);

        // A. If user spoke an attempted mobile number that is incomplete or has invalid length/prefix:
        if (mobileCheck.isPotentialMobile && !mobileCheck.isValid) {
          audioEngine.playEarcon('warning');
          let spokenError = '';
          if (mobileCheck.isIncomplete) {
            spokenError = `The mobile number you spoke has only ${mobileCheck.digitCount} digits: ${mobileCheck.spokenDigits}. Indian mobile numbers must be ten digits. Please repeat the complete ten-digit mobile number.`;
          } else if (mobileCheck.isTooLong) {
            spokenError = `The mobile number you spoke has ${mobileCheck.digitCount} digits, which exceeds ten digits. Indian mobile numbers must be ten digits. Please repeat the ten-digit mobile number.`;
          } else {
            spokenError = `The mobile number you spoke, ${mobileCheck.spokenDigits}, is not a valid Indian mobile number. Mobile numbers must start with 6, 7, 8, or 9. Please repeat the ten-digit mobile number.`;
          }
          updatePromptAndSpeak(spokenError);
          return;
        }

        // B. If user spoke a valid 10-digit mobile number
        if (mobileCheck.isValid && mobileCheck.mobile) {
          const cleanMobile = mobileCheck.mobile;
          const spokenDigits = mobileCheck.spokenDigits || formatMobileSpokenDigits(cleanMobile);
          try {
            const res = await fetch('/api/recipients/resolve-mobile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile: cleanMobile }),
            });
            const data = await res.json();

            if (data.resolved && data.recipient) {
              const matched = data.recipient;
              setDraft((prev) => ({ ...prev, recipient: matched }));
              setWorkflowState('STEP_2_RECIPIENT');
              setPaymentStep(2);
              audioEngine.playEarcon('recognized');
              updatePromptAndSpeak(
                `Mobile number ${spokenDigits} is verified as ${matched.name} on ${matched.bankName}. Would you like to proceed with this recipient? Say "confirm details" or "yes" to continue, or say another number.`
              );
              return;
            } else {
              // Valid 10 digits, but not found in saved contacts
              audioEngine.playEarcon('warning');
              updatePromptAndSpeak(
                `No saved contact matches mobile number ${spokenDigits}, and it could not be resolved by the payment provider. Say "retry" to say the number again, or choose a saved contact like Rahul Sharma or Priya Patel.`
              );
              return;
            }
          } catch (err) {
            audioEngine.playEarcon('error');
            updatePromptAndSpeak('Error connecting to payment provider to verify mobile number. Please try again or say a contact name.');
            return;
          }
        }

        // 2. Search saved contacts by name or partial details
        try {
          const res = await fetch('/api/recipients/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: rawCommand }),
          });
          const data = await res.json();

          if (data.matches && data.matches.length === 1) {
            const matched = data.selected;
            setDraft((prev) => ({ ...prev, recipient: matched }));
            setWorkflowState('STEP_2_RECIPIENT');
            setPaymentStep(2);
            audioEngine.playEarcon('recognized');
            updatePromptAndSpeak(
              `I found ${matched.name}, mobile ending in ${matched.lastFourDigits}. Say "confirm details" to continue, or say another contact name or ten-digit mobile number.`
            );
            return;
          } else if (data.isAmbiguous) {
            audioEngine.playEarcon('warning');
            updatePromptAndSpeak(data.spokenResponse);
            return;
          } else if (data.isIncomplete) {
            audioEngine.playEarcon('warning');
            updatePromptAndSpeak(data.spokenResponse);
            return;
          } else {
            audioEngine.playEarcon('error');
            updatePromptAndSpeak(
              `I could not find anyone matching "${rawCommand}". Please say a contact name like Rahul Sharma or a ten-digit mobile number.`
            );
            return;
          }
        } catch (err) {
          audioEngine.playEarcon('error');
          updatePromptAndSpeak('Error searching for contact. Please repeat the name or mobile number.');
          return;
        }
      }

      // C. STEP 2: RECIPIENT VERIFICATION
      if (current.workflowState === 'STEP_2_RECIPIENT' || current.paymentStep === 2) {
        if (
          lower.includes('confirm') ||
          lower.includes('yes') ||
          lower.includes('proceed') ||
          lower.includes('correct') ||
          lower.includes('continue')
        ) {
          setWorkflowState('STEP_3_AMOUNT');
          setPaymentStep(3);
          audioEngine.playEarcon('step_advance');
          updatePromptAndSpeak(`How much would you like to pay ${current.draft.recipient?.name || 'them'} in rupees?`);
          return;
        }

        if (lower.includes('change') || lower.includes('no') || lower.includes('different') || lower.includes('wrong')) {
          setWorkflowState('STEP_1_START');
          setPaymentStep(1);
          updatePromptAndSpeak('Who would you like to pay instead? Please say a contact name or a ten-digit mobile number.');
          return;
        }
      }

      // D. STEP 3: PAYMENT AMOUNT ENTRY & VALIDATION
      if (current.workflowState === 'STEP_3_AMOUNT' || current.paymentStep === 3) {
        if (current.draft.amount && (lower.includes('confirm') || lower.includes('yes') || lower.includes('proceed'))) {
          setWorkflowState('STEP_4_REVIEW');
          setPaymentStep(4);
          audioEngine.playEarcon('step_advance');
          const digitsSpoken = formatMobileSpokenDigits(current.draft.recipient?.mobile || '');
          const summary = `You are about to authorize a test payment of ${current.draft.amount} rupees to ${current.draft.recipient?.name}, mobile number ${digitsSpoken}. Funding source: VisionPay Test Balance in development sandbox. Say "confirm details" to continue, "change amount", "change recipient", or "cancel payment".`;
          updatePromptAndSpeak(summary);
          return;
        }

        const parsed = parseSpokenAmount(rawCommand);
        if (parsed.amount && parsed.amount > 0) {
          const bal = current.user?.balance || 15000;
          if (parsed.amount > bal) {
            audioEngine.playEarcon('error');
            updatePromptAndSpeak(`You do not have enough funds. Your balance is ${bal} rupees. Please say a lower amount.`);
            return;
          }

          setDraft((prev) => ({
            ...prev,
            amount: parsed.amount,
            spokenAmountText: formatAmountSpoken(parsed.amount!),
          }));
          audioEngine.playEarcon('recognized');

          setWorkflowState('STEP_4_REVIEW');
          setPaymentStep(4);
          const digitsSpoken = formatMobileSpokenDigits(current.draft.recipient?.mobile || '');
          const reviewText = `You are about to authorize a test payment of ${parsed.amount} rupees to ${current.draft.recipient?.name}, mobile number ${digitsSpoken}. Funding source: VisionPay Test Balance in development sandbox. Say "confirm details" to proceed with authorization, "change amount", "change recipient", or "cancel payment".`;
          updatePromptAndSpeak(reviewText);
          return;
        } else {
          audioEngine.playEarcon('warning');
          updatePromptAndSpeak('Please specify a valid payment amount, such as "five hundred rupees" or "one thousand".');
          return;
        }
      }

      // E. STEP 4: TRANSACTION REVIEW
      if (current.workflowState === 'STEP_4_REVIEW' || current.paymentStep === 4) {
        if (
          lower.includes('confirm') ||
          lower.includes('yes') ||
          lower.includes('continue') ||
          lower.includes('proceed') ||
          lower.includes('pay now')
        ) {
          setVoiceStatus('PROCESSING');
          try {
            const prepRes = await fetch('/api/payments/prepare', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientId: current.draft.recipient?.id,
                amount: current.draft.amount,
              }),
            });
            const prepData = await prepRes.json();
            if (!prepRes.ok) throw new Error(prepData.error);

            setDraft((prev) => ({
              ...prev,
              intentId: prepData.intentId,
              idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            }));

            setWorkflowState('STEP_5_AUTH');
            setPaymentStep(5);
            audioEngine.playEarcon('step_advance');
            updatePromptAndSpeak(
              'Payment authorization required. Please verify with your device biometric sensor, or say your secure PIN.'
            );
          } catch (e: any) {
            audioEngine.playEarcon('error');
            updatePromptAndSpeak(`Failed to prepare payment: ${e.message}`);
          }
          return;
        }

        if (lower.includes('change amount')) {
          setWorkflowState('STEP_3_AMOUNT');
          setPaymentStep(3);
          updatePromptAndSpeak('How much would you like to pay in rupees?');
          return;
        }

        if (lower.includes('change recipient')) {
          setWorkflowState('STEP_1_START');
          setPaymentStep(1);
          updatePromptAndSpeak('Who would you like to pay? Please say the contact name.');
          return;
        }
      }

      // F. STEP 5: SECURE PAYMENT AUTHORIZATION
      if (current.workflowState === 'STEP_5_AUTH' || current.paymentStep === 5) {
        const digits = rawCommand.replace(/\D/g, '');
        if (digits.length === 4) {
          if (digits === '2580') {
            updatePromptAndSpeak('PIN verified. Authorizing payment.', false);
            executeAuthorization('secure_pin', { pin: '2580' });
            return;
          } else {
            audioEngine.playEarcon('error');
            updatePromptAndSpeak('Incorrect PIN. Please say your 4-digit PIN again or touch your biometric sensor.');
            return;
          }
        }

        if (lower.includes('biometric') || lower.includes('fingerprint') || lower.includes('touch') || lower.includes('passkey')) {
          updatePromptAndSpeak('Verifying biometric authenticator.', false);
          executeAuthorization('demo_device_biometric', { assertion: 'touch_verified' });
          return;
        }
      }

      // G. STEP 7: VERIFIED OUTCOME
      if (current.workflowState === 'STEP_7_RESULT' || current.paymentStep === 7) {
        if (lower.includes('another') || lower.includes('new payment') || lower.includes('again') || lower.includes('pay')) {
          setWorkflowState('STEP_1_START');
          setPaymentStep(1);
          setDraft(EMPTY_DRAFT);
          audioEngine.playEarcon('step_advance');
          updatePromptAndSpeak("Let's make another payment. Who would you like to pay?");
          return;
        }

        if (lower.includes('exit') || lower.includes('done') || lower.includes('dashboard') || lower.includes('home')) {
          setWorkflowState('DASHBOARD');
          setPaymentStep(1);
          setDraft(EMPTY_DRAFT);
          updatePromptAndSpeak('Returned to main screen. What would you like to do?');
          return;
        }
      }

      // 3. RECOVERY FROM UNCLEAR SPEECH / OPTIONAL GEMINI ASSISTANCE
      setVoiceStatus('PROCESSING');
      try {
        const res = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: rawCommand, currentStep: current.workflowState }),
        });
        const data = await res.json();
        if (data.answer) {
          updatePromptAndSpeak(data.answer);
        }
      } catch (e) {
        updatePromptAndSpeak('I didn\'t understand that. You can say "Make a payment", "Repeat that", or "Help".');
      }
    },
    [updatePromptAndSpeak]
  );

  useEffect(() => {
    handleVoiceCommandRef.current = handleVoiceCommand;
  }, [handleVoiceCommand]);

  // Execute Authorization with Server Idempotency & Verification
  const executeAuthorization = async (authMethod: string, credential: any) => {
    // Prevent duplicate transactions during retries or multiple rapid clicks
    if (isAuthorizingRef.current) {
      console.warn('Payment authorization already in progress. Ignoring duplicate trigger.');
      return;
    }
    isAuthorizingRef.current = true;

    const current = stateRef.current;
    setVoiceStatus('PROCESSING');
    try {
      let intentId = current.draft.intentId;
      if (!intentId && current.draft.recipient && current.draft.amount) {
        const prepRes = await fetch('/api/payments/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: current.draft.recipient.id,
            amount: current.draft.amount,
          }),
        });
        const prepData = await prepRes.json();
        intentId = prepData.intentId;
      }

      // Preserve idempotency key on draft so any retries are idempotent
      const idemKey = current.draft.idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (!current.draft.idempotencyKey) {
        setDraft((prev) => ({ ...prev, idempotencyKey: idemKey }));
      }

      const authRes = await fetch('/api/payments/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          authMethod,
          credential,
          idempotencyKey: idemKey,
        }),
      });

      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.error || 'Payment execution failed');

      setLastTransaction(authData.transaction);
      if (user) {
        setUser({ ...user, balance: authData.updatedBalance });
      }

      setWorkflowState('STEP_7_RESULT');
      setPaymentStep(7);
      audioEngine.playEarcon('success');

      // Announce the success through speech, including the amount, recipient, and transaction reference
      const successAnnouncement = `Test payment of ${authData.transaction.amount} rupees to ${authData.transaction.recipientName} was successful. Transaction reference: ${authData.transaction.referenceId}. Funding source: VisionPay Test Balance in development sandbox. Returning to home screen.`;
      setSystemPromptText(successAnnouncement);
      setScreenReaderAnnouncement(successAnnouncement);
      setVoiceStatus('SPEAKING');

      // Automatically return to the voice home screen after the announcement finishes
      audioEngine.speak(successAnnouncement, {
        onStart: () => setVoiceStatus('SPEAKING'),
        onEnd: () => {
          setVoiceStatus('IDLE');
          setTimeout(() => {
            isAuthorizingRef.current = false;
            setWorkflowState('DASHBOARD');
            setPaymentStep(1);
            setDraft(EMPTY_DRAFT);
            const homeGreeting = 'Returned to home screen. What would you like to do? You can say: Make a payment, Check balance, or Help.';
            updatePromptAndSpeak(homeGreeting, true);
          }, 500);
        },
      });
    } catch (err: any) {
      isAuthorizingRef.current = false;
      audioEngine.playEarcon('error');
      setVoiceStatus('ERROR');
      // Communicate actual status and never announce false success
      updatePromptAndSpeak(`Payment failed: ${err.message}. You can say try again or cancel payment.`);
    }
  };

  // ==========================================================================
  // PREDICTABLE TAP-ANYWHERE BEHAVIOR
  // ==========================================================================
  const handleScreenTap = () => {
    audioEngine.unlockAudio();

    // 1. If mic is unavailable, tapping retries permission
    if (voiceStatus === 'MICROPHONE_UNAVAILABLE') {
      handleRetryMicPermission();
      return;
    }

    // Clear any temporary recognition error on tap
    if (recognitionError) {
      setRecognitionError(null);
    }

    // 2. If on initial Welcome, advance to Action Select and speak
    if (workflowState === 'WELCOME') {
      setWorkflowState('DASHBOARD');
      updatePromptAndSpeak('What would you like to do? You can say: Make a payment, Check balance, or Help.');
      return;
    }

    // 3. If currently speaking: interrupt speech and start listening for user input
    // Crucial: does NOT cancel payment!
    if (audioEngine.getIsSpeaking()) {
      audioEngine.stopSpeaking();
      setVoiceStatus('IDLE');
      triggerListening();
      return;
    }

    // 4. If currently listening: tapping pauses/stops listening
    if (audioEngine.getIsListening()) {
      audioEngine.stopListening();
      setVoiceStatus('IDLE');
      return;
    }

    // 5. If idle, processing, or error: tapping triggers listening
    triggerListening();
  };

  // Keyboard Shortcuts (Space, R, Esc, H, Ctrl+Shift+D for dev tools)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDevMenuOpen((prev) => !prev);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleScreenTap();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        audioEngine.repeatLast();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (workflowState.startsWith('STEP_')) {
          audioEngine.playEarcon('cancel');
          setDraft(EMPTY_DRAFT);
          setWorkflowState('DASHBOARD');
          setPaymentStep(1);
          updatePromptAndSpeak('Payment cancelled.');
        } else {
          setIsDevMenuOpen(false);
          setIsExhibitionBriefOpen(false);
          setIsTestRunnerOpen(false);
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsHelpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workflowState, updatePromptAndSpeak, handleRetryMicPermission]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex justify-center items-center font-sans antialiased">
      {/* Mobile-First Customer Screen (Clean Light Theme) */}
      <MobileVoiceScreen
        workflowState={workflowState}
        paymentStep={paymentStep}
        voiceStatus={voiceStatus}
        systemPromptText={systemPromptText}
        heardTranscript={heardTranscript}
        screenReaderAnnouncement={screenReaderAnnouncement}
        onScreenTap={handleScreenTap}
        onRepeat={() => audioEngine.repeatLast()}
        onCancel={() => {
          if (workflowState.startsWith('STEP_')) {
            audioEngine.playEarcon('cancel');
            setDraft(EMPTY_DRAFT);
            setWorkflowState('DASHBOARD');
            setPaymentStep(1);
            updatePromptAndSpeak('Payment cancelled.');
          }
        }}
        onHelp={() => setIsHelpOpen(true)}
        onRetryMicPermission={handleRetryMicPermission}
        onSendTextCommand={(cmd) => handleVoiceCommand(cmd)}
        draft={draft}
        lastTransaction={lastTransaction}
        onQuickPinSubmit={(pin) => executeAuthorization('secure_pin', { pin })}
        onBiometricAuthorize={() => executeAuthorization('demo_device_biometric', { assertion: 'touch_verified' })}
        micErrorMessage={micErrorMessage}
        recognitionError={recognitionError}
        onRetryRecognition={handleRetryRecognition}
        lastRecognizedSpeech={lastRecognizedSpeech}
        onOpenDevTools={() => setIsDevMenuOpen(true)}
      />

      {/* Developer / Evaluator Drawer (Separated from Customer Interface) */}
      {isDevMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-[#0A192F] text-base">Development & Project Tools</h3>
                <p className="text-xs text-slate-500">Evaluator access (Separated from customer app)</p>
              </div>
              <button
                onClick={() => setIsDevMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setIsDevMenuOpen(false);
                  setIsTestRunnerOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-left flex items-center justify-between transition-colors"
              >
                <span>Automated Test Runner (17 Cases)</span>
                <span>&rarr;</span>
              </button>

              <button
                onClick={() => {
                  setIsDevMenuOpen(false);
                  setIsExhibitionBriefOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-left flex items-center justify-between transition-colors"
              >
                <span>College Brief, Port 5000 & MongoDB Guide</span>
                <span>&rarr;</span>
              </button>

              <button
                onClick={() => {
                  setIsDevMenuOpen(false);
                  setIsHelpOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0A192F] font-bold text-xs text-left flex items-center justify-between transition-colors"
              >
                <span>Gemini Accessible Assistant Console</span>
                <span>&rarr;</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 text-center pt-2">
              Shortcut: Triple-tap logo or press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded">Ctrl+Shift+D</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Developer Modals */}
      <ExhibitionBriefDrawer
        isOpen={isExhibitionBriefOpen}
        onClose={() => setIsExhibitionBriefOpen(false)}
        isHighContrast={false}
      />

      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
        isHighContrast={false}
      />

      <GeminiHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        isHighContrast={false}
        currentStateName={workflowState}
      />
    </div>
  );
}
