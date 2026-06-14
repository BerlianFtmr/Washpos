/**
 * Unit tests — codeGenerator utility
 */
const {
  generateCode,
  randomBase32,
  formatDate,
  ALPHABET
} = require('../../src/utils/codeGenerator');

// Regex validasi (sesuai TODO.md Quick Reference)
const RE = {
  user: /^USR-[0-9A-HJKMNP-TV-Z]{6}$/,
  customer: /^CUS-[0-9A-HJKMNP-TV-Z]{6}$/,
  service: /^SVC-\d{2}$/,
  order: /^ORD-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/,
  payment: /^PAY-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/
};

describe('alphabet (Base32 Crockford)', () => {
  test('has exactly 32 symbols', () => {
    expect(ALPHABET.length).toBe(32);
  });
  test('excludes ambiguous letters I, L, O, U', () => {
    expect(ALPHABET).not.toMatch(/[ILOU]/);
  });
  test('contains 0-9 and A-Z minus I/L/O/U', () => {
    expect(ALPHABET).toBe('0123456789ABCDEFGHJKMNPQRSTVWXYZ');
  });
});

describe('randomBase32', () => {
  test('returns requested length', () => {
    expect(randomBase32(6)).toHaveLength(6);
    expect(randomBase32(10)).toHaveLength(10);
  });
  test('only uses Crockford alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const s = randomBase32(8);
      expect(s).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
  });
});

describe('generateCode — default format (PREFIX-XXXXXX)', () => {
  test('USR code matches regex', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode('USR')).toMatch(RE.user);
    }
  });
  test('CUS code matches regex', () => {
    expect(generateCode('CUS')).toMatch(RE.customer);
  });
  test('length is prefix + 1 dash + 6 random = 10 chars', () => {
    expect(generateCode('USR')).toHaveLength(10);
  });
  test('uppercase prefix (lowercase input normalized)', () => {
    expect(generateCode('usr')).toMatch(/^USR-/);
  });
});

describe('generateCode — withDate format (PREFIX-YYMMDD-XXXXXX)', () => {
  test('ORD matches order regex with explicit date', () => {
    const code = generateCode('ORD', { withDate: true, date: new Date('2026-06-14') });
    expect(code).toMatch(RE.order);
    expect(code).toContain('-260614-');
  });
  test('PAY matches payment regex', () => {
    const code = generateCode('PAY', { withDate: true, date: new Date('2026-06-14') });
    expect(code).toMatch(RE.payment);
  });
  test('formatDate produces YYMMDD', () => {
    expect(formatDate(new Date('2026-01-05'))).toBe('260105');
    expect(formatDate(new Date('2026-12-31'))).toBe('261231');
  });
  test('uses current date when omitted', () => {
    const code = generateCode('ORD', { withDate: true });
    expect(code).toMatch(/^ORD-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/);
    const yymmdd = code.split('-')[1];
    expect(yymmdd).toMatch(/^\d{6}$/);
  });
});

describe('generateCode — sequential format (PREFIX-NN)', () => {
  test('SVC-01 for seqValue=1', () => {
    expect(generateCode('SVC', { sequential: true, seqValue: 1 })).toBe('SVC-01');
  });
  test('SVC-10 for seqValue=10', () => {
    expect(generateCode('SVC', { sequential: true, seqValue: 10 })).toBe('SVC-10');
  });
  test('wider pad respected', () => {
    expect(generateCode('SVC', { sequential: true, seqValue: 1, pad: 3 })).toBe('SVC-001');
  });
  test('matches service regex', () => {
    for (let v = 1; v <= 15; v++) {
      expect(generateCode('SVC', { sequential: true, seqValue: v })).toMatch(RE.service);
    }
  });
});

describe('generateCode — collision resistance', () => {
  test('1000 random codes are unique', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateCode('CUS'));
    }
    expect(codes.size).toBe(1000);
  });
  test('1000 withDate codes are unique', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateCode('ORD', { withDate: true }));
    }
    expect(codes.size).toBe(1000);
  });
});

describe('generateCode — never emits forbidden letters', () => {
  test('no I/L/O/U across 500 samples', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode('TST');
      expect(code).not.toMatch(/[ILOU]/);
    }
  });
});

describe('generateCode — error handling', () => {
  test('throws on empty prefix', () => {
    expect(() => generateCode('')).toThrow();
  });
  test('throws on non-string prefix', () => {
    expect(() => generateCode(null)).toThrow();
    expect(() => generateCode(123)).toThrow();
  });
  test('throws on sequential mode without seqValue', () => {
    expect(() => generateCode('SVC', { sequential: true })).toThrow();
  });
  test('throws on negative seqValue', () => {
    expect(() => generateCode('SVC', { sequential: true, seqValue: -1 })).toThrow();
  });
  test('throws on non-integer seqValue', () => {
    expect(() => generateCode('SVC', { sequential: true, seqValue: 1.5 })).toThrow();
  });
});
