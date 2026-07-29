# TODO Perbaikan - Washpos Application

**Dibuat**: 2026-07-28  
**Berdasarkan**: `ANALISIS_ERROR_RENCANA_PERBAIKAN.md`  
**Status**: Ready to Implement

---

## 🚨 Sprint 1 - P0 Kritis (SECURITY BREAKING)

**Estimasi**: 3-5 hari  
**Priority**: IMMEDIATE - Aplikasi rusak / kebocoran data

### ✅ Pre-Sprint Checklist
- [ ] Backup database: `docker exec laundry_db mysqldump -u root -proot laundry_db > backup_pre_sprint1.sql`
- [ ] Start Docker Desktop dan verify MySQL running
- [ ] Run `npm test` - verify 86/86 passing baseline
- [ ] Team approval untuk Sprint 1 fixes

---

### 🔴 P0-1: Fix Migration Runner System

**Status**: 🔄 **IN PROGRESS** - Tasks 1.1-1.4 completed, testing pending  
**Estimasi**: 1-2 hari  
**Files**: `backend/docker-compose.yml`, `backend/server.js`, `backend/package.json`

#### Tasks
- [x] **Task 1.1**: Research migration library ✅
  - [x] Evaluasi `node-mysql-migrate` vs `db-migrate` vs `Knex` vs `Umzug`
  - [x] Pilih library yang paling cocok untuk project: **Umzug** selected
  - [x] Created analysis document: `migrations/migration_runner_analysis.md`
  
- [x] **Task 1.2**: Implement migration runner ✅
  - [x] Install migration library: `npm install --save umzug`
  - [x] Create migration config file: `migrations/runner.js`
  - [x] Setup migration scripts folder structure
  - [x] Create combined migration: `004_combined_code_migration.sql` (includes backfill)
  - [x] MySQL storage adapter for Umzug with migrations table
  - [x] Custom SQL file executor for .sql migrations
  
- [x] **Task 1.3**: Update server startup ✅
  - [x] Add migration check di `backend/server.js`
  - [x] Run migrations on startup (if not applied)
  - [x] Add health-check fail-fast jika kolom `code` tidak ada
  - [x] Log migration status saat server start
  - [x] Async server startup with migration run
  
- [x] **Task 1.4**: Update docker-compose ✅
  - [x] Remove `./migrations:/docker-entrypoint-initdb.d` mount
  - [x] Remove obsolete `version: '3.8'` attribute
  - [x] Add proper migration documentation in comments
  - [x] Add migration scripts to package.json: `migrate`, `migrate:status`, `migrate:health`
  
- [ ] **Task 1.5**: Test & Verify (PENDING)
  - [ ] Start Docker Desktop
  - [ ] Delete `mysql_data` volume: `docker-compose down -v && docker-compose up -d`
  - [ ] Run migrations manually: `npm run migrate`
  - [ ] Verify schema: `DESCRIBE users;` (check `code` column exists)
  - [ ] Test login: `POST /auth/login` → should work (no 500 error)
  - [ ] Test all tables have `code` column (users, customers, services, orders, payments)
  - [ ] Document migration commands di README

**Progress**: 80% complete - Testing pending (requires Docker)

---

### 🔴 P0-2: Fix Employee Data Leakage in Payments

**Status**: ⬜ **TODO**  
**Estimasi**: 2-4 jam  
**Files**: `backend/src/controllers/paymentController.js`

#### Tasks
- [ ] **Task 2.1**: Analyze orderController isolation pattern
  - [ ] Review `backend/src/controllers/orderController.js:97-107`
  - [ ] Copy the pegawai isolation pattern
  
- [ ] **Task 2.2**: Add user_id filter to paymentController
  ```javascript
  // File: backend/src/controllers/paymentController.js
  // Line: ~44 (after existing filters setup)
  
  // Add this code:
  if (req.user.role === 'pegawai') {
    // Filter payments hanya untuk orders milik pegawai ini
    filters.user_id = req.user.id;
  }
  ```
  
- [ ] **Task 2.3**: Apply same fix to detail function
  - [ ] Check `detail()` function (line ~69-83)
  - [ ] Add pegawai isolation if needed
  
- [ ] **Task 2.4**: Test with pegawai account
  - [ ] Login sebagai pegawai1: `POST /auth/login` dengan pegawai1 credentials
  - [ ] Get payments: `GET /payments` dengan pegawai token
  - [ ] Verify: Returns 0-1 payments (only pegawai1's), NOT all 7+ payments
  - [ ] Compare with orders: `GET /orders` → 1 order (pegawai's own)
  
- [ ] **Task 2.5**: Regression test
  - [ ] Test with admin account → should still see ALL payments
  - [ ] Test payment detail endpoint dengan pegawai
  - [ ] Verify payment CRUD masih works untuk both roles

**Expected Result**: Pegawai hanya lihat payments miliknya sendiri, admin lihat semua

---

### 🔴 P0-3: Fix XSS Vulnerability in JWT Storage

**Status**: ⬜ **TODO**  
**Estimasi**: 1-2 hari  
**Files**: `backend/src/controllers/authController.js`, `frontend/src/lib/auth.ts`, `frontend/src/proxy.ts`

#### Tasks
- [ ] **Task 3.1**: Backend - Implement httpOnly cookie
  ```javascript
  // File: backend/src/controllers/authController.js
  // Function: login (around line ~40)
  
  // Add cookie configuration:
  res.cookie('washpos_token', token, {
    httpOnly: true,        // ❌ Prevent XSS
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'strict',    // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    path: '/'
  });
  ```
  
- [ ] **Task 3.2**: Backend - Remove token from response body
  - [ ] Modify login response → don't return token in body
  - [ ] Token hanya via httpOnly cookie
  - [ ] Update `login()` function di authController
  
- [ ] **Task 3.3**: Backend - Update auth middleware
  ```javascript
  // File: backend/src/middleware/auth.js
  // Read token from cookie instead of Authorization header
  
  const token = req.cookies.washpos_token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  ```
  
- [ ] **Task 3.4**: Frontend - Refactor auth.ts
  ```typescript
  // File: frontend/src/lib/auth.ts
  
  // ❌ Remove: localStorage implementation
  // export const setToken = (token: string) => {
  //   localStorage.setItem('washpos_token', token);
  // }
  
  // Token sekarang di httpOnly cookie (set oleh backend)
  // Tidak perlu manual storage di frontend
  
  export const getToken = () => {
    // Token otomatis dikirim via cookie oleh browser
    return null; // Tidak perlu expose token ke JS
  }
  
  export const clearToken = async () => {
    // Call logout endpoint untuk clear cookie
    await fetch('/api/v1/auth/logout', { method: 'POST' });
  }
  ```
  
- [ ] **Task 3.5**: Frontend - Fix proxy.ts role check
  ```typescript
  // File: frontend/src/proxy.ts
  
  // ❌ Remove: cookie-based role check
  // const role = getCookie('washpos_role');
  
  // ✅ Use: decode JWT server-side OR role from /auth/me endpoint
  // Backend should provide role in /auth/me response
  ```
  
- [ ] **Task 3.6**: Backend - Add role to /auth/me response
  ```javascript
  // File: backend/src/controllers/authController.js
  // Function: me
  
  // Return role di response
  return successResponse(res, 'User retrieved successfully', {
    ...sanitizedUser,
    role: req.user.role  // ✅ Include role
  });
  ```
  
- [ ] **Task 3.7**: Test auth flow
  - [ ] Test login → cookie set (check DevTools → Application → Cookies)
  - [ ] Verify cookie: `httpOnly: true`, `sameSite: strict`
  - [ ] Test API calls → cookie otomatis dikirim
  - [ ] Test XSS prevention → token tidak accessible via JS
  - [ ] Test logout → cookie di-clear
  - [ ] Test session persist across page refresh

**Expected Result**: JWT aman dari XSS, tidak ada token di localStorage

---

### 🔴 P0-4: Fix CORS Misconfiguration

**Status**: ⬜ **TODO**  
**Estimasi**: 1-2 jam  
**Files**: `backend/server.js`

#### Tasks
- [ ] **Task 4.1**: Implement CORS allowlist
  ```javascript
  // File: backend/server.js (around line ~19-22)
  
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : ['http://localhost:3000']; // Default safe origin
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed from: ' + origin));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  };
  
  app.use(cors(corsOptions));
  ```
  
- [ ] **Task 4.2**: Add CORS error handling
  - [ ] Log rejected CORS origins
  - [ ] Return proper error response
  
- [ ] **Task 4.3**: Update .env configuration
  ```env
  # File: backend/.env
  CORS_ORIGIN=http://localhost:3000,https://washpos.example.com
  ```
  
- [ ] **Task 4.4**: Update .env.example
  ```env
  # File: backend/.env.example
  CORS_ORIGIN=http://localhost:3000
  ```
  
- [ ] **Task 4.5**: Test CORS
  - [ ] Test dengan allowed origin → should work
  - [ ] Test dengan blocked origin → should fail
  - [ ] Test credentials → cookies dikirim properly
  - [ ] Test preflight OPTIONS requests

**Expected Result**: Hanya origin yang diizinkan bisa akses API

---

### ✅ Sprint 1 Completion Checklist
- [ ] All 4 P0 fixes implemented
- [ ] All tests passing: `npm test` (86/86)
- [ ] Live API testing successful (requires Docker)
- [ ] Security tests pass
- [ ] Documentation updated (README.md)
- [ ] Deploy ke staging untuk verification
- [ ] Team sign-off untuk Sprint 1

---

## 🟠 Sprint 2 - P1 Tinggi (CORRECTNESS ISSUES)

**Estimasi**: 5-7 hari  
**Priority**: HIGH - Berdampak ke user experience

### 🟠 P1-1: Fix 204 No Content + Body JSON

**Status**: ⬜ **TODO**  
**Estimasi**: 2-3 jam  
**Files**: `backend/src/utils/response.js`, multiple controllers

#### Tasks
- [ ] Analyze current 204 implementation
- [ ] Remove body untuk 204 responses ATAU ubah ke 200
- [ ] Update all DELETE endpoints yang return 204
- [ ] Test dengan HTTP client ketat (axios strict)
- [ ] Verify browser compatibility

---

### 🟠 P1-2: Fix Dashboard Timezone Bug

**Status**: ⬜ **TODO**  
**Estimasi**: 1-2 jam  
**Files**: `backend/src/queries/statsQueries.js:14`

#### Tasks
- [ ] Analyze timezone calculation: `new Date().toISOString().split('T')[0]`
- [ ] Implement WIB timezone: `new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Jakarta'})`
- [ ] Test antara 00:00-07:00 WIB (bug window)
- [ ] Verify "pesanan hari ini" calculation correct
- [ ] Add timezone helper function

---

### 🟠 P1-3: Fix Order Delete (Hard Delete → Soft Cancel)

**Status**: ⬜ **TODO**  
**Estimasi**: 3-4 jam  
**Files**: `backend/src/controllers/orderController.js:306-323`

#### Tasks
- [ ] Rename DELETE ke soft-cancel (set `status='cancelled'`)
- [ ] Add audit log untuk cancel
- [ ] Update README documentation (keterangan "Batalkan")
- [ ] Frontend: Update button label "Hapus" → "Batalkan"
- [ ] Test order cancellation flow
- [ ] Verify data tidak dihapus permanen

---

### 🟠 P1-4: Fix Order Status Flow Validation

**Status**: ⬜ **TODO**  
**Estimasi**: 2-3 jam  
**Files**: `backend/src/controllers/orderController.js:286-288`

#### Tasks
- [ ] Implement state machine validation
- [ ] Allowed transitions: `pending→dicuci→disetrika→siap→diambil`
- [ ] Block backward transitions
- [ ] Allow cancel dari status apapun
- [ ] Test status flow violations
- [ ] Update error messages

---

### 🟠 P1-5: Add Rate Limiting & Security Headers

**Status**: ⬜ **TODO**  
**Estimasi**: 2-3 jam  
**Files**: `backend/src/routes/authRoutes.js`, `backend/server.js`

#### Tasks
- [ ] Install: `npm install express-rate-limit helmet`
- [ ] Add rate limit ke `/auth/login`: 5 attempts per 15 minutes
- [ ] Add `helmet()` middleware: HSTS, X-Content-Type-Options
- [ ] Test brute force protection
- [ ] Verify security headers present

---

### 🟠 P1-6: Fix RBAC Stale Role & Cache Issues

**Status**: ⬜ **TODO**  
**Estimasi**: 2-3 jam  
**Files**: `backend/src/middleware/auth.js`, `backend/src/utils/codeResolver.js`

#### Tasks
- [ ] Re-fetch role dari DB di auth middleware
- [ ] Atau implement token version check
- [ ] Kurangi cache TTL dari 5 menit ke 1 menit
- [ ] Jangan cache negative results
- [ ] Test role change → immediate effect

---

### 🟠 P1-7: Implement Logout Token Revocation

**Status**: ⬜ **TODO**  
**Estimasi**: 3-4 jam  
**Files**: `backend/src/controllers/authController.js:163-172`

#### Tasks
- [ ] Design token blacklist / token-version strategy
- [ ] Implement blacklist storage (Redis/DB)
- [ ] Update logout endpoint
- [ ] Check blacklist di auth middleware
- [ ] Test logout → token invalid
- [ ] Add TTL untuk blacklist entries

---

### 🟠 P1-8: Add Missing "Rekap Penghasilan" Menu

**Status**: ⬜ **TODO**  
**Estimasi**: 30 menit  
**Files**: `frontend/src/app/(authenticated)/layout.tsx:21-28`

#### Tasks
- [ ] Add `/reports/income` ke NAV_ITEMS
- [ ] Verify link works
- [ ] Test dengan admin account
- [ ] Remove dead code di `Sidebar.tsx`

---

### 🟠 P1-9: Fix Dead Code in paymentService

**Status**: ⬜ **TODO**  
**Estimasi**: 30 menit  
**Files**: `frontend/src/lib/services/paymentService.ts:19-21`

#### Tasks
- [ ] Remove `create` method ATAU arahkan ke endpoint benar
- [ ] Update README & Swagger
- [ ] Verify no other code memanggil method ini

---

### 🟠 P1-10: Fix Migration Backfill Automation

**Status**: ⬜ **TODO**  
**Estimasi**: 1-2 jam  
**Files**: `backend/migrations/`, `backend/scripts/backfillCodes.js`

#### Tasks
- [ ] Gabungkan `002 → backfill → 003` ke pipeline otomatis
- [ ] Test di fresh database
- [ ] Verify no manual intervention needed
- [ ] Document migration steps

---

### 🟠 P1-11: Improve Password Policy

**Status**: ⬜ **TODO**  
**Estimasi**: 1-2 jam  
**Files**: `backend/src/controllers/authController.js`, `backend/userController.js`

#### Tasks
- [ ] Add complexity validation: uppercase, lowercase, number
- [ ] Implement password denylist (common passwords)
- [ ] Change default seed passwords
- [ ] Update documentation
- [ ] Test password validation

---

### ✅ Sprint 2 Completion Checklist
- [ ] All 11 P1 fixes implemented
- [ ] Tests passing
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Documentation updated

---

## 🟡 Sprint 3 - P2 Sedang (ROBUSTNESS)

**Estimasi**: 7-10 hari  
**Priority**: MEDIUM - Konsistensi & reliability

### 🟡 P2-1: Fix Race Conditions (Uniqueness)
- [ ] whatsapp uniqueness (customerController)
- [ ] username uniqueness (authController, userController)
- [ ] Implement transactions / SELECT FOR UPDATE
- [ ] Handle ER_DUP_ENTRY → 409

### 🟡 P2-2: Fix N+1 Query Issues
- [ ] order detail: loop SELECT service per item
- [ ] audit logs: loop SELECT users
- [ ] Implement JOIN batch optimization

### 🟡 P2-3: Add Transaction Wrapping
- [ ] Order creation multi-tabel
- [ ] Customer deletion
- [ ] Service code generation

### 🟡 P2-4: Fix Filter Query Inconsistencies
- [ ] orders: `?customer_id` vs `?customer_code`
- [ ] payments: `?order_id` vs `?order_code`

### 🟡 P2-5: Mask Error Messages in Production
- [ ] Don't expose MySQL errors ke client
- [ ] Log detail di server

### 🟡 P2-6: Validate Pagination Parameters
- [ ] Clamp `limit` (max 100)
- [ ] Validate `page >= 1`
- [ ] Handle negative values

### 🟡 P2-7: Implement LRU Cache Eviction
- [ ] codeResolver cache tanpa max-size
- [ ] Add LRU library

### 🟡 P2-8: Standardize Status Codes
- [ ] DELETE inconsistencies (200 vs 204)
- [ ] FK errors → 409 (not 500)

### 🟡 P2-9: Remove Dead Code Backend
- [ ] `orderQueries.updatePaymentStatus`
- [ ] `paymentQueries.getTotalPaymentsForOrder`
- [ ] Other unused functions

### 🟡 P2-10: Fix Frontend DataTable Generic
- [ ] Remove `as unknown as` casts
- [ ] Add proper `rowKey` prop
- [ ] Fix key={rowIdx} issue

### 🟡 P2-11: Add AbortController to Frontend
- [ ] All list pages: customers, orders, payments, services, users
- [ ] Prevent race conditions

### 🟡 P2-12: Improve Accessibility
- [ ] Modal: ARIA attributes, focus trap
- [ ] ConfirmDialog: proper semantics
- [ ] StatusBadge: icon/pattern untuk colorblind

### 🟡 P2-13: Fix Frontend Bugs
- [ ] payments form attribute issue
- [ ] formatDate function naming
- [ ] useAdminGuard aggressive redirect
- [ ] search per-halaman only

### 🟡 P2-14: Expand Test Coverage
- [ ] Backend: Controller, query, middleware tests
- [ ] Integration tests vs MySQL asli
- [ ] RBAC tests
- [ ] Frontend: Unit tests

### 🟡 P2-15: Refactor Duplicate Code
- [ ] Extract helper functions
- [ ] MAX_CODE_RETRY centralized
- [ ] Dynamic UPDATE builder shared

---

## 🟢 Sprint 4 - P3 Rendah (POLISH)

**Estimasi**: 5-7 hari  
**Priority**: LOW - Fitur tambahan & cleanup

### 🟢 P3-1: Cleanup Dead Code Frontend
- [ ] Remove unused AppLayout, Sidebar, Topbar
- [ ] Remove unused imports (PaginatedData)
- [ ] Fix double toaster render

### 🟢 P3-2: Add Missing Features
- [ ] Detail pages: customer, service, user
- [ ] Print invoice/order
- [ ] Refresh token, forgot-password
- [ ] Global search, pagination selector
- [ ] Date range filter
- [ ] Health check endpoint

### 🟢 P3-3: Improve Operability
- [ ] Add request logging (morgan/pino-http)
- [ ] Graceful shutdown (SIGTERM/SIGINT)
- [ ] Unhandled rejection/exception handlers
- [ ] Fail-fast DB connection check

### 🟢 P3-4: API Consistency
- [ ] Standardize snake_case vs camelCase
- [ ] Add CSP headers
- [ ] Update tsconfig target

### 🟢 P3-5: Dependency Updates
- [ ] `npm audit fix` (backend 4 vuln, frontend 5 high)
- [ ] Fix ESLint errors (12 error, 11 warning)
- [ ] Verify lucide-react version

### 🟢 P3-6: Documentation Updates
- [ ] Sync README dengan current state
- [ ] Update migration steps
- [ ] Fix curl examples di README
- [ ] Update Swagger schemas
- [ ] Document hybrid ID strategy

---

## 📊 Progress Tracking

### Overall Progress
- [ ] Sprint 1 (P0): 0.8/4 fixes completed (P0-1: 80%, P0-2: 0%, P0-3: 0%, P0-4: 0%)
- [ ] Sprint 2 (P1): 0/11 fixes completed  
- [ ] Sprint 3 (P2): 0/15 fixes completed
- [ ] Sprint 4 (P3): 0/6 fixes completed

### Sprint 1 Progress Detail
- [ ] P0-1: 80% complete (Tasks 1.1-1.4 done, Task 1.5 testing pending)
- [ ] P0-2: 0% complete
- [ ] P0-3: 0% complete  
- [ ] P0-4: 0% complete

### Test Status
- [x] Backend tests: 86/86 passing
- [ ] Frontend tests: 0% coverage
- [ ] Integration tests: Needs Docker
- [ ] E2E tests: Not implemented

### File Modification Checklist
- [ ] `backend/docker-compose.yml` - P0-1
- [ ] `backend/src/controllers/paymentController.js` - P0-2
- [ ] `backend/src/controllers/authController.js` - P0-3
- [ ] `frontend/src/lib/auth.ts` - P0-3
- [ ] `frontend/src/proxy.ts` - P0-3
- [ ] `backend/server.js` - P0-4
- [ ] +20 other files untuk P1-P3 fixes

---

## 🎯 Quick Start Guide

### Untuk Mulai Sprint 1 (Hari Ini):

1. **Preparation** (15 menit):
   ```bash
   # Start Docker
   # Open Docker Desktop
   
   # Backup database
   cd backend
   docker exec laundry_db mysqldump -u root -proot laundry_db > backup_pre_sprint1.sql
   
   # Verify baseline tests
   npm test
   ```

2. **Task P0-1: Migration Fix** (1-2 hari):
   ```bash
   # Install migration library
   npm install --save node-mysql-migrate
   
   # Setup migrations
   # ... (lihat detail di task P0-1)
   ```

3. **Task P0-2: Employee Isolation** (2-4 jam):
   ```bash
   # Edit paymentController.js
   # Tambahkan 4 baris code di line 44
   # Test dengan pegawai account
   ```

4. **Task P0-3: XSS Fix** (1-2 hari):
   ```bash
   # Backend: Implement httpOnly cookie
   # Frontend: Refactor auth.ts
   # Test auth flow end-to-end
   ```

5. **Task P0-4: CORS Fix** (1-2 jam):
   ```bash
   # Edit server.js
   # Update CORS configuration
   # Test dengan multiple origins
   ```

---

## 📝 Notes

- **Estimated Total Time**: 3-4 minggu untuk seluruh perbaikan
- **Sprint 1 Priority**: IMMEDIATE - Security breaking bugs
- **Dependencies**: P0-1 harus dikerjakan first, lainnya bisa parallel
- **Testing**: Run `npm test` setelah setiap fix
- **Documentation**: Update README setelah selesai setiap Sprint

---

**Last Updated**: 2026-07-28  
**Status**: Ready to Implement  
**Next Action**: Start Sprint 1 - P0-1 (Migration Fix)
