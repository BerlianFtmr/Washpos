/**
 * Unit tests — codeValidator helpers (FASE 2)
 */

const {
  isEntityCode,
  isPositiveInt,
  isIntOrCode
} = require('../../src/validators/codeValidator');

describe('isEntityCode', () => {
  test('valid codes per prefix', () => {
    expect(isEntityCode('USR', 'USR-7KQ2M9')).toBe(true);
    expect(isEntityCode('CUS', 'CUS-4F8KP2')).toBe(true);
    expect(isEntityCode('SVC', 'SVC-01')).toBe(true);
    expect(isEntityCode('ORD', 'ORD-260614-K7M2QF')).toBe(true);
    expect(isEntityCode('PAY', 'PAY-260614-9F2K4M')).toBe(true);
  });

  test('case-insensitive', () => {
    expect(isEntityCode('CUS', 'cus-4f8kp2')).toBe(true);
    expect(isEntityCode('SVC', 'svc-01')).toBe(true);
  });

  test('wrong prefix rejected', () => {
    expect(isEntityCode('CUS', 'ORD-260614-K7M2QF')).toBe(false);
    expect(isEntityCode('USR', 'CUS-4F8KP2')).toBe(false);
  });

  test('wrong shape for prefix rejected', () => {
    expect(isEntityCode('CUS', 'CUS-01')).toBe(false);         // CUS needs 6 B32
    expect(isEntityCode('SVC', 'SVC-7KQ2M9')).toBe(false);     // SVC needs 2 digits
    expect(isEntityCode('ORD', 'ORD-260614-ABC')).toBe(false); // ORD needs 6 B32
  });

  test('forbidden letters rejected (I/L/O/U)', () => {
    expect(isEntityCode('CUS', 'CUS-AAAAAO')).toBe(false);
    expect(isEntityCode('CUS', 'CUS-AAAAAI')).toBe(false);
    expect(isEntityCode('CUS', 'CUS-AAAAAL')).toBe(false);
    expect(isEntityCode('CUS', 'CUS-AAAAAU')).toBe(false);
  });

  test('non-string / empty / unknown prefix', () => {
    expect(isEntityCode('CUS', '')).toBe(false);
    expect(isEntityCode('CUS', null)).toBe(false);
    expect(isEntityCode('CUS', 123)).toBe(false);
    expect(isEntityCode('XYZ', 'XYZ-123456')).toBe(false); // unknown prefix
  });
});

describe('isPositiveInt', () => {
  test('positive integers', () => {
    expect(isPositiveInt(1)).toBe(true);
    expect(isPositiveInt(42)).toBe(true);
    expect(isPositiveInt('5')).toBe(true);
    expect(isPositiveInt('007')).toBe(true); // → 7
  });

  test('rejects zero, negative, float, garbage', () => {
    expect(isPositiveInt(0)).toBe(false);
    expect(isPositiveInt(-1)).toBe(false);
    expect(isPositiveInt(1.5)).toBe(false);
    expect(isPositiveInt('1.5')).toBe(false);
    expect(isPositiveInt('abc')).toBe(false);
    expect(isPositiveInt('')).toBe(false);
    expect(isPositiveInt(null)).toBe(false);
    expect(isPositiveInt(undefined)).toBe(false);
  });
});

describe('isIntOrCode (factory validator)', () => {
  const cusValidator = isIntOrCode('CUS');

  test('accepts positive int (returns true)', () => {
    expect(cusValidator(5)).toBe(true);
    expect(cusValidator('5')).toBe(true);
  });

  test('accepts valid CUS code', () => {
    expect(cusValidator('CUS-4F8KP2')).toBe(true);
    expect(cusValidator('cus-4f8kp2')).toBe(true);
  });

  test('optional: undefined/null/empty pass through', () => {
    expect(cusValidator(undefined)).toBe(true);
    expect(cusValidator(null)).toBe(true);
    expect(cusValidator('')).toBe(true);
  });

  test('rejects non-CUS code', () => {
    expect(() => cusValidator('ORD-260614-K7M2QF')).toThrow(/integer ID or a valid CUS code/);
    expect(() => cusValidator('CUS-01')).toThrow(/integer ID or a valid CUS code/);
  });

  test('rejects garbage', () => {
    expect(() => cusValidator('hello')).toThrow();
    expect(() => cusValidator(-3)).toThrow();
    expect(() => cusValidator(1.5)).toThrow();
  });
});
