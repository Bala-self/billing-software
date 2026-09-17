# BillPro — GST Billing & Inventory (MERN)

Multi-tenant billing software for Indian businesses: GST invoicing (CGST/SGST
split, IGST for interstate), inventory with stock movements, purchases, sales
& purchase returns, quotations, customers, suppliers, staff users with
role-based permissions, dashboard, reports, PDF generation and audit logs.

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, Axios       |
| Backend  | Node.js, Express 4, Mongoose 8 (MongoDB), JWT, bcryptjs     |
| Testing  | Jest + Supertest + mongodb-memory-server (in-memory DB)     |

## Project structure

```
backend/
  config/          db.js — MongoDB connection
  constants/       permissions.js — roles & permission keys
  controllers/     one file per module (auth, products, invoices, ...)
  middleware/      authMiddleware (JWT), permissionMiddleware (RBAC), errorMiddleware
  models/          Mongoose schemas (User, Business, Product, Invoice, ...)
  routes/          one router per module, mounted in index.js
  services/        pdfService.js — invoice & quotation PDFs (pdfkit)
  utils/           billing.js (GST maths), numbering.js (INV-2026-0001 style
                   numbers), ApiError/ApiResponse/asyncHandler, auditLogger
  tests/           Jest tests (auth, billing calculations, full billing flow)
  index.js         Express app: middleware stack + route mounting

frontend/
  src/
    components/    Layout, Sidebar, ProtectedRoute, shared UI primitives (ui.jsx)
    context/       AuthContext — login/logout, user + permissions state
    pages/         one component per page (Billing, Invoices, Products, ...)
    services/      api.js — axios instance + JWT header + 401 handling
    App.jsx        route definitions
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env        # then set a strong JWT_SECRET and your MONGO_URI
npm install
npm run dev                 # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

Register a business on the login page, then use the owner (Admin) login to
manage the rest.

## Useful scripts

| Where    | Command          | What it does                              |
| -------- | ---------------- | ----------------------------------------- |
| backend  | `npm test`       | Jest suite (uses an in-memory MongoDB)    |
| backend  | `npm run dev`    | API server with auto-reload               |
| backend  | `npm start`      | API server (production)                   |
| frontend | `npm run dev`    | Vite dev server                           |
| frontend | `npm run build`  | Production build into `dist/`             |

## How authentication works

1. `POST /api/auth/login` checks the user, compares the bcrypt-hashed password
   and returns a signed JWT (valid 7 days by default).
2. The frontend stores the JWT in `localStorage`; `services/api.js` attaches it
   as `Authorization: Bearer <token>` on every request.
3. The backend `authMiddleware` verifies the token on every protected route and
   loads the user; `permissionMiddleware` checks the role/permission afterwards.
4. Any 401 response clears the stored token and sends the user back to login.

## How an invoice is created (typical flow)

```
Frontend (Billing page)
  → POST /api/invoices  { customerId, items: [{ productId, quantity, discount? }] }
      → route: authenticate + authorize(INVOICE_CREATE)
      → invoiceController.createInvoice
          1. loads business + customer (state codes decide IGST vs CGST/SGST)
          2. for each item: checks stock, calculates the line (utils/billing.js)
          3. saves the Invoice
          4. reduces product stock + writes StockMovement entries
          5. adds the due amount to customer.outstandingBalance
  ← { success, data: invoice, message }
```
