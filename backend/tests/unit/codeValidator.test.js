/**
 * Unit tests — codeValidator helpers (FASE 4 — Code-Only)
 *
 * FASE 4: isPositiveInt & isIntOrCode (legacy dual-mode helpers) dihapus.
 * Hanya isEntityCode yang dipertahankan.
 */

const { isEntityCode } = require('../../src/validators/codeValidator');

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
