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
  one: '1',
  two: '2',
  to: '2',
  too: '2',
  three: '3',
  four: '4',
  for: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  ate: '8',
  nine: '9',
};

const DIGIT_NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/**
 * Formats a 10-digit phone number digit-by-digit for clear spoken readback.
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

/**
 * Extracts a 10-digit mobile number from spoken phrases such as:
 * - "9876541234"
 * - "nine eight seven six five four one two three four"
 * - "pay to 9876545678"
 * - "mobile 9 8 7 6 5 4 1 2 3 4"
 */
export function parseSpokenMobile(phrase: string): {
  mobile: string | null;
  spokenDigits: string;
  confidence: string;
} {
  if (!phrase) return { mobile: null, spokenDigits: '', confidence: 'empty' };

  const clean = phrase.toLowerCase().trim();

  // 1. Direct 10-digit numeric sequence (e.g., "9876541234")
  const directMatch = clean.match(/\b([6-9]\d{9})\b/) || clean.match(/\b(\d{10})\b/);
  if (directMatch) {
    const num = directMatch[1];
    return {
      mobile: num,
      spokenDigits: formatMobileSpokenDigits(num),
      confidence: 'exact_10_digits',
    };
  }

  // 2. Parse sequence of digits and digit words
  // Normalize tokens
  const tokens = clean
    .replace(/[,\-_.]/g, ' ')
    .replace(/mobile|number|phone|cell|pay|send|transfer|to|contact/g, ' ')
    .trim()
    .split(/\s+/);

  let extractedDigits = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      extractedDigits += token;
    } else if (DIGIT_WORDS[token] !== undefined) {
      extractedDigits += DIGIT_WORDS[token];
    }
  }

  if (extractedDigits.length === 10) {
    return {
      mobile: extractedDigits,
      spokenDigits: formatMobileSpokenDigits(extractedDigits),
      confidence: 'spoken_digit_sequence',
    };
  }

  // Check if string contains any contiguous 10 digits
  const any10 = extractedDigits.match(/([6-9]\d{9})/) || extractedDigits.match(/(\d{10})/);
  if (any10) {
    return {
      mobile: any10[1],
      spokenDigits: formatMobileSpokenDigits(any10[1]),
      confidence: 'extracted_10_digits',
    };
  }

  return { mobile: null, spokenDigits: '', confidence: 'none' };
}
