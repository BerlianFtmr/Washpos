/**
 * Integration tests — Backend Dual Support (FASE 2)
 *
 * Menguja alur lengkap: route → resolveIdParam middleware → controller → query
 * layer, dengan pool MySQL di-mock. Membuktikan bahwa:
 *   1. GET /customers/:code dan GET /customers/:id menghasilkan response setara.
 *   2. POST /orders menerima customer_code + service_code (resolve ke id).
 *   3. POST /orders/:orderCode/payments bekerja (order di-resolve dari URL).
 *   4. Code format invalid → 400; code valid tapi tidak ada → 404;
 *      prefix salah → 400.
 *
 * Tidak butuh supertest: pakai `app.listen(0)` + fetch (Node 18+).
 */

// Mock pool MySQL SEBELUM require modul lain yang memakainya.
jest.mock('../../src/config/database', () => {
  const query = jest.fn();
  const connection = {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    query: jest.fn()
  };
  const getConnection = jest.fn().mockResolvedValue(connection);
  return { query, getConnection, __connection: connection };
});

const express = require('express');
const pool = require('../../src/config/database');
const { clearResolverCache } = require('../../src/utils/codeResolver');

// Reference ke mock connection untuk reset per-test.
const mockConn = pool.__connection;

// Helper: reset semua mock antar test.
function resetPoolMocks() {
  pool.query.mockReset();
  // getConnection wajib di-re-establish setiap reset agar selalu return mockConn.
  pool.getConnection.mockReset().mockResolvedValue(mockConn);
  mockConn.query.mockReset();
  mockConn.beginTransaction.mockReset().mockResolvedValue();
  mockConn.commit.mockReset().mockResolvedValue();
  mockConn.rollback.mockReset().mockResolvedValue();
  mockConn.release.mockReset();
  clearResolverCache();
}

// Bangun app Express dengan protect di-bypass (inject fake admin user).
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 1, username: 'admin', role: 'admin' };
    next();
  });
  const { resolveIdParam } = require('../../src/middleware/resolveIdParam');
  const customerCtrl = require('../../src/controllers/customerController');
  const orderCtrl = require('../../src/controllers/orderController');
  const paymentCtrl = require('../../src/controllers/paymentController');

  // Mount subset of routes (without protect, already bypassed above)
  app.get('/customers', customerCtrl.list);
  app.get('/customers/:id', resolveIdParam('customers'), customerCtrl.detail);
  app.get('/orders', orderCtrl.list);
  app.get('/orders/:id', resolveIdParam('orders'), orderCtrl.detail);
  app.post('/orders', orderCtrl.createOrderValidation, orderCtrl.createNew);
  app.post('/orders/:id/payments', resolveIdParam('orders'), paymentCtrl.createPaymentValidation, paymentCtrl.createForOrder);
  app.get('/payments/:id', resolveIdParam('payments'), paymentCtrl.detail);
  return app;
}

let server, baseUrl;

beforeAll(() => {
  return new Promise((resolve) => {
    const app = buildApp();
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

// === Sample data =============================================================
const CUSTOMER_ROW = {
  id: 5,
  code: 'CUS-4F8KP2',
  name: 'Ahmad',
  whatsapp: '628123456789',
  address: 'Jl. Contoh',
  created_at: '2026-06-14T00:00:00.000Z'
};

const ORDER_ROW = {
  id: 11,
  code: 'ORD-260614-K7M2QF',
  customer_id: 5,
  user_id: 1,
  status: 'pending',
  payment_status: 'unpaid',
  total_price: 25000,
  notes: null,
  created_at: '2026-06-14T00:00:00.000Z',
  updated_at: '2026-06-14T00:00:00.000Z'
};

// Helper: dispatch pool query berdasarkan SQL string.
// Dipakai untuk READ flows (non-transactional).
function mockQueryDispatcher(responses) {
  pool.query.mockImplementation(async (sql) => {
    const s = String(sql);
    // resolveCodeToId: SELECT id FROM `<table>` WHERE code = ?
    if (/SELECT id FROM .+ WHERE code = \?/i.test(s)) {
      return responses.resolveCode ?? [[{ id: 5 }], []];
    }
    // customer findById
    if (/FROM customers WHERE id = \?/i.test(s)) {
      return [[CUSTOMER_ROW], []];
    }
    // order findDetail main SELECT
    if (/FROM orders o\s+WHERE o\.id = \?/i.test(s)) {
      return [[ORDER_ROW], []];
    }
    // order nested customer
    if (/FROM customers WHERE id = \?/i.test(s)) {
      return [[CUSTOMER_ROW], []];
    }
    // default empty
    return [[], []];
  });
}

// === Tests ===================================================================

describe('Customer — dual support (GET by code vs by id)', () => {
  beforeEach(() => {
    resetPoolMocks();
    mockQueryDispatcher({});
  });

  test('GET /customers/CUS-4F8KP2 → 200, response includes code field', async () => {
    // resolveCodeToId → id 5; findById → CUSTOMER_ROW
    pool.query
      .mockResolvedValueOnce([[{ id: 5 }], []])   // resolve code
      .mockResolvedValueOnce([[CUSTOMER_ROW], []]); // findById

    const res = await fetch(`${baseUrl}/customers/CUS-4F8KP2`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe('CUS-4F8KP2');
    expect(body.data.id).toBe(5);
    expect(body.data.name).toBe('Ahmad');
  });

  test('GET /customers/5 (numeric) → 200, same shape (dual support)', async () => {
    pool.query.mockResolvedValueOnce([[CUSTOMER_ROW], []]); // findById only

    const res = await fetch(`${baseUrl}/customers/5`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(5);
    expect(body.data.code).toBe('CUS-4F8KP2');
    // Pastikan resolveCodeToId tidak dipanggil untuk numeric
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('GET /customers/cus-4f8kp2 (lowercase) → 200 (case-insensitive)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 5 }], []])
      .mockResolvedValueOnce([[CUSTOMER_ROW], []]);

    const res = await fetch(`${baseUrl}/customers/cus-4f8kp2`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.code).toBe('CUS-4F8KP2');
  });

  test('GET /customers/CUS-01 (invalid format for prefix) → 400', async () => {
    const res = await fetch(`${baseUrl}/customers/CUS-01`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /customers/ORD-260614-K7M2QF (wrong prefix) → 400', async () => {
    const res = await fetch(`${baseUrl}/customers/ORD-260614-K7M2QF`);
    expect(res.status).toBe(400);
  });

  test('GET /customers/CUS-ZZZZZZ (valid format, not in DB) → 404', async () => {
    pool.query
      .mockResolvedValueOnce([[], []]); // resolveCodeToId returns nothing

    const res = await fetch(`${baseUrl}/customers/CUS-ZZZZZZ`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toMatch(/not found/i);
  });

  test('GET /customers/garbage! → 400 (not int, not code)', async () => {
    const res = await fetch(`${baseUrl}/customers/garbage!`);
    expect(res.status).toBe(400);
  });
});

describe('Order — create with customer_code + service_code', () => {
  beforeEach(() => resetPoolMocks());

  test('POST /orders with codes → 201, response order has generated code', async () => {
    // Resolve customer_code → id 5
    // Resolve service_code → id 1
    // Inside orderQueries.create (transaction):
    //   - getConnection()
    //   - for item: SELECT price FROM services WHERE id=? AND active=TRUE → [{price: 5000}]
    //   - INSERT INTO orders (code,...) → {insertId: 11}
    //   - INSERT INTO order_items → {}
    //   - commit()
    // After create: findDetail(11) → multiple queries
    pool.query
      // resolveCodeToId for customer
      .mockResolvedValueOnce([[{ id: 5 }], []])
      // resolveCodeToId for service
      .mockResolvedValueOnce([[{ id: 1 }], []]);

    // Transaction connection queries
    mockConn.query
      .mockResolvedValueOnce([[{ price: 5000 }], []])   // SELECT price for service
      .mockResolvedValueOnce([{ insertId: 11 }, []]);    // INSERT order

    // findDetail(11) post-create: main order select
    pool.query.mockResolvedValueOnce([[ORDER_ROW], []]);
    // nested customer, user, items (empty), payments (empty) — findDetail issues several queries
    pool.query
      .mockResolvedValueOnce([[CUSTOMER_ROW], []])   // customer nested
      .mockResolvedValueOnce([[{ id: 1, code: 'USR-7KQ2M9', username: 'admin', role: 'admin' }], []]) // user nested
      .mockResolvedValueOnce([[], []])               // order_items
      .mockResolvedValueOnce([[], []]);              // payments

    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_code: 'CUS-4F8KP2',
        items: [{ service_code: 'SVC-01', quantity: 5 }]
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toMatch(/^ORD-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(body.data.customer.code).toBe('CUS-4F8KP2');
    // Verify transaction was committed
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
  });

  test('POST /orders with neither customer_id nor customer_code → 422 validation error', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ service_id: 1, quantity: 5 }]
      })
    });
    expect(res.status).toBe(422);
  });

  test('POST /orders with invalid customer_code format → 422 validation error', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_code: 'CUS-01', // wrong shape for CUS prefix
        items: [{ service_id: 1, quantity: 5 }]
      })
    });
    expect(res.status).toBe(422);
  });
});

describe('Payment — create via order code in URL', () => {
  beforeEach(() => resetPoolMocks());

  test('POST /orders/ORD-260614-K7M2QF/payments → 201, payment has generated code', async () => {
    // resolveIdParam('orders') resolves ORD-... → id 11
    pool.query.mockResolvedValueOnce([[{ id: 11 }], []]);

    // paymentController.createForOrder → getOrderForPayment(11)
    pool.query.mockResolvedValueOnce([[{ id: 11, code: 'ORD-260614-K7M2QF', total_price: 30000, payment_status: 'unpaid' }], []]);

    // paymentQueries.create (transaction):
    //   - SELECT total_price, payment_status FROM orders WHERE id=?
    //   - SELECT SUM(amount) FROM payments WHERE order_id=?
    //   - INSERT payment → {insertId: 22}
    //   - UPDATE orders SET payment_status
    mockConn.query
      .mockResolvedValueOnce([[{ total_price: 30000, payment_status: 'unpaid' }], []])
      .mockResolvedValueOnce([[{ total: 0 }], []])
      .mockResolvedValueOnce([{ insertId: 22 }, []])
      .mockResolvedValueOnce([{}, []]);

    // After create: findById(22) → payment row
    pool.query.mockResolvedValueOnce([[
      { id: 22, code: 'PAY-260614-9F2K4M', order_id: 11, amount: 30000, method: 'cash', note: null, created_at: '2026-06-14T00:00:00.000Z', order_total_price: 30000, order_payment_status: 'paid' }
    ], []]);

    const res = await fetch(`${baseUrl}/orders/ORD-260614-K7M2QF/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 30000, method: 'cash' })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toMatch(/^PAY-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(body.data.order_payment_status).toBe('paid');
  });
});

describe('Payment — GET by code', () => {
  beforeEach(() => resetPoolMocks());

  test('GET /payments/PAY-260614-9F2K4M → 200, response includes code', async () => {
    // resolveIdParam('payments') resolves PAY-... → id 22
    pool.query.mockResolvedValueOnce([[{ id: 22 }], []]);
    // paymentQueries.findById(22)
    pool.query.mockResolvedValueOnce([[
      { id: 22, code: 'PAY-260614-9F2K4M', order_id: 11, amount: 30000, method: 'cash', note: null, created_at: '2026-06-14T00:00:00.000Z', order_total_price: 30000, order_payment_status: 'paid' }
    ], []]);

    const res = await fetch(`${baseUrl}/payments/PAY-260614-9F2K4M`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.code).toBe('PAY-260614-9F2K4M');
  });
});
