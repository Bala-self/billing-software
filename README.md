# BillPro — GST Billing & Business Management System

**BillPro** is a full-stack MERN-based billing and business management application designed for Indian businesses.

It brings day-to-day business operations into one system — **GST billing, products, inventory, customers, purchases, quotations, employees, attendance, reports, users, permissions, dashboard management, PDF documents, and audit logs**.

The project is built with a simple and understandable architecture so that the code is easy to maintain, debug, extend, and learn from.

---

## Overview

BillPro is designed around a practical business workflow:

```text
Business
   │
   ├── Products
   ├── Categories
   ├── Brands
   ├── Units
   │
   ├── Customers
   ├── Purchases
   ├── Sales / Invoices
   ├── Quotations
   │
   ├── Employees
   ├── Attendance
   ├── Users & Permissions
   │
   ├── Dashboard
   ├── Reports
   ├── Audit Logs
   └── Business Settings
```

The application uses a React frontend and an Express/Node.js backend connected to MongoDB through Mongoose.

---

# Features

## Authentication & Users

* User registration and login
* JWT-based authentication
* Password hashing with bcrypt
* Protected API routes
* Business-based user association
* Role and permission handling
* Automatic logout when authentication expires
* User management

Authentication is handled through the `Authorization: Bearer <token>` header.

The backend verifies the JWT and loads the authenticated user before allowing access to protected resources.

---

## Business Management

BillPro is designed around business-level data separation.

A user belongs to a business, and backend operations use the authenticated user's business context when working with business data.

This allows the application to support multiple businesses using the same application architecture.

---

# GST Billing

BillPro contains a centralized GST calculation system.

The billing engine supports:

* CGST
* SGST
* IGST
* Interstate transactions
* Intrastate transactions
* Fixed discounts
* Percentage discounts
* Taxable amount calculation
* Tax calculation
* Invoice totals
* Round-off calculation

### GST calculation logic

For an interstate transaction:

```text
Taxable Amount
      │
      └── IGST
```

For an intrastate transaction:

```text
Taxable Amount
      │
      ├── CGST
      │
      └── SGST
```

The billing calculation logic is centralized in:

```text
backend/utils/billing.js
```

This prevents different modules from implementing GST calculations differently.

---

# Billing Flow

A typical invoice creation flow looks like this:

```text
React Billing Page
        │
        ▼
POST /api/invoices
        │
        ▼
Authentication
        │
        ▼
Permission Check
        │
        ▼
Invoice Controller
        │
        ├── Load customer
        ├── Load products
        ├── Check stock
        ├── Calculate discounts
        ├── Calculate GST
        ├── Calculate invoice total
        │
        ▼
Create Invoice
        │
        ├── Reduce stock
        ├── Create stock movement
        └── Update customer balance
        │
        ▼
Return API Response
```

The goal is to keep the complete billing process controlled by the backend rather than trusting calculations from the frontend.

---

# Inventory Management

BillPro provides inventory-related functionality around products and stock.

Supported business areas include:

* Product management
* Categories
* Brands
* Units
* Stock quantities
* Stock movements
* Purchase operations
* Sales/invoice operations
* Purchase returns
* Stock validation during billing

The backend is responsible for validating stock before completing a transaction.

---

# Products

Products can be managed through the product module.

Product-related functionality includes:

* Product creation
* Product updates
* Product deletion
* Product search
* Category association
* Brand association
* Unit association
* Stock information
* Billing-related product information

---

# Customers

The customer module manages customer information used throughout the billing workflow.

Customer functionality includes:

* Customer creation
* Customer management
* Customer details
* Billing history
* Outstanding balance tracking
* Customer association with invoices

When an invoice creates a due amount, the backend can update the customer's outstanding balance as part of the billing flow.

---

# Purchases

The purchase module manages incoming stock and purchase transactions.

Typical workflow:

```text
Supplier
   │
   ▼
Purchase
   │
   ├── Products
   ├── Quantities
   ├── Prices
   └── Tax
   │
   ▼
Inventory Updated
```

Purchase-related operations are handled through the backend API.

---

# Quotations

BillPro also supports quotations.

Quotation functionality is separated from finalized sales invoices so that a business can prepare a quotation before completing a sale.

The backend also contains PDF generation support for business documents.

---

# Employees & Attendance

The application includes employee and attendance management.

Modules include:

* Employees
* Attendance
* User accounts
* Employee-related business operations

The backend exposes dedicated routes for:

```text
/api/employees
/api/attendance
```

This allows the billing system to also handle basic employee-management operations instead of focusing only on invoices.

---

# Dashboard

BillPro contains a dashboard module for business-level information.

The backend exposes:

```text
/api/dashboard
```

The dashboard is intended to provide a centralized view of important business information.

---

# Reports

Reporting functionality is available through:

```text
/api/reports
```

Reports are generated from backend data rather than relying only on frontend calculations.

This allows the system to perform database-level calculations where appropriate.

---

# PDF Generation

The backend uses **PDFKit** for generating business documents.

PDF-related functionality is part of the backend service layer.

Typical documents include:

* Invoices
* Quotations

The generated documents can be produced from the business transaction data stored in MongoDB.

---

# Audit Logs

BillPro includes an audit-log module.

```text
/api/audit-logs
```

Audit logging provides a way to track important business/application actions.

This becomes particularly useful when multiple employees or users operate the same business account.

---

# Settings

Business/application settings are handled through:

```text
/api/settings
```

This keeps configurable business information separate from core transaction logic.

---

# Security

The backend includes several security and performance protections.

## JWT Authentication

Protected routes use JWT authentication.

```text
Authorization: Bearer <JWT>
```

The backend verifies the token and identifies the authenticated user.

---

## Password Hashing

Passwords are hashed using:

```text
bcryptjs
```

Plain-text passwords are not used for authentication.

---

## Security Headers

The backend uses:

```text
Helmet
```

for HTTP security-related headers.

---

## Rate Limiting

API requests are rate limited using:

```text
express-rate-limit
```

The `/api` routes are protected by a global rate limiter.

---

## CORS

The backend uses CORS configuration to control frontend/API communication.

Production environments can restrict requests to the configured frontend origin.

---

## Request Size Limiting

JSON and URL-encoded requests are limited to prevent unnecessarily large request payloads.

---

# Performance

The backend includes several performance-oriented measures:

* Response compression
* API rate limiting
* MongoDB indexes
* Pagination for list operations
* Smaller API responses
* Database-level aggregation for reports
* Static asset caching
* Production frontend serving
* Health-check endpoint

The API also exposes:

```text
GET /api/health
```

Example response:

```json
{
  "success": true,
  "message": "Billing API running"
}
```

---

# Technology Stack

| Layer               | Technology            |
| ------------------- | --------------------- |
| Frontend            | React 19              |
| Frontend Build Tool | Vite                  |
| Styling             | Tailwind CSS 4        |
| Routing             | React Router 7        |
| HTTP Client         | Axios                 |
| Icons               | React Icons           |
| Backend             | Node.js               |
| API Framework       | Express.js 4          |
| Database            | MongoDB               |
| ODM                 | Mongoose 8            |
| Authentication      | JWT                   |
| Password Security   | bcryptjs              |
| Security Headers    | Helmet                |
| Rate Limiting       | express-rate-limit    |
| Compression         | compression           |
| PDF Generation      | PDFKit                |
| Testing             | Jest                  |
| API Testing         | Supertest             |
| Test Database       | mongodb-memory-server |
| Development Server  | Nodemon               |

The dependency definitions in the repository confirm the React/Vite/Tailwind frontend stack and the Node/Express/Mongoose/JWT/PDFKit backend stack.

---

# Project Architecture

BillPro uses a separated frontend/backend architecture.

```text
billing-software/
│
├── backend/
│
└── frontend/
```

---

## Backend Structure

```text
backend/
│
├── config/
│   └── db.js
│
├── constants/
│
├── controllers/
│
├── middleware/
│
├── models/
│
├── routes/
│
├── services/
│
├── utils/
│
├── tests/
│
├── clear-db.js
├── index.js
└── package.json
```

### `config/`

Database connection and backend configuration.

```text
config/db.js
```

MongoDB is connected through Mongoose using the `MONGO_URI` environment variable.

---

### `controllers/`

Contains the application business logic for individual modules.

Examples include operations related to:

* Authentication
* Products
* Customers
* Invoices
* Purchases
* Quotations
* Employees
* Attendance
* Users
* Reports
* Dashboard
* Settings

---

### `middleware/`

Contains middleware used between incoming requests and controllers.

Important responsibilities include:

* Authentication
* Authorization
* Error handling
* Request processing

JWT authentication verifies the token, loads the user, and attaches the user's business context to the request.

---

### `models/`

Contains Mongoose schemas representing the application's database entities.

Examples include business and transaction-related models such as:

```text
User
Business
Product
Customer
Invoice
Purchase
Quotation
StockMovement
```

---

### `routes/`

API endpoints are separated by business module.

Current backend route groups include:

```text
/api/auth
/api/categories
/api/brands
/api/units
/api/products
/api/customers
/api/invoices
/api/purchases
/api/quotations
/api/employees
/api/attendance
/api/users
/api/audit-logs
/api/reports
/api/dashboard
/api/settings
```

These routes are mounted centrally from `backend/index.js`.

---

### `services/`

Contains reusable backend services, including document/PDF-related functionality.

---

### `utils/`

Contains reusable application logic.

One important utility is:

```text
backend/utils/billing.js
```

It centralizes GST calculations, discounts, taxable amounts, CGST, SGST, IGST, total tax, round-off, and grand total calculations.

---

### `tests/`

Backend tests are written using:

```text
Jest
Supertest
mongodb-memory-server
```

This allows API and business logic to be tested without depending on the normal development MongoDB database.

---

# Frontend Structure

```text
frontend/
│
├── src/
│   │
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   │
│   ├── App.jsx
│   └── ...
│
├── package.json
├── vite.config.js
└── ...
```

## Components

Reusable UI elements and application layout components.

Examples include:

* Layout
* Sidebar
* Protected routes
* Shared UI components

---

## Context

Application-wide React state.

Authentication state is handled through the authentication context.

---

## Pages

Each major application area is represented by its own page/component.

Examples include areas such as:

* Billing
* Invoices
* Products
* Customers
* Purchases
* Quotations
* Employees
* Attendance
* Dashboard
* Reports
* Settings

---

## Services

The frontend communicates with the backend through the API service layer.

Axios is used for HTTP communication.

The API layer is responsible for handling:

```text
Frontend
   │
   ▼
Axios
   │
   ▼
REST API
   │
   ▼
Express
   │
   ▼
MongoDB
```

---

# Authentication Flow

```text
User
 │
 ▼
Login Page
 │
 ▼
POST /api/auth/login
 │
 ▼
Backend
 │
 ├── Find User
 ├── Compare Password
 └── Generate JWT
 │
 ▼
JWT returned
 │
 ▼
Frontend stores token
 │
 ▼
Axios adds:
Authorization: Bearer <token>
 │
 ▼
Protected API
 │
 ▼
JWT Verification
 │
 ▼
User Identified
 │
 ▼
Request Allowed
```

The frontend sends the JWT with API requests, while the backend verifies it before protected operations.

---

# Database

BillPro uses:

```text
MongoDB
     │
     ▼
Mongoose
     │
     ▼
Node.js / Express
```

The database connection is configured through:

```env
MONGO_URI=your_mongodb_connection_string
```

For local development, MongoDB can be run locally and the URI can point to the local MongoDB instance.

Example:

```env
MONGO_URI=mongodb://127.0.0.1:27017/billpro
```

Use your own database name and connection configuration.

---

# Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/billpro

JWT_SECRET=your_strong_secret

CLIENT_URL=http://localhost:5173
```

Do not commit real secrets to GitHub.

The repository's `.gitignore` excludes `.env`, `node_modules`, build output, coverage, and log files.

---

# Installation

## Requirements

Before running the project, install:

* Node.js
* npm
* MongoDB
* Git

---

## 1. Clone the repository

```bash
git clone https://github.com/Bala-self/billing-software.git
```

Move into the project:

```bash
cd billing-software
```

---

# 2. Configure MongoDB

Make sure MongoDB is running locally.

Example database URI:

```env
MONGO_URI=mongodb://127.0.0.1:27017/billpro
```

---

# 3. Configure Backend

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create:

```text
backend/.env
```

Add your environment variables.

---

# 4. Start Backend

Development mode:

```bash
npm run dev
```

The API runs on:

```text
http://localhost:5000
```

Production-style start:

```bash
npm start
```

---

# 5. Start Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

---

# Running the Full Application

You need two development processes:

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

# Available Scripts

## Backend

| Command            | Purpose                           |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start backend with Nodemon        |
| `npm start`        | Start backend normally            |
| `npm test`         | Run Jest tests                    |
| `npm run clear-db` | Run the database clearing utility |

The backend package configuration currently defines these scripts.

---

## Frontend

| Command           | Purpose                       |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start Vite development server |
| `npm run build`   | Create production build       |
| `npm run preview` | Preview production build      |
| `npm run lint`    | Run ESLint                    |

These scripts are defined in the frontend package configuration.

---

# Production Build

Build the frontend:

```bash
cd frontend
npm run build
```

This creates:

```text
frontend/dist/
```

The backend is also configured to serve the generated frontend build when the `frontend/dist` directory exists.

Therefore the application can operate as:

```text
Browser
   │
   ▼
Node / Express
   │
   ├── /api/*
   │       │
   │       ▼
   │    MongoDB
   │
   └── Frontend dist
```

The backend's production-serving logic is implemented in `backend/index.js`.

---

# Testing

Backend tests use:

```text
Jest
Supertest
mongodb-memory-server
```

Run:

```bash
cd backend
npm test
```

The in-memory MongoDB setup allows tests to run independently from the developer's normal MongoDB database.

---

# API Design

The API follows a modular REST-style structure.

```text
/api
│
├── auth
├── categories
├── brands
├── units
├── products
├── customers
├── invoices
├── purchases
├── quotations
├── employees
├── attendance
├── users
├── audit-logs
├── reports
├── dashboard
└── settings
```

Each module has its own route and backend logic.

This keeps the codebase easier to understand and makes it possible to develop and test one business module at a time.

---

# Core Business Logic Principle

BillPro follows a simple rule:

```text
Frontend
    ↓
Request
    ↓
Route
    ↓
Middleware
    ↓
Controller
    ↓
Model / Utility / Service
    ↓
MongoDB
    ↓
Response
    ↓
Frontend
```

The frontend should handle the user interface.

The backend should handle:

* Authentication
* Authorization
* Validation
* Business rules
* GST calculations
* Stock validation
* Database operations
* Document generation
* Audit logging

This prevents important business rules from depending entirely on the browser.

---

# Design Philosophy

The project is intentionally built around:

* Simple JavaScript
* Clear folder structure
* Reusable logic
* Small controllers
* Centralized business calculations
* REST APIs
* Clear database models
* Understandable React components
* Practical business workflows
* Maintainable code over unnecessary abstraction

The billing calculation utility is intentionally kept simple so the complete GST calculation flow can be understood quickly.

---

# Project Goals

The main goals of BillPro are:

1. Build a practical billing application.
2. Support Indian GST billing workflows.
3. Manage products and inventory.
4. Manage customers and suppliers/business transactions.
5. Provide quotations and invoices.
6. Support employees and attendance.
7. Provide reports and dashboard information.
8. Maintain audit history.
9. Protect business data through authentication and permissions.
10. Keep the code understandable and maintainable.
11. Provide a strong real-world MERN stack learning project.

---

# Development Approach

New features should follow the existing application structure.

```text
Requirement
    ↓
Database Model
    ↓
Controller
    ↓
Route
    ↓
Middleware
    ↓
API Testing
    ↓
Frontend Service
    ↓
React Page / Component
    ↓
Integration Testing
    ↓
Regression Testing
```

For important business features, the backend should be completed and tested before connecting the frontend.

---

# Error Handling

The backend uses centralized error-handling middleware.

The general request flow is:

```text
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Error
   ↓
Central Error Handler
   ↓
Consistent API Response
```

This avoids repeating large amounts of error-handling code throughout the application.

---

# Security Notes

Before deploying this application publicly:

* Use a strong `JWT_SECRET`.
* Never commit `.env` files.
* Use a production MongoDB configuration.
* Restrict CORS to trusted frontend origins.
* Review demo/bypass configuration.
* Use HTTPS.
* Review rate limits for production traffic.
* Review database access permissions.
* Remove development-only configuration.
* Review all authentication and authorization rules.
* Validate all production environment variables.

The application contains development/demo-specific authentication and CORS behavior, so those settings should be reviewed carefully before a real production deployment.

---

# Future Improvements

Possible future development areas include:

* Advanced inventory analytics
* Low-stock alerts
* Barcode scanning
* Thermal printer support
* GST report exports
* More advanced financial reports
* Customer payment tracking
* Supplier management improvements
* Expense management
* Backup and restore
* Automated database backups
* Advanced role/permission management
* Improved automated frontend testing
* CI/CD
* Production deployment configuration
* API documentation
* Mobile/PWA support

These are potential extensions and are not presented as currently implemented features.

---

# Contributing

Contributions and improvements are welcome.

A typical workflow:

```bash
git checkout -b feature/your-feature
```

Make your changes.

Test the backend:

```bash
cd backend
npm test
```

Test the frontend:

```bash
cd frontend
npm run build
```

Then commit:

```bash
git add .
git commit -m "Add your feature"
```

Push the branch:

```bash
git push origin feature/your-feature
```

Create a Pull Request on GitHub.

---

# Author

**Balakrishnan M**

GitHub:

https://github.com/Bala-self

---

# Project Status

**BillPro is an actively developed MERN billing and business management project.**

The current repository contains the core full-stack architecture for authentication, GST billing, inventory, business transactions, employees, attendance, reporting, dashboard operations, audit logging, PDF generation, and frontend/backend integration.

---

## Repository

**GitHub:**
https://github.com/Bala-self/billing-software

---

## License

No license file is currently included in the repository.

If this project is intended to be open source, add an appropriate `LICENSE` file and update this section accordingly.

---

# BillPro

**GST Billing • Inventory • Business Management • MERN Stack**

```text
React
  ↓
Axios
  ↓
Express API
  ↓
JWT / Middleware
  ↓
Controllers
  ↓
Mongoose
  ↓
MongoDB
```

Built as a practical, maintainable MERN application for real-world business management.
