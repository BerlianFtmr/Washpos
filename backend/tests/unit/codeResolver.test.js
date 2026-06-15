/**
 * Unit tests — codeResolver utility
 *
 * resolveCodeToId divalidasi via mock pool (tanpa DB real);
 * isCode/isValidCode/getCodePrefix adalah pure function.
 */
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

const pool = require('../../src/config/database');
const {
  isCode,
  isValidCode,
  getCodePrefix,
  resolveCodeToId,
  resolveCode,
  clearResolverCache,
  ENTITY_TABLES
} = require('../../src/utils/codeResolver');

describe('isCode (generic detection, case-insensitive)', () => {
  test('valid entity codes', () => {
    expect(isCode('USR-7KQ2M9')).toBe(true);
    expect(isCode('CUS-4F8KP2')).toBe(true);
    expect(isCode('SVC-01')).toBe(true);
    expect(isCode('ORD-260614-K7M2QF')).toBe(true);
    expect(isCode('PAY-260614-9F2K4M')).toBe(true);
  });
  test('case-insensitive', () => {
    expect(isCode('usr-7kq2m9')).toBe(true);
    expect(isCode('Usr-7Kq2M9')).toBe(true);
    expect(isCode('ord-260614-k7m2qf')).toBe(true);
  });
  test('numeric id is NOT a code', () => {
    expect(isCode('123')).toBe(false);
    expect(isCode('1')).toBe(false);
    expect(isCode('0')).toBe(false);
  });
  test('non-string / falsy', () => {
    expect(isCode(null)).toBe(false);
    expect(isCode(undefined)).toBe(false);
    expect(isCode(123)).toBe(false);
    expect(isCode({})).toBe(false);
  });
  test('empty / garbage', () => {
    expect(isCode('')).toBe(false);
    expect(isCode('abc')).toBe(false);
    expect(isCode('USR')).toBe(false); // no dash + suffix
    expect(isCode('-ABC123')).toBe(false); // no prefix
  });
});

describe('getCodePrefix', () => {
  test('extracts prefix (uppercase)', () => {
    expect(getCodePrefix('USR-7KQ2M9')).toBe('USR');
    expect(getCodePrefix('ord-260614-K7M2QF')).toBe('ORD');
    expect(getCodePrefix('svc-01')).toBe('SVC');
  });
  test('null for non-code', () => {
    expect(getCodePrefix('123')).toBeNull();
    expect(getCodePrefix('hello')).toBeNull();
    expect(getCodePrefix('')).toBeNull();
  });
});

describe('isValidCode (strict per-prefix)', () => {
  test('valid strict codes', () => {
    expect(isValidCode('USR-7KQ2M9')).toBe(true);
    expect(isValidCode('CUS-4F8KP2')).toBe(true);
    expect(isValidCode('SVC-01')).toBe(true);
    expect(isValidCode('ORD-260614-K7M2QF')).toBe(true);
    expect(isValidCode('PAY-260614-9F2K4M')).toBe(true);
  });
  test('case-insensitive', () => {
    expect(isValidCode('usr-7kq2m9')).toBe(true);
  });
  test('wrong shape for prefix rejected', () => {
    expect(isValidCode('USR-01')).toBe(false);        // USR needs 6 B32 chars
    expect(isValidCode('SVC-7KQ2M9')).toBe(false);    // SVC needs 2 digits
    expect(isValidCode('ORD-260614-ABC')).toBe(false); // ORD needs 6 B32 after date
    expect(isValidCode('CUS-260614-K7M2QF')).toBe(false); // CUS is not date-formatted
  });
  test('forbidden letters (I/L/O/U) rejected', () => {
    expect(isValidCode('USR-7KQ2MO')).toBe(false); // O
    expect(isValidCode('USR-7KQ2MI')).toBe(false); // I
    expect(isValidCode('USR-7KQ2ML')).toBe(false); // L
    expect(isValidCode('USR-7KQ2MU')).toBe(false); // U
  });
  test('unknown prefix rejected', () => {
    expect(isValidCode('XYZ-123456')).toBe(false);
  });
});

describe('resolveCodeToId (DB-backed, mocked)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    clearResolverCache();
  });

  test('returns id when found', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 42 }], []]);
    const id = await resolveCodeToId('users', 'USR-7KQ2M9');
    expect(id).toBe(42);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id FROM `users` WHERE code = ? LIMIT 1',
      ['USR-7KQ2M9']
    );
  });

  test('case-insensitive (uppercased before query)', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 7 }], []]);
    await resolveCodeToId('customers', 'cus-4f8kp2');
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['CUS-4F8KP2']
    );
  });

  test('returns null when not found (negative cache)', async () => {
    pool.query.mockResolvedValueOnce([[], []]);
    const id = await resolveCodeToId('users', 'USR-UNKNOWN');
    expect(id).toBeNull();
  });

  test('returns null for empty/non-string input (no DB call)', async () => {
    expect(await resolveCodeToId('users', '')).toBeNull();
    expect(await resolveCodeToId('users', null)).toBeNull();
    expect(await resolveCodeToId('', 'USR-7KQ2M9')).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('cache: second call within TTL does not hit DB', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 99 }], []]);
    await resolveCodeToId('users', 'USR-7KQ2M9');
    await resolveCodeToId('users', 'USR-7KQ2M9');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('cache: case variations share one entry', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5 }], []]);
    await resolveCodeToId('users', 'usr-7kq2m9');   // lower
    await resolveCodeToId('users', 'USR-7KQ2M9');   // upper
    await resolveCodeToId('users', 'Usr-7Kq2M9');   // mixed
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe('resolveCode (auto-detect table by prefix)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    clearResolverCache();
  });

  test('resolves USR → users', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5 }], []]);
    const r = await resolveCode('USR-7KQ2M9');
    expect(r).toEqual({ id: 5, table: 'users' });
  });

  test('resolves ORD → orders', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 11 }], []]);
    const r = await resolveCode('ORD-260614-K7M2QF');
    expect(r).toEqual({ id: 11, table: 'orders' });
  });

  test('returns null for unknown prefix (no DB call)', async () => {
    const r = await resolveCode('XXX-12345');
    expect(r).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns null when id not found', async () => {
    pool.query.mockResolvedValueOnce([[], []]);
    const r = await resolveCode('USR-NOPE00');
    expect(r).toBeNull();
  });
});

describe('ENTITY_TABLES mapping', () => {
  test('all 5 entities mapped', () => {
    expect(ENTITY_TABLES.USR).toBe('users');
    expect(ENTITY_TABLES.CUS).toBe('customers');
    expect(ENTITY_TABLES.SVC).toBe('services');
    expect(ENTITY_TABLES.ORD).toBe('orders');
    expect(ENTITY_TABLES.PAY).toBe('payments');
  });
});
