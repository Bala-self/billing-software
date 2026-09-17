/**
 * Integration tests: full billing flow over HTTP (supertest + in-memory MongoDB).
 *
 * Covers: auth guards, role-based access, product/customer/supplier CRUD,
 * invoice creation (intra + inter state GST, stock, customer balances),
 * invoice cancellation, purchases, sales & purchase returns (including the
 * partially-paid edge cases), quotation conversion, reports and dashboard.
 */

const request = require("supertest");
const app = require("../index");
const Product = require("../models/Product");
const Customer = require("../models/Customer");

require("./setup");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const registerBusiness = async (suffix) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      businessName: `Test Store ${suffix}`,
      businessEmail: `store${suffix}@test.com`,
      businessPhone: "9000000001",
      state: "Tamil Nadu",
      ownerName: `Owner ${suffix}`,
      ownerEmail: `owner${suffix}@test.com`,
      password: "password123",
    });

  expect(res.statusCode).toBe(201);
  return res.body.data.accessToken;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const makeProduct = async (token, businessId, over = {}) => {
  const res = await request(app)
    .post("/api/products")
    .set(auth(token))
    .send({
      name: `Widget ${Math.random().toString(36).slice(2, 8)}`,
      sku: `SKU-${Math.floor(Math.random() * 100000)}`,
      sellingPrice: 1000,
      purchasePrice: 800,
      taxRate: 18,
      stock: 100,
      ...over,
    });

  expect(res.statusCode).toBe(201);
  return res.body.data;
};

const makeCustomer = async (token, businessId, state = "Tamil Nadu") => {
  const res = await request(app)
    .post("/api/customers")
    .set(auth(token))
    .send({
      name: `Customer ${Math.random().toString(36).slice(2, 8)}`,
      phone: "9880000000",
      billingAddress: {
        street: "1 Main Road",
        city: "Chennai",
        state,
        pincode: "600001",
      },
    });

  expect(res.statusCode).toBe(201);
  return res.body.data;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Auth guards", () => {
  it("rejects API calls without a token (401)", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(401);
  });

  it("rejects API calls with an invalid token (401)", async () => {
    const res = await request(app).get("/api/invoices").set(auth("garbage.token.here"));
    expect(res.statusCode).toBe(401);
  });
});

describe("Role-based access control", () => {
  it("Cashier can view products but not create them", async () => {
    const adminToken = await registerBusiness("rbac");

    // Admin creates a Cashier staff user
    const userRes = await request(app)
      .post("/api/users")
      .set(auth(adminToken))
      .send({
        name: "Cashy Cashier",
        email: "cashier@test.com",
        password: "password123",
        role: "Cashier",
      });
    expect(userRes.statusCode).toBe(201);

    // Cashier logs in
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "cashier@test.com", password: "password123" });
    expect(loginRes.statusCode).toBe(200);
    const cashierToken = loginRes.body.data.accessToken;

    // View is allowed, create is not
    const viewRes = await request(app).get("/api/products").set(auth(cashierToken));
    expect(viewRes.statusCode).toBe(200);

    const createRes = await request(app)
      .post("/api/products")
      .set(auth(cashierToken))
      .send({ name: "Nope", sellingPrice: 100, taxRate: 18 });
    expect(createRes.statusCode).toBe(403);
  });
});

describe("Product CRUD", () => {
  it("creates, updates and lists products; recomputes stock status", async () => {
    const token = await registerBusiness("prod");

    const created = await makeProduct(token, "x", { sku: "SKU-A1", name: "Laptop" });
    expect(created.status).toBe("In Stock");

    // Edit stock down to the low-stock threshold
    const updateRes = await request(app)
      .put(`/api/products/${created._id}`)
      .set(auth(token))
      .send({ stock: 5 });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.status).toBe("Low Stock");

    // Duplicate SKU is rejected
    const dupRes = await request(app)
      .post("/api/products")
      .set(auth(token))
      .send({ name: "Laptop 2", sku: "SKU-A1", sellingPrice: 100, taxRate: 18 });
    expect(dupRes.statusCode).toBe(400);

    // Listing returns the product
    const listRes = await request(app).get("/api/products").set(auth(token));
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.products.length).toBe(1);
  });

  it("allows multiple products without a barcode, but enforces unique barcodes", async () => {
    const token = await registerBusiness("barcode");

    // Several products with no barcode must all succeed
    // (with the old "sparse" compound index, the second one failed with a
    // duplicate key error on barcode: null)
    const a = await makeProduct(token, "x", { sku: "SKU-BC1" });
    const b = await makeProduct(token, "x", { sku: "SKU-BC2" });
    expect(a._id).toBeTruthy();
    expect(b._id).toBeTruthy();

    // A real duplicate barcode is still rejected
    await request(app)
      .post("/api/products")
      .set(auth(token))
      .send({ name: "With Barcode", sku: "SKU-BC3", barcode: "8901234567890", sellingPrice: 100, taxRate: 18 });

    const dup = await request(app)
      .post("/api/products")
      .set(auth(token))
      .send({ name: "Dup Barcode", sku: "SKU-BC4", barcode: "8901234567890", sellingPrice: 100, taxRate: 18 });
    expect(dup.statusCode).toBe(400);
  });

  it("does not let the client flip isActive or reassign businessId", async () => {
    const token = await registerBusiness("prodtamper");

    const created = await makeProduct(token, "x", { sku: "SKU-B1", stock: 10 });

    // A crafted payload that tries to deactivate the product and steal it
    // into another business
    const res = await request(app)
      .put(`/api/products/${created._id}`)
      .set(auth(token))
      .send({
        name: "Laptop renamed",
        isActive: false,
        businessId: "64b1f2c0e5a1a2b3c4d5e6f7",
      });

    expect(res.statusCode).toBe(200);
    const saved = res.body.data;
    expect(saved.isActive).toBe(true); // still active
    expect(saved.name).toBe("Laptop renamed"); // normal field updated

    // It is still listed under OUR business
    const listRes = await request(app).get("/api/products").set(auth(token));
    expect(listRes.body.data.products.length).toBe(1);
  });
});

describe("Customer CRUD", () => {
  it("creates customers and validates required GST fields", async () => {
    const token = await registerBusiness("cust");

    const ok = await makeCustomer(token, "x", "Tamil Nadu");
    expect(ok.name).toBeTruthy();

    // billingAddress.state is required for GST rules
    const badRes = await request(app)
      .post("/api/customers")
      .set(auth(token))
      .send({ name: "No State Customer", billingAddress: { city: "Chennai" } });
    expect(badRes.statusCode).toBe(400);
  });
});

describe("Invoice creation — GST engine, stock & balances", () => {
  it("calculates intra-state CGST/SGST, reduces stock, adds due to customer", async () => {
    const token = await registerBusiness("inv1");

    const p1 = await makeProduct(token, "x", { sku: "SKU-C1", sellingPrice: 1000, taxRate: 18, stock: 100 });
    const p2 = await makeProduct(token, "x", { sku: "SKU-C2", sellingPrice: 500, taxRate: 5, stock: 50 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu"); // same state as business

    const res = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({
        customerId: customer._id,
        items: [
          { productId: p1._id, quantity: 10 }, // 10000 taxable, 18% -> 900 + 900
          { productId: p2._id, quantity: 4 },  // 2000 taxable, 5%  -> 50 + 50
        ],
      });

    expect(res.statusCode).toBe(201);
    const inv = res.body.data;

    expect(inv.subtotal).toBe(12000);
    expect(inv.taxableAmount).toBe(12000);
    expect(inv.totalCgst).toBe(950);
    expect(inv.totalSgst).toBe(950);
    expect(inv.totalIgst).toBe(0);
    expect(inv.totalTax).toBe(1900);
    expect(inv.grandTotal).toBe(13900);
    expect(inv.status).toBe("Unpaid");
    expect(inv.dueAmount).toBe(13900);

    // Stock reduced
    const p1After = await Product.findById(p1._id);
    const p2After = await Product.findById(p2._id);
    expect(p1After.stock).toBe(90);
    expect(p2After.stock).toBe(46);

    // Customer now owes us the full due
    const custAfter = await Customer.findById(customer._id);
    expect(custAfter.outstandingBalance).toBe(13900);
  });

  it("charges IGST for interstate sales and supports partial payment", async () => {
    const token = await registerBusiness("inv2");

    const p1 = await makeProduct(token, "x", { sku: "SKU-D1", sellingPrice: 1000, taxRate: 18, stock: 100 });
    const customer = await makeCustomer(token, "x", "Karnataka"); // different state

    const res = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({
        customerId: customer._id,
        items: [{ productId: p1._id, quantity: 2 }], // 2000 taxable, IGST 18% = 360
        paidAmount: 1000,
      });

    expect(res.statusCode).toBe(201);
    const inv = res.body.data;

    expect(inv.isInterstate).toBe(true);
    expect(inv.totalIgst).toBe(360);
    expect(inv.totalCgst).toBe(0);
    expect(inv.totalSgst).toBe(0);
    expect(inv.grandTotal).toBe(2360);
    expect(inv.paidAmount).toBe(1000);
    expect(inv.dueAmount).toBe(1360);
    expect(inv.status).toBe("Partially Paid");

    const custAfter = await Customer.findById(customer._id);
    expect(custAfter.outstandingBalance).toBe(1360);
  });

  it("rejects an invoice that exceeds available stock", async () => {
    const token = await registerBusiness("inv3");
    const p1 = await makeProduct(token, "x", { sku: "SKU-E1", stock: 5 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    const res = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 100 }] });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);
  });
});

describe("PDF generation", () => {
  it("streams an invoice PDF (application/pdf)", async () => {
    const token = await registerBusiness("pdf");
    const p1 = await makeProduct(token, "x", { sku: "SKU-P1", stock: 10 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    const created = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 2 }] });
    expect(created.statusCode).toBe(201);
    const invoiceId = created.body.data._id;

    const res = await request(app)
      .get(`/api/invoices/${invoiceId}/pdf`)
      .set(auth(token));

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("Invoice-");
    // A real PDF starts with the %PDF magic bytes
    expect(res.body.slice(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("streams a quotation PDF (application/pdf)", async () => {
    const token = await registerBusiness("pdfq");
    const p1 = await makeProduct(token, "x", { sku: "SKU-P2", stock: 10 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    const created = await request(app)
      .post("/api/quotations")
      .set(auth(token))
      .send({
        customerId: customer._id,
        items: [{ productId: p1._id, quantity: 2 }],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(created.statusCode).toBe(201);
    const quotationId = created.body.data._id;

    const res = await request(app)
      .get(`/api/quotations/${quotationId}/pdf`)
      .set(auth(token));

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.body.slice(0, 4).toString("latin1")).toBe("%PDF");
  });
});

describe("Invoice cancellation", () => {
  it("restores stock and reverses the customer balance", async () => {
    const token = await registerBusiness("inv4");
    const p1 = await makeProduct(token, "x", { sku: "SKU-F1", stock: 10 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    const created = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 4 }] });
    expect(created.statusCode).toBe(201);
    const invoiceId = created.body.data._id;

    const cancelRes = await request(app)
      .put(`/api/invoices/${invoiceId}/cancel`)
      .set(auth(token));
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.status).toBe("Cancelled");

    const p1After = await Product.findById(p1._id);
    const custAfter = await Customer.findById(customer._id);
    expect(p1After.stock).toBe(10);
    expect(custAfter.outstandingBalance).toBe(0);

    // Cancelling twice is rejected
    const again = await request(app)
      .put(`/api/invoices/${invoiceId}/cancel`)
      .set(auth(token));
    expect(again.statusCode).toBe(400);
  });
});

describe("Purchases — stock in & supplier payable", () => {
  it("adds stock, updates purchase cost and supplier payable; cancel reverses it", async () => {
    const token = await registerBusiness("pur");

    // Supplier
    const supRes = await request(app)
      .post("/api/suppliers")
      .set(auth(token))
      .send({ name: "Acme Distributors", phone: "9770000000", address: { state: "Tamil Nadu" } });
    expect(supRes.statusCode).toBe(201);
    const supplier = supRes.body.data;

    const p1 = await makeProduct(token, "x", { sku: "SKU-G1", stock: 0, purchasePrice: 800 });

    const purRes = await request(app)
      .post("/api/purchases")
      .set(auth(token))
      .send({
        supplierId: supplier._id,
        items: [{ productId: p1._id, quantity: 20, unitCost: 750 }], // 15000 taxable, 18% -> 2700 tax
        paymentMethod: "Credit",
      });
    expect(purRes.statusCode).toBe(201);
    const purchase = purRes.body.data;

    expect(purchase.subtotal).toBe(15000);
    expect(purchase.totalTax).toBe(2700);
    expect(purchase.grandTotal).toBe(17700);
    expect(purchase.paymentStatus).toBe("Unpaid");

    const p1After = await Product.findById(p1._id);
    expect(p1After.stock).toBe(20);
    expect(p1After.purchasePrice).toBe(750); // latest cost

    const supAfter = await request(app).get(`/api/suppliers/${supplier._id}`).set(auth(token));
    expect(supAfter.body.data.payableBalance).toBe(17700);

    // Cancel the purchase
    const cancelRes = await request(app)
      .put(`/api/purchases/${purchase._id}/cancel`)
      .set(auth(token));
    expect(cancelRes.statusCode).toBe(200);

    const p1Final = await Product.findById(p1._id);
    const supFinal = await request(app).get(`/api/suppliers/${supplier._id}`).set(auth(token));
    expect(p1Final.stock).toBe(0);
    expect(supFinal.body.data.payableBalance).toBe(0);
  });
});

describe("Sales returns — refund, stock, and the partially-paid edge case", () => {
  const setup = async (suffix, paidAmount) => {
    const token = await registerBusiness(suffix);
    const p1 = await makeProduct(token, "x", { sku: `SKU-H${suffix}`, stock: 100, sellingPrice: 1000, taxRate: 18 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    const invRes = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({
        customerId: customer._id,
        items: [{ productId: p1._id, quantity: 10 }], // grand 11800
        paidAmount: paidAmount || 0,
      });
    expect(invRes.statusCode).toBe(201);

    return { token, p1, customer, invoice: invRes.body.data };
  };

  it("refund on an unpaid invoice reduces due amount and customer balance", async () => {
    const { token, p1, customer, invoice } = await setup("sr1", 0);

    const res = await request(app)
      .post("/api/sales-returns")
      .set(auth(token))
      .send({
        invoiceId: invoice._id,
        items: [{ productId: p1._id, quantity: 4 }], // 4000 taxable, 18% -> 720, refund 4720
        returnReason: "Damaged in transit",
      });

    expect(res.statusCode).toBe(201);
    const ret = res.body.data;
    expect(ret.refundAmount).toBe(4720);

    const invAfter = await request(app).get(`/api/invoices/${invoice._id}`).set(auth(token));
    expect(invAfter.body.data.dueAmount).toBe(7080);
    expect(invAfter.body.data.grandTotal).toBe(7080);

    const custAfter = await Customer.findById(customer._id);
    expect(custAfter.outstandingBalance).toBe(7080);

    const p1After = await Product.findById(p1._id);
    expect(p1After.stock).toBe(94); // 100 - 10 sold + 4 returned
  });

  it("refund on a partially-paid invoice never double-counts the payable", async () => {
    const { token, p1, customer, invoice } = await setup("sr2", 5000);
    // Invoice: paid 5000, due 6800, grand 11800; customer owes 6800

    const res = await request(app)
      .post("/api/sales-returns")
      .set(auth(token))
      .send({
        invoiceId: invoice._id,
        items: [{ productId: p1._id, quantity: 4 }],
        returnReason: "Wrong item delivered",
      });
    expect(res.statusCode).toBe(201);

    // Refund 4720 fits fully into the due part: due 6800 -> 2080, paid stays 5000
    const invAfter = await request(app).get(`/api/invoices/${invoice._id}`).set(auth(token));
    expect(invAfter.body.data.dueAmount).toBe(2080);
    expect(invAfter.body.data.paidAmount).toBe(5000);
    expect(invAfter.body.data.grandTotal).toBe(7080);
    expect(invAfter.body.data.status).toBe("Partially Paid");

    const custAfter = await Customer.findById(customer._id);
    expect(custAfter.outstandingBalance).toBe(2080);

    // Cancel the return — everything must come back exactly
    const cancelRes = await request(app)
      .put(`/api/sales-returns/${res.body.data._id}/cancel`)
      .set(auth(token));
    expect(cancelRes.statusCode).toBe(200);

    const invFinal = await request(app).get(`/api/invoices/${invoice._id}`).set(auth(token));
    expect(invFinal.body.data.dueAmount).toBe(6800);
    expect(invFinal.body.data.paidAmount).toBe(5000);
    expect(invFinal.body.data.grandTotal).toBe(11800);

    const custFinal = await Customer.findById(customer._id);
    expect(custFinal.outstandingBalance).toBe(6800);

    const p1Final = await Product.findById(p1._id);
    expect(p1Final.stock).toBe(90);
  });

  it("refund on a fully-paid invoice creates a customer advance (credit note)", async () => {
    const { token, p1, customer, invoice } = await setup("sr3", 11800);
    // Invoice fully paid: paid 11800, due 0, customer owes 0

    const res = await request(app)
      .post("/api/sales-returns")
      .set(auth(token))
      .send({
        invoiceId: invoice._id,
        items: [{ productId: p1._id, quantity: 4 }],
        returnReason: "Customer changed mind",
        refundMethod: "Cash",
      });
    expect(res.statusCode).toBe(201);

    const invAfter = await request(app).get(`/api/invoices/${invoice._id}`).set(auth(token));
    expect(invAfter.body.data.paidAmount).toBe(7080);
    expect(invAfter.body.data.dueAmount).toBe(0);
    expect(invAfter.body.data.grandTotal).toBe(7080);
    expect(invAfter.body.data.status).toBe("Paid");

    // Customer has an advance of 4720 with us
    const custAfter = await Customer.findById(customer._id);
    expect(custAfter.outstandingBalance).toBe(-4720);
  });

  it("rejects returning more than the original quantity", async () => {
    const { token, p1, invoice } = await setup("sr4", 0);

    const res = await request(app)
      .post("/api/sales-returns")
      .set(auth(token))
      .send({
        invoiceId: invoice._id,
        items: [{ productId: p1._id, quantity: 11 }], // only 10 were sold
        returnReason: "Too many",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Maximum returnable/i);
  });
});

describe("Purchase returns", () => {
  it("deducts stock, adjusts supplier payable; cancel restores everything", async () => {
    const token = await registerBusiness("pr");

    const supRes = await request(app)
      .post("/api/suppliers")
      .set(auth(token))
      .send({ name: "Beta Wholesale", phone: "9660000000", address: { state: "Tamil Nadu" } });
    const supplier = supRes.body.data;

    const p1 = await makeProduct(token, "x", { sku: "SKU-I1", stock: 0 });

    // Buy 20 @ 750 and pay in full
    const purRes = await request(app)
      .post("/api/purchases")
      .set(auth(token))
      .send({
        supplierId: supplier._id,
        items: [{ productId: p1._id, quantity: 20, unitCost: 750 }],
        paidAmount: 17700,
      });
    expect(purRes.statusCode).toBe(201);
    const purchase = purRes.body.data;
    expect(purchase.paymentStatus).toBe("Paid");

    // Return 5 units: 3750 taxable, 18% -> 675, refund 4425
    const retRes = await request(app)
      .post("/api/purchase-returns")
      .set(auth(token))
      .send({
        purchaseId: purchase._id,
        items: [{ productId: p1._id, quantity: 5 }],
        returnReason: "Defective batch",
      });
    expect(retRes.statusCode).toBe(201);
    const ret = retRes.body.data;
    expect(ret.refundAmount).toBe(4425);

    const p1After = await Product.findById(p1._id);
    expect(p1After.stock).toBe(15);

    const supAfter = await request(app).get(`/api/suppliers/${supplier._id}`).set(auth(token));
    expect(supAfter.body.data.payableBalance).toBe(-4425); // supplier owes us the refund

    const purAfter = await request(app).get(`/api/purchases/${purchase._id}`).set(auth(token));
    expect(purAfter.body.data.grandTotal).toBe(13275);
    expect(purAfter.body.data.paidAmount).toBe(13275);

    // Cancel the return
    const cancelRes = await request(app)
      .put(`/api/purchase-returns/${ret._id}/cancel`)
      .set(auth(token));
    expect(cancelRes.statusCode).toBe(200);

    const p1Final = await Product.findById(p1._id);
    const supFinal = await request(app).get(`/api/suppliers/${supplier._id}`).set(auth(token));
    const purFinal = await request(app).get(`/api/purchases/${purchase._id}`).set(auth(token));
    expect(p1Final.stock).toBe(20);
    expect(supFinal.body.data.payableBalance).toBe(0);
    expect(purFinal.body.data.grandTotal).toBe(17700);
    expect(purFinal.body.data.paidAmount).toBe(17700);
  });

  it("rejects a purchase return when we no longer have the stock", async () => {
    const token = await registerBusiness("pr2");

    const supRes = await request(app)
      .post("/api/suppliers")
      .set(auth(token))
      .send({ name: "Gamma Traders", phone: "9550000000", address: { state: "Tamil Nadu" } });
    const supplier = supRes.body.data;

    const p1 = await makeProduct(token, "x", { sku: "SKU-J1", stock: 0 });

    const purRes = await request(app)
      .post("/api/purchases")
      .set(auth(token))
      .send({
        supplierId: supplier._id,
        items: [{ productId: p1._id, quantity: 2, unitCost: 750 }],
      });
    const purchase = purRes.body.data;

    // Sell the 2 units out first
    const customer = await makeCustomer(token, "x", "Tamil Nadu");
    const invRes = await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 2 }] });
    expect(invRes.statusCode).toBe(201);

    // Now we cannot send the goods back — stock is 0
    const retRes = await request(app)
      .post("/api/purchase-returns")
      .set(auth(token))
      .send({
        purchaseId: purchase._id,
        items: [{ productId: p1._id, quantity: 2 }],
        returnReason: "Too late",
      });
    expect(retRes.statusCode).toBe(400);
    expect(retRes.body.message).toMatch(/Insufficient stock/i);
  });
});

describe("Quotations — full lifecycle to invoice", () => {
  it("draft -> sent -> accepted -> converted (deducts stock, links invoice)", async () => {
    const token = await registerBusiness("qtn");

    const p1 = await makeProduct(token, "x", { sku: "SKU-K1", stock: 50, sellingPrice: 1000, taxRate: 18 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post("/api/quotations")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 5 }], validUntil });
    expect(createRes.statusCode).toBe(201);
    const q = createRes.body.data;
    expect(q.grandTotal).toBe(5900); // 5000 + 18%
    expect(q.status).toBe("Draft");

    const sendRes = await request(app).put(`/api/quotations/${q._id}/send`).set(auth(token));
    expect(sendRes.statusCode).toBe(200);

    const acceptRes = await request(app).put(`/api/quotations/${q._id}/accept`).set(auth(token));
    expect(acceptRes.statusCode).toBe(200);

    const convertRes = await request(app).post(`/api/quotations/${q._id}/convert`).set(auth(token));
    expect(convertRes.statusCode).toBe(201);
    expect(convertRes.body.data.quotation.status).toBe("Converted");
    expect(convertRes.body.data.invoice.invoiceNumber).toMatch(/^INV-/);

    const p1After = await Product.findById(p1._id);
    const custAfter = await Customer.findById(customer._id);
    expect(p1After.stock).toBe(45);
    expect(custAfter.outstandingBalance).toBe(5900);

    // Converting twice is rejected
    const again = await request(app).post(`/api/quotations/${q._id}/convert`).set(auth(token));
    expect(again.statusCode).toBe(400);
  });
});

describe("Reports API (wired to reportController)", () => {
  it("serves sales, P&L, GST, inventory and outstanding reports to Admin", async () => {
    const token = await registerBusiness("rep");
    const p1 = await makeProduct(token, "x", { sku: "SKU-L1", stock: 10, sellingPrice: 1000, purchasePrice: 800, taxRate: 18 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 3 }] });

    for (const path of ["/sales", "/profit-loss", "/gst", "/inventory", "/outstanding", "/purchases"]) {
      const res = await request(app).get(`/api/reports${path}`).set(auth(token));
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it("blocks reports for users without the reports permission", async () => {
    const adminToken = await registerBusiness("rep2");

    const userRes = await request(app)
      .post("/api/users")
      .set(auth(adminToken))
      .send({ name: "Viewer V", email: "viewer@test.com", password: "password123", role: "Viewer" });
    expect(userRes.statusCode).toBe(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "viewer@test.com", password: "password123" });
    const viewerToken = loginRes.body.data.accessToken;

    const res = await request(app).get("/api/reports/sales").set(auth(viewerToken));
    expect(res.statusCode).toBe(403);
  });
});

describe("Dashboard", () => {
  it("returns today/balances/counts/chart/feeds with real data", async () => {
    const token = await registerBusiness("dash");
    const p1 = await makeProduct(token, "x", { sku: "SKU-M1", stock: 3, sellingPrice: 2000, taxRate: 18 });
    const customer = await makeCustomer(token, "x", "Tamil Nadu");

    await request(app)
      .post("/api/invoices")
      .set(auth(token))
      .send({ customerId: customer._id, items: [{ productId: p1._id, quantity: 2 }] });

    const res = await request(app).get("/api/dashboard").set(auth(token));
    expect(res.statusCode).toBe(200);

    const data = res.body.data;
    expect(data.today.sales).toBe(4720); // 4000 + 18%
    expect(data.balances.totalReceivables).toBe(4720);
    expect(data.counts.products).toBe(1);
    expect(data.feeds.lowStockAlerts.length).toBe(1); // 3 left, min 5
    expect(data.chartData.sevenDaysTrend.length).toBe(7);
  });
});
