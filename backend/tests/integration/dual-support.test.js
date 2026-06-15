/**
 * Integration tests — Backend Code-Only Strategy (FASE 4)
 *
 * Menguji alur lengkap: route → resolveIdParam middleware → controller → query
 * layer, dengan pool MySQL di-mock. Membuktikan bahwa:
 *   1. GET /customers/:code → 200, response hanya berisi `code` (tanpa `id`).
 *   2. POST /orders menerima customer_code + service_code (resolve ke id).
 *   3. POST /orders/:orderCode/payments bekerja (order di-resolve dari URL).
 *   4. Code format invalid / prefix salah / garbage → 400.
 *   5. Code valid tapi tidak ada → 404.
 *   6. FASE 4: legacy numeric id → 400 (dukecuali/ditolak).
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
    // req.user.id tetap di-inject (auth middleware FASE 4 me-resolve code→id).
    req.user = { id: 1, code: 'USR-7KQ2M9', username: 'admin', role: 'admin' };
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

// === Tests ===================================================================

describe('Customer — code-only (GET by code)', () => {
  beforeEach(() => {
    resetPoolMocks();
  });

  test('GET /customers/CUS-4F8KP2 → 200, response includes code field (no id)', async () => {
    // resolveCodeToId → id 5; findById → CUSTOMER_ROW
    pool.query
      .mockResolvedValueOnce([[{ id: 5 }], []])   // resolve code
      .mockResolvedValueOnce([[CUSTOMER_ROW], []]); // findById

    const res = await fetch(`${baseUrl}/customers/CUS-4F8KP2`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe('CUS-4F8KP2');
    // FASE 4: internal `id` tidak boleh bocor ke response publik
    expect(body.data.id).toBeUndefined();
    expect(body.data.name).toBe('Ahmad');
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

  test('GET /customers/garbage! → 400 (not a valid code)', async () => {
    const res = await fetch(`${baseUrl}/customers/garbage!`);
    expect(res.status).toBe(400);
  });
});

describe('FASE 4 — legacy numeric id is rejected', () => {
  beforeEach(() => resetPoolMocks());

  test('GET /customers/5 (numeric) → 400 (dual support removed)', async () => {
    const res = await fetch(`${baseUrl}/customers/5`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/numeric id is no longer supported|use the entity code/i);
    // Pastikan DB tidak di-query sama sekali (middleware menolak sebelum controller)
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('GET /orders/11 (numeric) → 400', async () => {
    const res = await fetch(`${baseUrl}/orders/11`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });

  test('GET /payments/22 (numeric) → 400', async () => {
    const res = await fetch(`${baseUrl}/payments/22`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });
});

describe('Order — create with customer_code + service_code', () => {
  beforeEach(() => resetPoolMocks());

  test('POST /orders with codes → 201, response order has generated code & no id', async () => {
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
    // FASE 4: internal id/FK fields stripped
    expect(body.data.id).toBeUndefined();
    expect(body.data.customer_id).toBeUndefined();
    expect(body.data.user_id).toBeUndefined();
    expect(body.data.customer.id).toBeUndefined();
    // Verify transaction was committed
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
  });

  test('POST /orders missing customer_code → 422 validation error', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ service_code: 'SVC-01', quantity: 5 }]
      })
    });
    expect(res.status).toBe(422);
  });

  test('POST /orders with legacy customer_id → 422 (rejected)', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 5,
        items: [{ service_code: 'SVC-01', quantity: 5 }]
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
        items: [{ service_code: 'SVC-01', quantity: 5 }]
      })
    });
    expect(res.status).toBe(422);
  });
});

describe('Payment — create via order code in URL', () => {
  beforeEach(() => resetPoolMocks());

  test('POST /orders/ORD-260614-K7M2QF/payments → 201, payment has generated code & no id', async () => {
    // resolveIdParam('orders') resolves ORD-... → id 11
    pool.query.mockResolvedValueOnce([[{ id: 11 }], []]);

    // paymentController.createForOrder → getOrderForPayment(11)
    pool.query.mockResolvedValueOnce([[{ id: 11, code: 'ORD-260614-K7M2QF', total_price: 30000, payment_status: 'unpaid' }], []]);

    // paymentQueries.create (transaction):
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
    // FASE 4: internal id/FK fields stripped
    expect(body.data.id).toBeUndefined();
    expect(body.data.order_id).toBeUndefined();
  });
});

describe('Payment — GET by code', () => {
  beforeEach(() => resetPoolMocks());

  test('GET /payments/PAY-260614-9F2K4M → 200, response includes code (no id)', async () => {
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
    expect(body.data.id).toBeUndefined();
    expect(body.data.order_id).toBeUndefined();
  });
});
