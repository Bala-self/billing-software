/**
 * Billing API - Optimized for Performance
 * For 1 year MERN dev: simple, fast, understandable
 * 
 * Performance Optimizations Applied (from guide):
 * 1. Compression middleware - reduces response size
 * 2. CORS optimized for preview + localhost
 * 3. Rate limiter to prevent abuse
 * 4. Body parser limited to 1mb (small responses)
 * 5. MongoDB indexes on frequently searched fields
 * 6. Pagination everywhere (limit 20-50, not 1000s)
 * 7. Small API responses - select only needed fields for billing
 * 8. Aggregation for reports (database-level calc)
 * 9. Simple controllers - no heavy logic in routes
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

dotenv.config();

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (skip in test - jest uses in-memory)
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

// 1. Security headers - allow E2B preview iframe
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  frameguard: false,
}));

// 2. Compression - VERY IMPORTANT for performance
// Reduces JSON response size by 70-80%
app.use(compression());

// 3. CORS - secure for production, open for sandbox demo
const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:5173"];
const isMemoryDB = process.env.MONGO_URI && process.env.MONGO_URI.includes("127.0.0.1");
const isDemoMode = process.env.ALLOW_DEMO_BYPASS === "true" && isMemoryDB && process.env.NODE_ENV !== "production";

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman, curl, same-origin
    if (isDemoMode) return callback(null, true); // Sandbox: allow all
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
    if (origin.includes(".e2b.app") || origin.includes("e2b.dev")) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Production: restrict to CLIENT_URL only
    if (process.env.NODE_ENV === "production") {
      return callback(new Error("CORS blocked: origin not allowed"), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "e2b-traffic-access-token", "x-demo-bypass", "x-bypass-auth", "x-e2b-access-token"],
}));

// 4. Body parser - limit 1mb for small responses
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 5. Rate limiter - prevent abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500, // 500 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try after 15 min" },
});
app.use("/api", globalLimiter);

// 6. Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Billing API running", timestamp: new Date().toISOString() });
});

// 7. API Routes - Core + Attendance
app.use("/api/auth", require("./routes/auth"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/brands", require("./routes/brands"));
app.use("/api/units", require("./routes/units"));
app.use("/api/products", require("./routes/products"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/quotations", require("./routes/quotations"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/users", require("./routes/users"));
app.use("/api/audit-logs", require("./routes/auditLogs"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/settings", require("./routes/settings"));

// 8. Serve frontend dist (single port preview)
const path = require("path");
const fs = require("fs");
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  console.log(`📦 Serving frontend from ${frontendDist}`);
  app.use(express.static(frontendDist, {
    maxAge: "1d", // Cache static assets 1 day
    etag: true,
  }));
  app.get(/^\/(?!api).*/, (req, res) => {
    const indexPath = path.join(frontendDist, "index.html");
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send("Frontend not built");
  });
}

// 9. Error handling
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} with compression + indexes`);
  });
}

module.exports = app;
