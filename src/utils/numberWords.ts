// Helper to convert spoken Indian English number phrases into numeric amounts

const SMALL_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const MAGNITUDES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lac: 100000,
};

/**
 * Extracts a numeric amount from a spoken phrase like:
 * - "Pay five hundred rupees" -> 500
 * - "Transfer 1200" -> 1200
 * - "Two thousand rupees" -> 2000
 * - "₹ 750" -> 750
 * - "Fifty" -> 50
 */
export function parseSpokenAmount(phrase: string): { amount: number | null; confidence: string } {
  if (!phrase) return { amount: null, confidence: 'empty' };

  const clean = phrase.toLowerCase().replace(/,/g, '').trim();

  // 1. Try finding explicit digits first (e.g., "500", "1200 rupees", "₹500")
  const digitMatch = clean.match(/(\d+(?:\.\d{1,2})?)/);
  if (digitMatch) {
    const val = parseFloat(digitMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { amount: val, confidence: 'exact_digits' };
    }
  }

  // 2. Parse number words
  // Remove filler words
  const words = clean
    .replace(/rupees|rupee|rs|inr|pay|send|transfer|amount|please|only|to|for/g, '')
    .trim()
    .split(/\s+/);

  let total = 0;
  let current = 0;
  let hasNumber = false;

  for (const word of words) {
    if (SMALL_NUMBERS[word] !== undefined) {
      current += SMALL_NUMBERS[word];
      hasNumber = true;
    } else if (MAGNITUDES[word] !== undefined) {
      const mag = MAGNITUDES[word];
      if (current === 0) current = 1;
      if (mag === 100) {
        current = current * 100;
      } else {
        total += current * mag;
        current = 0;
      }
      hasNumber = true;
    } else if (word === 'and') {
      // ignore 'and'
      continue;
    }
  }

  total += current;

  if (hasNumber && total > 0) {
    return { amount: total, confidence: 'spoken_words' };
  }

  return { amount: null, confidence: 'none' };
}

/**
 * Formats a number to natural spoken English for readback
 * e.g., 500 -> "five hundred rupees"
 * 1250 -> "one thousand two hundred and fifty rupees"
 */
export function formatAmountSpoken(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'zero rupees';

  const ones = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'
  ];
  const tens = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
  ];

  function toWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const rem = n % 10;
      return tens[Math.floor(n / 10)] + (rem ? ' ' + ones[rem] : '');
    }
    if (n < 1000) {
      const rem = n % 100;
      return ones[Math.floor(n / 100)] + ' hundred' + (rem ? ' and ' + toWords(rem) : '');
    }
    if (n < 100000) {
      const thousands = Math.floor(n / 1000);
      const rem = n % 1000;
      return toWords(thousands) + ' thousand' + (rem ? ' ' + toWords(rem) : '');
    }
    const lakhs = Math.floor(n / 100000);
    const rem = n % 100000;
    return toWords(lakhs) + ' lakh' + (rem ? ' ' + toWords(rem) : '');
  }

  const rounded = Math.round(amount);
  const words = toWords(rounded);
  return `${words || rounded} rupees`;
}

const DIGIT_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  won: '1',
  two: '2',
  to: '2',
  too: '2',
  three: '3',
  tree: '3',
  four: '4',
  for: '4',
  fore: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  ate: '8',
  nine: '9',
  niner: '9',
};

const DIGIT_NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const CONVERSATIONAL_FILLERS = new Set([
  'pay',
  'send',
  'transfer',
  'to',
  'for',
  'mobile',
  'number',
  'phone',
  'cell',
  'contact',
  'recipient',
  'call',
  'please',
  'and',
  'at',
  'is',
  'my',
  'the',
  'plus',
]);

/**
 * Formats a phone number digit-by-digit for clear spoken readback.
 * e.g., "9876541234" -> "nine, eight, seven, six, five, four, one, two, three, four"
 */
export function formatMobileSpokenDigits(mobile: string): string {
  const clean = (mobile || '').replace(/\D/g, '');
  if (!clean) return '';
  return clean
    .split('')
    .map((d) => {
      const idx = parseInt(d, 10);
      return !isNaN(idx) && idx >= 0 && idx <= 9 ? DIGIT_NAMES[idx] : d;
    })
    .join(', ');
}

export interface SpokenMobileResult {
  mobile: string | null;
  rawDigits: string;
  spokenDigits: string;
  isValid: boolean;
  isPotentialMobile: boolean;
  isIncomplete: boolean;
  isTooLong: boolean;
  isInvalidFormat: boolean;
  digitCount: number;
  confidence: string;
}

/**
 * Normalizes spoken mobile input by:
 * - Handling spoken multipliers ("double eight", "triple nine")
 * - Converting word digits to numeric characters
 * - Stripping formatting, spaces, hyphens, and parentheses
 * - Stripping Indian prefixes: +91, 91 (when 12 digits), 0 (when 11 digits)
 * - Validating length (exactly 10 digits) and Indian mobile prefix (starts with 6, 7, 8, 9)
 * - Identifying incomplete or invalid digit sequences
 */
export function parseSpokenMobile(phrase: string): SpokenMobileResult {
  const emptyResult: SpokenMobileResult = {
    mobile: null,
    rawDigits: '',
    spokenDigits: '',
    isValid: false,
    isPotentialMobile: false,
    isIncomplete: false,
    isTooLong: false,
    isInvalidFormat: false,
    digitCount: 0,
    confidence: 'empty',
  };

  if (!phrase) return emptyResult;

  let clean = phrase.toLowerCase().trim();

  // 1. Expand spoken multipliers like "double eight" -> "eight eight", "triple nine" -> "nine nine nine"
  clean = clean
    .replace(/\bdouble\s+(\w+)\b/gi, (match, word) => {
      const w = word.toLowerCase();
      if (DIGIT_WORDS[w] !== undefined || /^\d$/.test(w)) {
        return `${word} ${word}`;
      }
      return match;
    })
    .replace(/\btriple\s+(\w+)\b/gi, (match, word) => {
      const w = word.toLowerCase();
      if (DIGIT_WORDS[w] !== undefined || /^\d$/.test(w)) {
        return `${word} ${word} ${word}`;
      }
      return match;
    });

  // 2. Strip explicit country code text if present
  clean = clean
    .replace(/\+91\b/g, ' ')
    .replace(/\bplus\s+(?:nine\s+one|91)\b/gi, ' ')
    .replace(/[,\-_.\(\)\/]/g, ' ');

  // 3. Tokenize words and separate digits
  const tokens = clean.trim().split(/\s+/).filter(Boolean);

  let extractedDigits = '';
  let explicitDigitsFound = 0;
  let digitWordsFound = 0;
  let nonFillerWordsFound = 0;

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      extractedDigits += token;
      explicitDigitsFound += token.length;
    } else if (DIGIT_WORDS[token] !== undefined) {
      extractedDigits += DIGIT_WORDS[token];
      digitWordsFound++;
    } else if (!CONVERSATIONAL_FILLERS.has(token)) {
      nonFillerWordsFound++;
    }
  }

  // 4. Handle standard Indian prefixes on extracted digits:
  // E.g. "919876541234" (12 digits starting with 91 followed by 6-9)
  if (extractedDigits.length === 12 && extractedDigits.startsWith('91') && /^[6-9]/.test(extractedDigits.slice(2))) {
    extractedDigits = extractedDigits.slice(2);
  }
  // E.g. "09876541234" (11 digits starting with 0 followed by 6-9)
  else if (extractedDigits.length === 11 && extractedDigits.startsWith('0') && /^[6-9]/.test(extractedDigits.slice(1))) {
    extractedDigits = extractedDigits.slice(1);
  }

  const digitCount = extractedDigits.length;
  const spokenDigits = formatMobileSpokenDigits(extractedDigits);

  // 5. Determine if this input represents an attempted mobile number
  // It is a mobile attempt if:
  // - It contains 2 or more explicit digits (e.g., "822630 597" has 9 digits)
  // - It contains 3 or more spoken digit words (e.g., "eight two two six...")
  // - Total extracted digits >= 3 and there are no competing contact name words
  // - Phrase contains phone keywords ("mobile", "phone", "number", "cell")
  const hasPhoneKeyword = /\b(mobile|phone|number|cell)\b/i.test(phrase);
  const isPotentialMobile =
    digitCount >= 10 ||
    explicitDigitsFound >= 2 ||
    digitWordsFound >= 3 ||
    (hasPhoneKeyword && digitCount > 0) ||
    (digitCount >= 3 && nonFillerWordsFound === 0);

  if (!isPotentialMobile && digitCount === 0) {
    return {
      ...emptyResult,
      confidence: 'not_mobile',
    };
  }

  // 6. Validate length and format for Indian mobile numbers
  // Standard Indian mobile numbers are exactly 10 digits beginning with 6, 7, 8, or 9
  if (digitCount === 10) {
    const isIndianPrefix = /^[6-9]\d{9}$/.test(extractedDigits);
    if (isIndianPrefix) {
      return {
        mobile: extractedDigits,
        rawDigits: extractedDigits,
        spokenDigits,
        isValid: true,
        isPotentialMobile: true,
        isIncomplete: false,
        isTooLong: false,
        isInvalidFormat: false,
        digitCount: 10,
        confidence: 'valid_10_digits',
      };
    } else {
      // 10 digits but starts with 0-5
      return {
        mobile: null,
        rawDigits: extractedDigits,
        spokenDigits,
        isValid: false,
        isPotentialMobile: true,
        isIncomplete: false,
        isTooLong: false,
        isInvalidFormat: true,
        digitCount: 10,
        confidence: 'invalid_prefix_10_digits',
      };
    }
  }

  if (digitCount > 0 && digitCount < 10) {
    return {
      mobile: null,
      rawDigits: extractedDigits,
      spokenDigits,
      isValid: false,
      isPotentialMobile: true,
      isIncomplete: true,
      isTooLong: false,
      isInvalidFormat: false,
      digitCount,
      confidence: 'incomplete_digits',
    };
  }

  if (digitCount > 10) {
    return {
      mobile: null,
      rawDigits: extractedDigits,
      spokenDigits,
      isValid: false,
      isPotentialMobile: true,
      isIncomplete: false,
      isTooLong: true,
      isInvalidFormat: false,
      digitCount,
      confidence: 'too_many_digits',
    };
  }

  return {
    ...emptyResult,
    isPotentialMobile: false,
    confidence: 'none',
  };
}
