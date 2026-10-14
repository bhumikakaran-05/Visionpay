export type WorkflowState =
  | 'WELCOME'
  | 'AUTH'
  | 'DASHBOARD'
  | 'STEP_1_START'
  | 'STEP_2_RECIPIENT'
  | 'STEP_3_AMOUNT'
  | 'STEP_4_REVIEW'
  | 'STEP_5_AUTH'
  | 'STEP_6_EXECUTE'
  | 'STEP_7_RESULT'
  | 'HISTORY'
  | 'HELP';

export interface User {
  id: string;
  name: string;
  mobile: string;
  email: string;
  balance: number;
  hasPasskey: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  mobile: string;
  lastFourDigits: string;
  upiId: string;
  bankName: string;
  relationship: string;
  avatarColor: string;
}

export interface PaymentDraft {
  recipient: Recipient | null;
  amount: number | null;
  spokenAmountText: string;
  intentId: string | null;
  summaryText: string;
  authMethod: 'passkey_biometric' | 'secure_pin' | 'demo_device_biometric';
  idempotencyKey: string | null;
}

export interface TransactionRecord {
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

export type VoiceStatus =
  | 'IDLE'
  | 'SPEAKING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'ERROR'
  | 'MICROPHONE_UNAVAILABLE';

export interface TestResult {
  id: number;
  title: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  details: string;
  output?: string;
}
