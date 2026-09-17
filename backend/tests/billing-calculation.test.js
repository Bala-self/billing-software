/**
 * Unit tests: core billing calculation logic (utils/billing.js).
 *
 * These tests verify the GST maths WITHOUT a database or HTTP server —
 * they call the exact same functions the controllers use.
 */

const { calculateLineItem, calculateTotals } = require("../utils/billing");

describe("GST Calculation Engine", () => {
  describe("Intra-State (CGST + SGST) Calculations", () => {
    it("18% GST splits evenly into 9% CGST + 9% SGST", () => {
      const r = calculateLineItem({ unitPrice: 1000, quantity: 1, taxRate: 18, isInterstate: false });
      expect(r.taxableAmount).toBe(1000);
      expect(r.cgstAmount).toBe(90);
      expect(r.sgstAmount).toBe(90);
      expect(r.igstAmount).toBe(0);
      expect(r.total).toBe(1180);
    });

    it("28% GST on 2 units at ₹500", () => {
      const r = calculateLineItem({ unitPrice: 500, quantity: 2, taxRate: 28, isInterstate: false });
      expect(r.taxableAmount).toBe(1000);
      expect(r.cgstAmount).toBe(140);
      expect(r.sgstAmount).toBe(140);
      expect(r.total).toBe(1280);
    });

    it("5% GST on 5 units at ₹200", () => {
      const r = calculateLineItem({ unitPrice: 200, quantity: 5, taxRate: 5, isInterstate: false });
      expect(r.taxableAmount).toBe(1000);
      expect(r.cgstAmount).toBe(25);
      expect(r.sgstAmount).toBe(25);
      expect(r.total).toBe(1050);
    });

    it("0% GST — exempt goods produce no tax", () => {
      const r = calculateLineItem({ unitPrice: 100, quantity: 10, taxRate: 0, isInterstate: false });
      expect(r.taxableAmount).toBe(1000);
      expect(r.cgstAmount).toBe(0);
      expect(r.total).toBe(1000);
    });

    it("12% GST with decimal unit price", () => {
      const r = calculateLineItem({ unitPrice: 99.99, quantity: 3, taxRate: 12, isInterstate: false });
      expect(r.gross).toBeCloseTo(299.97, 2);
      expect(r.total).toBeCloseTo(335.97, 1);
    });
  });

  describe("Inter-State (IGST) Calculations", () => {
    it("18% IGST — no CGST/SGST split", () => {
      const r = calculateLineItem({ unitPrice: 1000, quantity: 1, taxRate: 18, isInterstate: true });
      expect(r.cgstAmount).toBe(0);
      expect(r.sgstAmount).toBe(0);
      expect(r.igstAmount).toBe(180);
      expect(r.total).toBe(1180);
    });

    it("12% IGST on 4 units at ₹500", () => {
      const r = calculateLineItem({ unitPrice: 500, quantity: 4, taxRate: 12, isInterstate: true });
      expect(r.igstAmount).toBe(240);
      expect(r.total).toBe(2240);
    });

    it("28% IGST on luxury item", () => {
      const r = calculateLineItem({ unitPrice: 5000, quantity: 1, taxRate: 28, isInterstate: true });
      expect(r.igstAmount).toBe(1400);
      expect(r.total).toBe(6400);
    });
  });

  describe("Discount Calculations", () => {
    it("Fixed discount reduces taxable base", () => {
      const r = calculateLineItem({
        unitPrice: 1000, quantity: 1, discount: 100, discountType: "FIXED", taxRate: 18, isInterstate: false,
      });
      expect(r.gross).toBe(1000);
      expect(r.discountAmount).toBe(100);
      expect(r.taxableAmount).toBe(900);
      expect(r.cgstAmount).toBe(81);
      expect(r.sgstAmount).toBe(81);
      expect(r.total).toBe(1062);
    });

    it("Percentage discount at 10%", () => {
      const r = calculateLineItem({
        unitPrice: 1000, quantity: 1, discount: 10, discountType: "PERCENTAGE", taxRate: 18, isInterstate: false,
      });
      expect(r.discountAmount).toBe(100);
      expect(r.taxableAmount).toBe(900);
      expect(r.total).toBe(1062);
    });

    it("Percentage discount at 100% — full discount, zero total", () => {
      const r = calculateLineItem({
        unitPrice: 1000, quantity: 1, discount: 100, discountType: "PERCENTAGE", taxRate: 18, isInterstate: false,
      });
      expect(r.taxableAmount).toBe(0);
      expect(r.total).toBe(0);
    });

    it("Fixed discount cannot exceed gross (clamped)", () => {
      const r = calculateLineItem({
        unitPrice: 100, quantity: 1, discount: 9999, discountType: "FIXED", taxRate: 18, isInterstate: false,
      });
      expect(r.discountAmount).toBe(100);
      expect(r.taxableAmount).toBe(0);
      expect(r.total).toBe(0);
    });

    it("Percentage discount cannot exceed 100% (clamped)", () => {
      const r = calculateLineItem({
        unitPrice: 1000, quantity: 1, discount: 150, discountType: "PERCENTAGE", taxRate: 18, isInterstate: false,
      });
      expect(r.discountAmount).toBe(1000);
      expect(r.taxableAmount).toBe(0);
    });

    it("Zero discount — gross equals taxable", () => {
      const r = calculateLineItem({ unitPrice: 500, quantity: 3, taxRate: 5, isInterstate: false });
      expect(r.gross).toBe(1500);
      expect(r.discountAmount).toBe(0);
      expect(r.taxableAmount).toBe(1500);
    });
  });

  describe("Multi-line Invoice Totals", () => {
    it("correctly sums two intra-state line items", () => {
      const items = [
        calculateLineItem({ unitPrice: 1000, quantity: 2, taxRate: 18, isInterstate: false }), // ₹2000 + 18% = ₹2360
        calculateLineItem({ unitPrice: 500, quantity: 1, taxRate: 12, isInterstate: false }),  // ₹500 + 12%  = ₹560
      ];
      const totals = calculateTotals(items);
      expect(totals.subtotal).toBe(2500);
      expect(totals.taxableAmount).toBe(2500);
      expect(totals.grandTotal).toBe(2920);
    });

    it("correctly sums inter-state line items with IGST", () => {
      const items = [
        calculateLineItem({ unitPrice: 1000, quantity: 1, taxRate: 18, isInterstate: true }),
        calculateLineItem({ unitPrice: 500, quantity: 2, taxRate: 5, isInterstate: true }),
      ];
      const totals = calculateTotals(items);
      expect(totals.totalCgst).toBe(0);
      expect(totals.totalSgst).toBe(0);
      expect(totals.totalIgst).toBeGreaterThan(0);
    });

    it("single 0% item — no tax, grand total equals taxable", () => {
      const items = [calculateLineItem({ unitPrice: 200, quantity: 5, taxRate: 0, isInterstate: false })];
      const totals = calculateTotals(items);
      expect(totals.totalTax).toBe(0);
      expect(totals.grandTotal).toBe(totals.taxableAmount);
    });

    it("grand total is rounded to the nearest rupee with roundOff keeping the difference", () => {
      // ₹999.90 taxable at 12% -> ₹59.99 CGST + ₹59.99 SGST = ₹119.98 tax
      // raw total = 999.90 + 119.98 = 1119.88 -> rounds to ₹1120 (roundOff ₹0.12)
      const items = [calculateLineItem({ unitPrice: 99.99, quantity: 10, taxRate: 12, isInterstate: false })];
      const totals = calculateTotals(items);
      expect(totals.grandTotal).toBe(1120);
      expect(totals.roundOff).toBeCloseTo(0.12, 2);
      expect(totals.grandTotal).toBe(Math.round(totals.taxableAmount + totals.totalTax));
    });
  });

  describe("Edge Cases & Precision", () => {
    it("handles fractional quantities correctly", () => {
      const r = calculateLineItem({ unitPrice: 100, quantity: 1.5, taxRate: 18, isInterstate: false });
      expect(r.gross).toBe(150);
      expect(r.total).toBeCloseTo(177, 0);
    });

    it("very small unit price (₹0.01)", () => {
      const r = calculateLineItem({ unitPrice: 0.01, quantity: 1, taxRate: 18, isInterstate: false });
      expect(r.taxableAmount).toBeCloseTo(0.01, 2);
      expect(r.total).toBeGreaterThan(0);
    });

    it("large invoice — ₹1,00,000 at 28% GST", () => {
      const r = calculateLineItem({ unitPrice: 100000, quantity: 1, taxRate: 28, isInterstate: false });
      expect(r.cgstAmount).toBe(14000);
      expect(r.sgstAmount).toBe(14000);
      expect(r.total).toBe(128000);
    });

    it("multi-quantity with percentage discount and GST", () => {
      // 5 units × ₹1000 = ₹5000 gross
      // 20% discount = ₹1000 off -> ₹4000 taxable
      // 18% GST on ₹4000 = ₹720 -> total ₹4720
      const r = calculateLineItem({
        unitPrice: 1000, quantity: 5, discount: 20, discountType: "PERCENTAGE", taxRate: 18, isInterstate: false,
      });
      expect(r.gross).toBe(5000);
      expect(r.discountAmount).toBe(1000);
      expect(r.taxableAmount).toBe(4000);
      expect(r.cgstAmount).toBe(360);
      expect(r.sgstAmount).toBe(360);
      expect(r.total).toBe(4720);
    });
  });
});
