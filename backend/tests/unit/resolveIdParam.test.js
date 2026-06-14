/**
 * Unit tests — resolveIdParam middleware (FASE 2)
 *
 * resolveCodeToId di-mock agar tidak menyentuh DB. Pure functions (isCode,
 * isValidCode, getCodePrefix, ENTITY_TABLES) tetap real dari codeResolver.
 */

// Mock hanya resolveCodeToId (DB-backed); sisanya pakai implementasi asli.
jest.mock('../../src/utils/codeResolver', () => {
  const actual = jest.requireActual('../../src/utils/codeResolver');
  return {
    ...actual,
    resolveCodeToId: jest.fn()
  };
});

const { resolveIdParam } = require('../../src/middleware/resolveIdParam');
const { resolveCodeToId } = require('../../src/utils/codeResolver');

// Helper: bangun mock req/res/next ala Express.
function makeReqRes(idParam) {
  const req = { params: { id: idParam } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('resolveIdParam — numeric (legacy) mode', () => {
  beforeEach(() => resolveCodeToId.mockReset());

  test('numeric string → parsed as int, next() called, no code', async () => {
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('42');
    await mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params.id).toBe(42);
    expect(req.params.code).toBeUndefined();
    expect(resolveCodeToId).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test('"0"-prefix numeric still treated as int', async () => {
    const mw = resolveIdParam('orders');
    const { req, res, next } = makeReqRes('007');
    await mw(req, res, next);
    expect(req.params.id).toBe(7);
  });

  test('garbage non-numeric non-code → 400', async () => {
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('hello-world');
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('empty string → 400', async () => {
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('');
    await mw(req, res, next);
    expect(res.statusCode).toBe(400);
  });

  test('negative number string → 400 (not matched by ^\\d+$)', async () => {
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('-5');
    await mw(req, res, next);
    expect(res.statusCode).toBe(400);
  });
});

describe('resolveIdParam — code mode', () => {
  beforeEach(() => resolveCodeToId.mockReset());

  test('valid code resolved → req.params.id int, req.params.code set', async () => {
    resolveCodeToId.mockResolvedValueOnce(42);
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('CUS-4F8KP2');
    await mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params.id).toBe(42);
    expect(req.params.code).toBe('CUS-4F8KP2');
    expect(resolveCodeToId).toHaveBeenCalledWith('customers', 'CUS-4F8KP2');
  });

  test('case-insensitive: lowercase code normalized to uppercase in params.code', async () => {
    resolveCodeToId.mockResolvedValueOnce(7);
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('cus-4f8kp2');
    await mw(req, res, next);
    expect(req.params.code).toBe('CUS-4F8KP2');
    expect(req.params.id).toBe(7);
  });

  test('valid format but not found in DB → 404', async () => {
    resolveCodeToId.mockResolvedValueOnce(null);
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('CUS-ZZZZZZ');
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('wrong prefix for route → 400 (CUS code on orders route)', async () => {
    const mw = resolveIdParam('orders');
    const { req, res, next } = makeReqRes('CUS-4F8KP2');
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(resolveCodeToId).not.toHaveBeenCalled();
  });

  test('ORD code matches orders route → resolved', async () => {
    resolveCodeToId.mockResolvedValueOnce(11);
    const mw = resolveIdParam('orders');
    const { req, res, next } = makeReqRes('ORD-260614-K7M2QF');
    await mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params.id).toBe(11);
  });

  test('SVC code (sequential 2-digit) matches services route', async () => {
    resolveCodeToId.mockResolvedValueOnce(3);
    const mw = resolveIdParam('services');
    const { req, res, next } = makeReqRes('SVC-01');
    await mw(req, res, next);
    expect(req.params.id).toBe(3);
    expect(req.params.code).toBe('SVC-01');
  });

  test('PAY code matches payments route', async () => {
    resolveCodeToId.mockResolvedValueOnce(9);
    const mw = resolveIdParam('payments');
    const { req, res, next } = makeReqRes('PAY-260614-9F2K4M');
    await mw(req, res, next);
    expect(req.params.id).toBe(9);
  });

  test('USR code matches users route', async () => {
    resolveCodeToId.mockResolvedValueOnce(1);
    const mw = resolveIdParam('users');
    const { req, res, next } = makeReqRes('USR-7KQ2M9');
    await mw(req, res, next);
    expect(req.params.id).toBe(1);
  });

  test('code with invalid suffix for prefix → 400 (CUS needs 6 B32)', async () => {
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('CUS-01');
    await mw(req, res, next);
    expect(res.statusCode).toBe(400);
    expect(resolveCodeToId).not.toHaveBeenCalled();
  });

  test('code with forbidden letter (O) → 400', async () => {
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('CUS-AAAAAO');
    await mw(req, res, next);
    expect(res.statusCode).toBe(400);
  });

  test('DB lookup error → 500, next not called', async () => {
    resolveCodeToId.mockRejectedValueOnce(new Error('Connection lost'));
    const mw = resolveIdParam('customers');
    const { req, res, next } = makeReqRes('CUS-4F8KP2');
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
  });
});

describe('resolveIdParam — factory guard', () => {
  test('throws if entityTable not provided', () => {
    expect(() => resolveIdParam()).toThrow(/entityTable/i);
    expect(() => resolveIdParam('')).toThrow(/entityTable/i);
    expect(() => resolveIdParam(null)).toThrow(/entityTable/i);
  });
});
