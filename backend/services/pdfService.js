const PDFDocument = require("pdfkit");
const numberToWords = require("../utils/numberToWords");

/**
 * Generate Invoice PDF Stream
 * Streams an A4 GST Tax Invoice PDF directly to the Express response object
 */
exports.generateInvoicePDF = (invoice, business, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  const primaryColor = "#000000";
  const darkColor = "#111111";
  const grayColor = "#444444";
  const lightBg = "#ffffff";

  let y = 40;

  // ============================================================
  // 1. HEADER — Business Name + Invoice Label
  // ============================================================
  doc
    .fontSize(15)
    .fillColor(primaryColor)
    .font("Helvetica-Bold")
    .text(business.name.toUpperCase(), 40, y, { width: 300 });

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("TAX INVOICE", 400, y, { align: "right" });

  y += 22;

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(grayColor)
    .text(
      `${business.address?.street || ""} ${business.address?.city || ""}`.trim(),
      40,
      y,
    )
    .text(
      `Opens: ${business.address?.state || ""} - ${business.address?.pincode || ""}`,
      40,
      y + 10,
    )
    .text(`Email: ${business.email || ""}`, 40, y + 20)
    .text(`Contact Number: ${business.phone || ""}`, 40, y + 30)
    .text(`GSTIN: ${business.taxInfo?.gstin || "Not registered"}`, 40, y + 40);

  doc
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text(`Invoice No: ${invoice.invoiceNumber}`, 350, y + 4, {
      align: "right",
    })
    .font("Helvetica")
    .text(
      `Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`,
      350,
      y + 18,
      { align: "right" },
    )
    .text(
      `GST Type: ${invoice.isInterstate ? "IGST" : "CGST + SGST"}`,
      350,
      y + 32,
      { align: "right" },
    );

  y += 64;
  doc.moveTo(40, y).lineTo(555, y).strokeColor("#999999").stroke();
  y += 10;

  // ============================================================
  // 2. BILL TO / PLACE OF SUPPLY
  // ============================================================
  const customer = invoice.customerSnapshot || {};
  const cAddr = customer.billingAddress || {};

  doc.rect(40, y, 515, 58).fillAndStroke(lightBg, "#999999");

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("BILL TO", 50, y + 8)
    .text(customer.name || "Walk-in Customer", 50, y + 20)
    .font("Helvetica")
    .fillColor(grayColor)
    .text(
      `${cAddr.street || ""} ${cAddr.city || ""}, ${cAddr.state || ""}`.trim(),
      50,
      y + 32,
    )
    .text(`Contact Number: ${customer.phone || "N/A"}`, 50, y + 44);

  doc
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("GSTIN", 360, y + 8)
    .font("Helvetica")
    .fillColor(grayColor)
    .text(customer.gstin || "-", 360, y + 20)
    .text(
      `State: ${cAddr.state || business.address?.state || "N/A"}`,
      360,
      y + 32,
    );

  y += 75;

  // ============================================================
  // 3. ITEMS TABLE — Header Row
  // ============================================================
  doc.rect(40, y, 515, 28).fillAndStroke(primaryColor, primaryColor);

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("DESCRIPTION", 50, y + 9, { width: 250 })
    .text("QTY", 300, y + 9, { width: 45, align: "center" })
    .text("GST", 350, y + 9, { width: 80, align: "center" })
    .text("TOTAL", 445, y + 9, { width: 100, align: "right" });

  y += 30;

  // ============================================================
  // 4. ITEMS TABLE — Data Rows
  // ============================================================
  let index = 1;
  doc.font("Helvetica").fontSize(8);

  for (const item of invoice.items) {
    if (y > 700) {
      doc.addPage({ size: "A4", margin: 40 });
      y = 40;
    }

    const rowBg = index % 2 === 0 ? "#f5f5f5" : "#ffffff";
    doc.rect(40, y, 515, 26).fillAndStroke(rowBg, "#999999");

    doc
      .fillColor(darkColor)
      .text(item.name, 50, y + 8, { width: 250, ellipsis: true })
      .text(String(item.quantity), 300, y + 8, { width: 45, align: "center" })
      .text(`${item.taxRate}%`, 350, y + 8, { width: 80, align: "center" })
      .text(`Rs.${item.taxableAmount.toFixed(2)}`, 445, y + 8, {
        width: 100,
        align: "right",
      });

    y += 26;
    index++;
  }

  const gstLabel = invoice.isInterstate ? "IGST" : "CGST + SGST";
  doc.rect(40, y, 515, 24).fillAndStroke("#ffffff", "#999999");
  doc
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text(gstLabel, 350, y + 8, { width: 80, align: "center" })
    .text(`Rs.${invoice.totalTax.toFixed(2)}`, 445, y + 8, {
      width: 100,
      align: "right",
    });
  y += 34;

  y += 10;

  // ============================================================
  // 5. SUMMARY — Amount in Words + Tax Breakdown + Grand Total
  // ============================================================
  const summaryStartY = y;

  // Left: Amount in words + payment info
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("Total Amount (in words):", 40, summaryStartY)
    .font("Helvetica-Oblique")
    .fillColor(darkColor)
    .text(numberToWords(invoice.grandTotal), 40, summaryStartY + 12, {
      width: 280,
    })
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("Payment Mode:", 40, summaryStartY + 40)
    .font("Helvetica")
    .text(
      `${invoice.paymentMethod} (Paid: Rs.${invoice.paidAmount.toFixed(2)} | Balance Due: Rs.${invoice.dueAmount.toFixed(2)})`,
      110,
      summaryStartY + 40,
    );

  // Right: Numeric breakdown
  const rightBoxX = 350;
  const valX = 475;
  const valWidth = 75;
  let rY = summaryStartY;

  doc.fontSize(8).font("Helvetica").fillColor(darkColor);

  doc
    .text("Subtotal:", rightBoxX, rY)
    .text(`Rs.${invoice.subtotal.toFixed(2)}`, valX, rY, {
      width: valWidth,
      align: "right",
    });
  rY += 14;

  if (invoice.totalDiscount > 0) {
    doc
      .text("Discount:", rightBoxX, rY)
      .text(`- Rs.${invoice.totalDiscount.toFixed(2)}`, valX, rY, {
        width: valWidth,
        align: "right",
      });
    rY += 14;
  }

  doc
    .text("Taxable Value:", rightBoxX, rY)
    .text(`Rs.${invoice.taxableAmount.toFixed(2)}`, valX, rY, {
      width: valWidth,
      align: "right",
    });
  rY += 14;

  if (invoice.isInterstate) {
    doc
      .text("IGST:", rightBoxX, rY)
      .text(`Rs.${invoice.totalIgst.toFixed(2)}`, valX, rY, {
        width: valWidth,
        align: "right",
      });
    rY += 14;
  } else {
    doc
      .text("CGST:", rightBoxX, rY)
      .text(`Rs.${invoice.totalCgst.toFixed(2)}`, valX, rY, {
        width: valWidth,
        align: "right",
      });
    rY += 14;
    doc
      .text("SGST:", rightBoxX, rY)
      .text(`Rs.${invoice.totalSgst.toFixed(2)}`, valX, rY, {
        width: valWidth,
        align: "right",
      });
    rY += 14;
  }

  if (invoice.roundOff !== 0) {
    doc
      .text("Round Off:", rightBoxX, rY)
      .text(
        `${invoice.roundOff > 0 ? "+" : ""}Rs.${invoice.roundOff.toFixed(2)}`,
        valX,
        rY,
        { width: valWidth, align: "right" },
      );
    rY += 14;
  }

  // Grand Total Bar
  doc.rect(rightBoxX, rY, 205, 20).fillAndStroke(primaryColor, primaryColor);
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("GRAND TOTAL:", rightBoxX + 8, rY + 5)
    .text(`Rs.${invoice.grandTotal.toFixed(2)}`, valX, rY + 5, {
      width: valWidth,
      align: "right",
    });

  y = Math.max(summaryStartY + 80, rY + 30);

  // ============================================================
  // 6. TERMS & SIGNATURE
  // ============================================================
  doc.moveTo(40, y).lineTo(555, y).strokeColor("#999999").stroke();
  y += 12;

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("Terms & Conditions:", 40, y)
    .font("Helvetica")
    .fillColor(grayColor)
    .text(
      invoice.termsAndConditions ||
        "1. Goods once sold will not be taken back without original invoice.\n2. All disputes are subject to local jurisdiction only.",
      40,
      y + 12,
      { width: 300 },
    );

  doc
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text(`For ${business.name}`, 400, y, { align: "right" })
    .font("Helvetica")
    .text("Authorized Signatory", 400, y + 45, { align: "right" });

  doc.end();
};

/**
 * Generate Quotation / Estimate PDF Stream
 * Streams an A4 formal quotation PDF directly to the Express response object
 */
exports.generateQuotationPDF = (quotation, business, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  const primaryColor = "#0284c7"; // Sky-600 for Quotations
  const darkColor = "#1e293b";
  const grayColor = "#64748b";

  let y = 40;

  // Header
  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .font("Helvetica-Bold")
    .text(business.name.toUpperCase(), 40, y);

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("FORMAL QUOTATION", 400, y, { align: "right" });

  y += 24;

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(grayColor)
    .text(`State: ${business.address?.state || ""}`, 40, y)
    .text(
      `Phone: ${business.phone || ""} | Email: ${business.email || ""}`,
      40,
      y + 10,
    )
    .text(`GSTIN: ${business.taxInfo?.gstin || "URP"}`, 40, y + 20);

  doc
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text(`Quotation No: ${quotation.quotationNumber}`, 350, y, {
      align: "right",
    })
    .font("Helvetica")
    .text(
      `Date: ${new Date(quotation.quotationDate).toLocaleDateString("en-IN")}`,
      350,
      y + 12,
      { align: "right" },
    )
    .text(
      `Valid Until: ${new Date(quotation.validUntil).toLocaleDateString("en-IN")}`,
      350,
      y + 24,
      { align: "right" },
    )
    .text(`Status: ${quotation.status.toUpperCase()}`, 350, y + 36, {
      align: "right",
    });

  y += 50;
  doc.moveTo(40, y).lineTo(555, y).strokeColor("#e2e8f0").stroke();
  y += 10;

  // Customer Box
  const customer = quotation.customerSnapshot || {};
  doc.rect(40, y, 515, 50).fillAndStroke("#f8fafc", "#e2e8f0");

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(darkColor)
    .text("QUOTATION FOR:", 50, y + 8)
    .text(customer.name || "Customer", 50, y + 20)
    .font("Helvetica")
    .fillColor(grayColor)
    .text(
      `Phone: ${customer.phone || "N/A"} | GSTIN: ${customer.gstin || "N/A"}`,
      50,
      y + 32,
    );

  y += 65;

  // Table Header
  doc.rect(40, y, 515, 20).fillAndStroke(darkColor, darkColor);
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("#", 45, y + 6, { width: 20 })
    .text("Item Description", 70, y + 6, { width: 180 })
    .text("Qty", 260, y + 6, { width: 40, align: "right" })
    .text("Rate", 310, y + 6, { width: 55, align: "right" })
    .text("GST%", 375, y + 6, { width: 45, align: "right" })
    .text("Amount", 440, y + 6, { width: 110, align: "right" });

  y += 22;

  // Item Rows
  let idx = 1;
  doc.font("Helvetica").fontSize(8);

  for (const item of quotation.items) {
    if (y > 700) {
      doc.addPage({ size: "A4", margin: 40 });
      y = 40;
    }

    const rowBg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
    doc.rect(40, y, 515, 18).fillAndStroke(rowBg, "#f1f5f9");

    doc
      .fillColor(darkColor)
      .text(String(idx), 45, y + 5, { width: 20 })
      .text(item.name, 70, y + 5, { width: 180, ellipsis: true })
      .text(`${item.quantity} ${item.unit || "PCS"}`, 260, y + 5, {
        width: 40,
        align: "right",
      })
      .text(`Rs.${item.unitPrice.toFixed(2)}`, 310, y + 5, {
        width: 55,
        align: "right",
      })
      .text(`${item.taxRate}%`, 375, y + 5, { width: 45, align: "right" })
      .text(`Rs.${item.total.toFixed(2)}`, 440, y + 5, {
        width: 110,
        align: "right",
      });

    y += 18;
    idx++;
  }

  y += 15;

  // Grand Total Bar
  doc.rect(340, y, 215, 22).fillAndStroke(primaryColor, primaryColor);
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("ESTIMATED TOTAL:", 350, y + 6)
    .text(`Rs.${quotation.grandTotal.toFixed(2)}`, 450, y + 6, {
      width: 100,
      align: "right",
    });

  // Amount in Words
  y += 30;
  doc
    .fontSize(8)
    .font("Helvetica-Oblique")
    .fillColor(primaryColor)
    .text(numberToWords(quotation.grandTotal), 40, y, { width: 350 });

  doc.end();
};
