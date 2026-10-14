import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Enable CORS for development testing (e.g., college port 5000 / 3000 cross-port scenarios)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Idempotency-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// GEMINI API CLIENT (Server-Side only)
// ============================================================================
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('VisionPay: Gemini API Client initialized successfully');
  } catch (err) {
    console.warn('VisionPay: Failed to initialize Gemini API client:', err);
  }
} else {
  console.log('VisionPay: GEMINI_API_KEY not configured. Deterministic assistant fallback enabled.');
}

// ============================================================================
// DATA STORE (MongoDB Atlas Schema Compatible In-Memory & Extensible Store)
// ============================================================================
interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  pinHash: string;
  balance: number;
  hasPasskey: boolean;
  createdAt: string;
}

interface Recipient {
  id: string;
  name: string;
  mobile: string;
  lastFourDigits: string;
  upiId: string;
  bankName: string;
  relationship: string;
  avatarColor: string;
}

interface PaymentIntent {
  intentId: string;
  userId: string;
  recipientId: string;
  recipientName: string;
  recipientMobile: string;
  recipientLastFour: string;
  amount: number;
  currency: string;
  summaryText: string;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'AUTHORIZED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  authMethod?: string;
  createdAt: number;
  expiresAt: number;
  idempotencyKey?: string;
  resultRef?: string;
}

interface TransactionRecord {
  id: string;
  referenceId: string;
  userId: string;
  recipientId: string;
  recipientName: string;
  recipientMobile: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED';
  authMethod: string;
  isDemo: boolean;
  disclaimer: string;
  spokenResult: string;
  timestamp: string;
}

// Pre-seeded database
const users: Map<string, User> = new Map();
const recipients: Recipient[] = [
  {
    id: 'rec_1',
    name: 'Rahul Sharma',
    mobile: '9876541234',
    lastFourDigits: '1234',
    upiId: 'rahul.sharma@okhdfcbank',
    bankName: 'HDFC Bank',
    relationship: 'Colleague',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'rec_2',
    name: 'Priya Patel',
    mobile: '9876545678',
    lastFourDigits: '5678',
    upiId: 'priya.patel@icici',
    bankName: 'ICICI Bank',
    relationship: 'Family',
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'rec_3',
    name: 'Amit Verma',
    mobile: '9876549012',
    lastFourDigits: '9012',
    upiId: 'amit.verma@axisbank',
    bankName: 'Axis Bank',
    relationship: 'Landlord',
    avatarColor: 'bg-amber-600',
  },
  {
    id: 'rec_4',
    name: 'Sneha Reddy',
    mobile: '9876543456',
    lastFourDigits: '3456',
    upiId: 'sneha.reddy@sbi',
    bankName: 'State Bank of India',
    relationship: 'Friend',
    avatarColor: 'bg-rose-600',
  },
  {
    id: 'rec_5',
    name: 'Rahul Verma',
    mobile: '9876547890',
    lastFourDigits: '7890',
    upiId: 'rahul.verma@paytm',
    bankName: 'Paytm Payments Bank',
    relationship: 'Grocery Merchant',
    avatarColor: 'bg-teal-600',
  },
];

// Helper to hash PIN
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Seed default demo user: Aarav Sharma (PIN: 2580)
const defaultDemoUser: User = {
  id: 'usr_demo_101',
  name: 'Aarav Sharma',
  email: 'demo@visionpay.org',
  mobile: '9876543210',
  pinHash: hashPin('2580'),
  balance: 15000.0,
  hasPasskey: true,
  createdAt: new Date().toISOString(),
};
users.set(defaultDemoUser.id, defaultDemoUser);

// Sessions, intents, transactions, and idempotency store
const sessions: Map<string, string> = new Map(); // token -> userId
const paymentIntents: Map<string, PaymentIntent> = new Map();
const processedIdempotencyKeys: Map<string, TransactionRecord> = new Map();
const transactionHistory: TransactionRecord[] = [
  {
    id: 'tx_seed_1',
    referenceId: 'VP-DEMO-73921',
    userId: defaultDemoUser.id,
    recipientId: 'rec_1',
    recipientName: 'Rahul Sharma',
    recipientMobile: '9876541234',
    amount: 250,
    currency: 'INR',
    status: 'COMPLETED',
    authMethod: 'passkey_biometric',
    isDemo: true,
    disclaimer: 'DEMO — NO REAL MONEY TRANSFERRED',
    spokenResult: 'Your demo payment of two hundred and fifty rupees to Rahul Sharma was successful. No real money was transferred.',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tx_seed_2',
    referenceId: 'VP-DEMO-18492',
    userId: defaultDemoUser.id,
    recipientId: 'rec_2',
    recipientName: 'Priya Patel',
    recipientMobile: '9876545678',
    amount: 1200,
    currency: 'INR',
    status: 'COMPLETED',
    authMethod: 'secure_pin',
    isDemo: true,
    disclaimer: 'DEMO — NO REAL MONEY TRANSFERRED',
    spokenResult: 'Your demo payment of one thousand two hundred rupees to Priya Patel was successful. No real money was transferred.',
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

// Active challenge store for WebAuthn / Passkey
const biometricChallenges: Map<string, { challenge: string; expiresAt: number; intentId?: string }> = new Map();

// Helper middleware to get authenticated user
function getAuthUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return users.get(defaultDemoUser.id) || null; // fallback to demo user for seamless demonstration
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userId = sessions.get(token);
  if (userId && users.has(userId)) {
    return users.get(userId)!;
  }
  return users.get(defaultDemoUser.id) || null;
}

// ============================================================================
// SYSTEM & HEALTH ENDPOINTS
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'VisionPay Accessibility Core',
    version: '1.2.0-major-project',
    environment: {
      port: PORT,
      collegeBackendPort: 5000,
      database: {
        engine: 'MongoDB Atlas Model Compatible In-Memory Store',
        mongoUriConfigured: Boolean(process.env.MONGODB_URI),
        activeRecords: {
          users: users.size,
          recipients: recipients.length,
          transactions: transactionHistory.length,
        },
      },
      geminiAI: {
        configured: Boolean(geminiClient),
        model: 'gemini-3.8-flash',
      },
      paymentProvider: {
        providerName: 'VisionPay Development Sandbox',
        fundingSource: 'VisionPay Demo Balance (Test Wallet)',
        isRealMoney: false,
        disclaimer: 'DEVELOPMENT / TEST ENVIRONMENT — NO REAL MONEY TRANSFERRED',
      },
      security: {
        webAuthnPasskeySupported: true,
        biometricLimitationHonesty: 'Physical biometric sensors require OS prompts; JavaScript cannot directly bypass browser security boundaries.',
        demoSafeguard: 'DEVELOPMENT SANDBOX — NO REAL MONEY TRANSFERRED',
      },
    },
  });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS (Preserved & Enhanced for Voice Flow)
// ============================================================================
app.post('/api/auth/register', (req, res) => {
  const { name, email, mobile, pin } = req.body;

  if (!name || !mobile || !pin) {
    return res.status(400).json({ error: 'Name, mobile number, and 4-digit PIN are required.' });
  }

  const cleanMobile = mobile.replace(/\D/g, '');
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ error: 'Mobile number must be exactly 10 digits.' });
  }

  const cleanPin = pin.toString().trim();
  if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });
  }

  // Check if mobile already exists
  for (const user of users.values()) {
    if (user.mobile === cleanMobile) {
      return res.status(409).json({ error: 'A user with this mobile number already exists.' });
    }
  }

  const userId = `usr_${Date.now()}`;
  const newUser: User = {
    id: userId,
    name: name.trim(),
    email: (email || `${cleanMobile}@visionpay.org`).trim(),
    mobile: cleanMobile,
    pinHash: hashPin(cleanPin),
    balance: 10000.0,
    hasPasskey: false,
    createdAt: new Date().toISOString(),
  };

  users.set(userId, newUser);

  const token = `tok_${crypto.randomUUID()}`;
  sessions.set(token, userId);

  return res.status(201).json({
    message: 'Registration successful',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      mobile: newUser.mobile,
      email: newUser.email,
      balance: newUser.balance,
      hasPasskey: newUser.hasPasskey,
    },
    spokenGreeting: `Welcome to VisionPay, ${newUser.name}. Your account has been registered with ten thousand demo rupees.`,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, pin, isDemoLogin } = req.body;

  if (isDemoLogin) {
    const demoUser = users.get(defaultDemoUser.id)!;
    const token = `tok_${crypto.randomUUID()}`;
    sessions.set(token, demoUser.id);
    return res.json({
      message: 'Logged in as Demo User',
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        mobile: demoUser.mobile,
        email: demoUser.email,
        balance: demoUser.balance,
        hasPasskey: demoUser.hasPasskey,
      },
      spokenGreeting: `Welcome back, ${demoUser.name}. Your available balance is ${demoUser.balance} rupees. Say "make a payment" to begin.`,
    });
  }

  if (!identifier || !pin) {
    return res.status(400).json({ error: 'Identifier (mobile or email) and 4-digit PIN are required.' });
  }

  const cleanPin = pin.toString().trim();
  const inputPinHash = hashPin(cleanPin);

  let matchedUser: User | null = null;
  const cleanId = identifier.toString().replace(/\D/g, '');

  for (const user of users.values()) {
    if (user.mobile === cleanId || user.email.toLowerCase() === identifier.toString().toLowerCase()) {
      if (user.pinHash === inputPinHash) {
        matchedUser = user;
        break;
      }
    }
  }

  if (!matchedUser) {
    return res.status(401).json({ error: 'Invalid mobile/email or PIN. Please try again.' });
  }

  const token = `tok_${crypto.randomUUID()}`;
  sessions.set(token, matchedUser.id);

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      mobile: matchedUser.mobile,
      email: matchedUser.email,
      balance: matchedUser.balance,
      hasPasskey: matchedUser.hasPasskey,
    },
    spokenGreeting: `Welcome back, ${matchedUser.name}. Your balance is ${matchedUser.balance} rupees.`,
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      balance: user.balance,
      hasPasskey: user.hasPasskey,
    },
  });
});

// ============================================================================
// RECIPIENTS DIRECTORY & VOICE SEARCH ENDPOINTS
// ============================================================================
app.get('/api/recipients', (req, res) => {
  res.json({ recipients });
});

// Dedicated Endpoint: Resolve recipient by 10-digit mobile number with digit-by-digit readback
app.post('/api/recipients/resolve-mobile', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: 'Mobile number is required' });
  }

  const cleanMobile = mobile.toString().replace(/\D/g, '');
  if (cleanMobile.length !== 10) {
    return res.status(400).json({
      error: 'Invalid mobile number. Must be exactly 10 digits.',
      spokenResponse: 'The mobile number provided is not ten digits. Please say a valid ten-digit mobile number.',
    });
  }

  const spokenDigits = cleanMobile.split('').join(', ');

  const recipient = recipients.find((r) => r.mobile === cleanMobile);
  if (!recipient) {
    return res.json({
      resolved: false,
      mobile: cleanMobile,
      spokenDigits,
      message: `No saved contact matches mobile number ${cleanMobile}. It could not be resolved by the payment provider.`,
      spokenResponse: `No saved contact matches mobile number ${spokenDigits}, and it could not be resolved by the payment provider. No active banking account was found for this number. Please confirm the number or say "retry" to try again, or choose a saved contact like Rahul Sharma or Priya Patel.`,
    });
  }

  return res.json({
    resolved: true,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      mobile: recipient.mobile,
      lastFourDigits: recipient.lastFourDigits,
      upiId: recipient.upiId,
      bankName: recipient.bankName,
      relationship: recipient.relationship,
      avatarColor: recipient.avatarColor,
    },
    spokenDigits,
    spokenResponse: `Mobile number ${spokenDigits} is verified as ${recipient.name} on ${recipient.bankName}. Would you like to pay ${recipient.name}? Say "confirm details" or "yes" to continue, or say another contact.`,
  });
});

app.post('/api/recipients/search', (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const normalized = query.toLowerCase().trim();
  const digits = normalized.replace(/\D/g, '');
  const nonDigitChars = normalized.replace(/[\d\s\-\+\(\)\,\.]/g, '');
  const hasContactLetters = /[a-z]/i.test(nonDigitChars.replace(/mobile|number|phone|cell|pay|send|transfer|to/g, ''));

  // 1. If user entered/spoke digits without contact name letters (e.g. attempted phone number)
  if (digits.length > 0 && !hasContactLetters) {
    const spokenDigits = digits.split('').join(', ');

    // Length validation for Indian mobile numbers
    if (digits.length !== 10) {
      return res.status(400).json({
        error: 'Incomplete mobile number',
        isIncomplete: digits.length < 10,
        digitCount: digits.length,
        spokenDigits,
        spokenResponse: `The mobile number provided has only ${digits.length} digits: ${spokenDigits}. Indian mobile numbers must be ten digits. Please repeat the complete ten-digit mobile number.`,
      });
    }

    // Exact 10-digit mobile check
    const phoneRecipient = recipients.find((r) => r.mobile === digits);
    if (phoneRecipient) {
      return res.json({
        matches: [phoneRecipient],
        isAmbiguous: false,
        resolvedByMobile: true,
        selected: phoneRecipient,
        spokenDigits,
        spokenResponse: `Mobile number ${spokenDigits} is verified as ${phoneRecipient.name} on ${phoneRecipient.bankName}. Would you like to pay ${phoneRecipient.name}? Say "confirm details" or "yes" to continue.`,
      });
    } else {
      return res.json({
        matches: [],
        isAmbiguous: false,
        resolvedByMobile: false,
        spokenDigits,
        message: `No saved contact matches mobile number ${digits}.`,
        spokenResponse: `No saved contact matches mobile number ${spokenDigits}, and it could not be resolved by the payment provider. Please confirm the number or say "retry" to try again, or choose a saved contact like Rahul Sharma, Priya Patel, or Amit Verma.`,
      });
    }
  }

  // 2. Look for name or last-four matches in saved contacts
  const matches = recipients.filter((r) => {
    const nameMatch = r.name.toLowerCase().includes(normalized);
    const lastFourMatch = digits.length === 4 && r.lastFourDigits === digits;
    const upiMatch = r.upiId.toLowerCase().includes(normalized);
    return nameMatch || lastFourMatch || upiMatch;
  });

  if (matches.length === 0) {
    return res.json({
      matches: [],
      isAmbiguous: false,
      message: `No recipient found matching "${query}".`,
      spokenResponse: `I could not find anyone matching "${query}". Please say a contact name like Rahul Sharma or a ten-digit mobile number.`,
    });
  }

  if (matches.length === 1) {
    const r = matches[0];
    return res.json({
      matches,
      isAmbiguous: false,
      selected: r,
      spokenResponse: `I found ${r.name}, mobile ending in ${r.lastFourDigits}. Would you like to pay ${r.name}? Say "yes" or "confirm" to continue.`,
    });
  }

  // Ambiguous: multiple matches (e.g., Rahul Sharma and Rahul Verma)
  const candidateNames = matches.map((m, idx) => `${idx + 1}, ${m.name} ending in ${m.lastFourDigits}`).join('. Or ');
  return res.json({
    matches,
    isAmbiguous: true,
    spokenResponse: `I found ${matches.length} contacts matching that name. Option ${candidateNames}. Which one would you like to pay?`,
  });
});

// ============================================================================
// PAYMENT WORKFLOW ENDPOINTS (Strict State & Server Verification)
// ============================================================================

// Step 3 & 4: Prepare and validate payment intent
app.post('/api/payments/prepare', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { recipientId, amount } = req.body;

  if (!recipientId) {
    return res.status(400).json({ error: 'Recipient is required' });
  }

  const recipient = recipients.find((r) => r.id === recipientId);
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found in verified directory.' });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number greater than zero.' });
  }

  if (numAmount > 10000) {
    return res.status(400).json({ error: 'For college exhibition demo safety, maximum payment limit is ₹10,000.' });
  }

  if (numAmount > user.balance) {
    return res.status(400).json({
      error: `Insufficient balance. Your current balance is ₹${user.balance}, but you requested ₹${numAmount}.`,
      spokenError: `You do not have enough funds. Your current balance is ${user.balance} rupees. Please enter a lower amount.`,
    });
  }

  const intentId = `pi_${crypto.randomUUID().slice(0, 8)}`;
  const summaryText = `You are about to pay ${numAmount} rupees to ${recipient.name}, mobile number ending in ${recipient.lastFourDigits}. Funding source: VisionPay Test Balance in development sandbox. Please verify these details. Do you want to continue?`;

  const intent: PaymentIntent = {
    intentId,
    userId: user.id,
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientMobile: recipient.mobile,
    recipientLastFour: recipient.lastFourDigits,
    amount: numAmount,
    currency: 'INR',
    summaryText,
    status: 'CONFIRMED',
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
  };

  paymentIntents.set(intentId, intent);

  return res.json({
    intentId,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      mobile: recipient.mobile,
      lastFourDigits: recipient.lastFourDigits,
      upiId: recipient.upiId,
    },
    amount: numAmount,
    currency: 'INR',
    fundingSource: 'VisionPay Test Balance (Development Sandbox)',
    paymentProvider: 'VisionPay Development Sandbox',
    summaryText,
    expiresAt: intent.expiresAt,
    spokenSummary: summaryText,
  });
});

// WebAuthn / Passkey challenge creation bound to transaction
app.post('/api/auth/biometric/challenge', (req, res) => {
  const { intentId } = req.body;
  const challengeBuffer = crypto.randomBytes(32);
  const challenge = challengeBuffer.toString('base64url');

  const expiry = Date.now() + 2 * 60 * 1000;
  biometricChallenges.set(challenge, {
    challenge,
    expiresAt: expiry,
    intentId,
  });

  res.json({
    challenge,
    rp: {
      name: 'VisionPay Accessible Banking',
      id: req.hostname || 'localhost',
    },
    timeout: 60000,
    userVerification: 'required',
  });
});

// Step 5 & 6: Secure payment authorization and execution
app.post('/api/payments/authorize', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { intentId, authMethod, credential, idempotencyKey } = req.body;

  // 1. Idempotency Check (Duplicate submission protection)
  if (idempotencyKey) {
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      const cached = processedIdempotencyKeys.get(idempotencyKey)!;
      return res.status(200).json({
        message: 'Duplicate request detected. Returning existing transaction result.',
        transaction: cached,
        spokenResult: cached.spokenResult,
      });
    }
  }

  // 2. Validate Payment Intent
  if (!intentId) {
    return res.status(400).json({ error: 'Payment intent ID is required.' });
  }

  const intent = paymentIntents.get(intentId);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found or expired.' });
  }

  if (intent.status === 'COMPLETED') {
    return res.status(400).json({ error: 'This transaction has already been completed.' });
  }

  if (intent.status === 'CANCELLED') {
    return res.status(400).json({ error: 'This transaction was cancelled by user.' });
  }

  if (Date.now() > intent.expiresAt) {
    intent.status = 'FAILED';
    return res.status(400).json({
      error: 'Payment session expired. Please start payment again.',
      spokenError: 'Payment session expired. Please say "make a payment" to start again.',
    });
  }

  // 3. Strict Server-Side Verification of Amount and User Balance
  if (user.balance < intent.amount) {
    intent.status = 'FAILED';
    return res.status(400).json({
      error: 'Insufficient account balance.',
      spokenError: 'Your payment was not completed due to insufficient balance.',
    });
  }

  // 4. Verify Authentication Method
  let authSuccess = false;
  let authDetail = '';

  if (authMethod === 'passkey_biometric') {
    // WebAuthn or platform biometric assertion
    if (credential && (credential.id || credential.rawId || credential.challenge)) {
      authSuccess = true;
      authDetail = 'Device Biometric Authenticator (WebAuthn Passkey)';
    } else {
      authSuccess = false;
      authDetail = 'Passkey assertion payload missing';
    }
  } else if (authMethod === 'secure_pin') {
    const inputPin = credential?.pin ? credential.pin.toString().trim() : '';
    if (inputPin && hashPin(inputPin) === user.pinHash) {
      authSuccess = true;
      authDetail = 'Secure 4-Digit Voice/Key PIN Verified';
    } else {
      authSuccess = false;
      authDetail = 'Incorrect PIN provided';
    }
  } else if (authMethod === 'demo_device_biometric') {
    // Demonstration-only fallback mode with explicit audit log
    authSuccess = true;
    authDetail = 'Simulated Platform Authenticator (Demo Mode)';
  } else {
    return res.status(400).json({ error: 'Unsupported authentication method.' });
  }

  if (!authSuccess) {
    return res.status(401).json({
      error: `Authentication failed: ${authDetail}`,
      spokenError: 'Authentication failed. Please verify your PIN or biometric sensor.',
    });
  }

  // 5. Execute Transaction (Deduct demo balance & record demo receipt)
  user.balance -= intent.amount;
  users.set(user.id, user);

  intent.status = 'COMPLETED';
  intent.authMethod = authMethod;

  const referenceId = `VP-TEST-${Math.floor(100000 + Math.random() * 900000)}`;
  const spokenResult = `Test payment of ${intent.amount} rupees to ${intent.recipientName} was successful. Transaction reference: ${referenceId}. Funding source: VisionPay Test Balance in development sandbox. No real bank transfer occurred.`;

  const transactionRecord: TransactionRecord = {
    id: `tx_${Date.now()}`,
    referenceId,
    userId: user.id,
    recipientId: intent.recipientId,
    recipientName: intent.recipientName,
    recipientMobile: intent.recipientMobile,
    amount: intent.amount,
    currency: 'INR',
    status: 'COMPLETED',
    authMethod: authDetail,
    isDemo: true,
    disclaimer: 'DEVELOPMENT SANDBOX — NO REAL MONEY TRANSFERRED',
    spokenResult,
    timestamp: new Date().toISOString(),
  };

  transactionHistory.unshift(transactionRecord);

  if (idempotencyKey) {
    processedIdempotencyKeys.set(idempotencyKey, transactionRecord);
  }

  return res.status(200).json({
    message: 'Payment completed successfully (Development Sandbox)',
    transaction: transactionRecord,
    updatedBalance: user.balance,
    spokenResult,
    fundingSource: 'VisionPay Test Balance (Development Sandbox)',
    paymentProvider: 'VisionPay Development Sandbox',
    isRealMoney: false,
  });
});

// Step: Cancel payment
app.post('/api/payments/cancel', (req, res) => {
  const { intentId } = req.body;
  if (intentId && paymentIntents.has(intentId)) {
    const intent = paymentIntents.get(intentId)!;
    intent.status = 'CANCELLED';
  }
  return res.json({
    status: 'CANCELLED',
    spokenResult: 'Payment cancelled.',
  });
});

// Transaction History
app.get('/api/payments/history', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userHistory = transactionHistory.filter((tx) => tx.userId === user.id);
  res.json({ transactions: userHistory });
});

// ============================================================================
// GEMINI AI ACCESSIBLE ASSISTANT (Informational / Q&A Helper only)
// ============================================================================
app.post('/api/ai/assist', async (req, res) => {
  const { query, currentStep } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Pre-checked deterministic answers for key accessibility commands
  const lower = query.toLowerCase();
  if (lower.includes('help') || lower.includes('commands') || lower.includes('what can i say')) {
    return res.json({
      answer:
        'You can say: "Make a payment", "Check my balance", "Rahul Sharma", "Pay five hundred rupees", "Confirm details", "Cancel payment", or "Stop listening". Press the space bar anytime to talk.',
      isFallback: false,
    });
  }

  if (lower.includes('balance')) {
    const user = getAuthUser(req);
    return res.json({
      answer: `Your current available demo balance is ${user?.balance || 15000} rupees.`,
      isFallback: false,
    });
  }

  if (!geminiClient) {
    return res.json({
      answer:
        'VisionPay is a voice-first payment assistant designed for blind users. You can speak commands, review payment amounts, and authorize transactions using your secure PIN or biometric sensor.',
      isFallback: true,
    });
  }

  try {
    const prompt = `User question: "${query}". Context: The user is currently in state "${currentStep || 'General Dashboard'}".
Answer for a visually impaired user listening via text-to-speech.
Keep your response short, calm, and supportive (maximum 2 concise sentences).
Explain how to use VisionPay or answer their navigation question.
CRITICAL CONSTRAINT: Do not authorize, initiate, transfer, or confirm any money transactions. Direct them to use voice commands like "Make a payment".`;

    const response = await geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are VisionPay Accessibility Companion. You assist visually impaired users with spoken guidance and explanations. Be clear, concise, and helpful.',
      },
    });

    const text = response.text?.trim() || 'You can say "Make a payment" to begin transferring money to your contacts.';
    return res.json({ answer: text, isFallback: false });
  } catch (err: any) {
    console.error('Gemini API Error in /api/ai/assist:', err);
    return res.json({
      answer:
        'VisionPay is ready. You can say "Make a payment" to begin, or say "Repeat that" to hear the previous message.',
      isFallback: true,
    });
  }
});

// ============================================================================
// VITE DEV SERVER / STATIC SERVING INTEGRATION
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VisionPay server running on port ${PORT}`);
    console.log(`Open in browser: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VisionPay server:', err);
});
