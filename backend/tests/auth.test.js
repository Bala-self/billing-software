const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const Business = require("../models/Business");

// Use in-memory MongoDB from global setup
require("./setup");

describe("Authentication API", () => {
  let businessId;

  beforeEach(async () => {
    const business = await Business.create({
      name: "Test Store",
      email: "test@store.com",
      phone: "9999999999",
      address: { state: "Tamil Nadu", stateCode: "33" },
    });
    businessId = business._id;
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe("POST /api/auth/register", () => {
    it("should register a new business and return Admin token", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          businessName: "New Store",
          businessEmail: "new@store.com",
          businessPhone: "8888888888",
          state: "Kerala",
          ownerName: "Test Owner",
          ownerEmail: "owner@test.com",
          password: "password123",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe("Admin");
      expect(res.body.data.accessToken).toBeDefined();
    });

    it("should reject duplicate owner email", async () => {
      await User.create({
        name: "Existing",
        email: "dup@test.com",
        password: "password123",
        businessId,
        role: "Admin",
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          businessName: "Dup Store",
          businessEmail: "dup@store.com",
          businessPhone: "7777777777",
          state: "Delhi",
          ownerName: "Dup Owner",
          ownerEmail: "dup@test.com",
          password: "password123",
        });

      expect(res.statusCode).toBe(400);
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ businessName: "Incomplete" }); // missing ownerEmail, password etc.

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials and return token", async () => {
      await User.create({
        name: "Login User",
        email: "login@test.com",
        password: "password123",
        businessId,
        role: "Admin",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "login@test.com", password: "password123" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe("login@test.com");
    });

    it("should reject invalid password", async () => {
      await User.create({
        name: "Bad Login",
        email: "bad@test.com",
        password: "password123",
        businessId,
        role: "Admin",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "bad@test.com", password: "wrongpassword" });

      expect(res.statusCode).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@test.com", password: "password123" });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── Health Check ────────────────────────────────────────────────────────

  describe("GET /api/health", () => {
    it("should return 200 with healthy status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
