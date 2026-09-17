/**
 * Billing calculation helpers.
 *
 * Every GST document (invoice, purchase, quotation, return) uses the same
 * maths, so it lives here in one place. The flow is simple:
 *
 *   line  : quantity * unitPrice  -  discount            = taxable amount
 *   tax   : interstate  -> IGST  (full tax rate)
 *           intrastate  -> CGST + SGST (half the rate each)
 *   total : taxable amount + tax
 *
 * Keep this file plain on purpose — anyone on the team should be able to
 * read the whole thing in one minute.
 */

// Calculate a single line item.
const calculateLineItem = ({ unitPrice, quantity, discount = 0, discountType = "FIXED", taxRate = 0, isInterstate = false }) => {
  const gross = unitPrice * quantity;

  // Item discount: fixed amount, or a % of the gross.
  // Clamped so a bad value can never push the line below zero.
  let discountAmount = 0;
  if (discount > 0) {
    discountAmount = discountType === "PERCENTAGE"
      ? (gross * Math.min(discount, 100)) / 100
      : Math.min(discount, gross);
  }

  const taxableAmount = gross - discountAmount;

  // Interstate sale -> charge the full GST as IGST.
  // Intrastate sale -> split the GST 50/50 into CGST + SGST.
  let cgstRate = 0, cgstAmount = 0;
  let sgstRate = 0, sgstAmount = 0;
  let igstRate = 0, igstAmount = 0;

  if (isInterstate) {
    igstRate = taxRate;
    igstAmount = Number(((taxableAmount * igstRate) / 100).toFixed(2));
  } else {
    cgstRate = taxRate / 2;
    sgstRate = taxRate / 2;
    cgstAmount = Number(((taxableAmount * cgstRate) / 100).toFixed(2));
    sgstAmount = Number(((taxableAmount * sgstRate) / 100).toFixed(2));
  }

  const total = Number((taxableAmount + cgstAmount + sgstAmount + igstAmount).toFixed(2));

  return {
    gross,
    discountAmount,
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    total,
  };
};

// Add up all line items into the document totals.
// `lines` are the objects returned by calculateLineItem.
const calculateTotals = (lines) => {
  const sum = (key) => lines.reduce((acc, line) => acc + line[key], 0);

  const subtotal = sum("gross");
  const totalDiscount = sum("discountAmount");
  const taxableAmount = sum("taxableAmount");
  const totalCgst = sum("cgstAmount");
  const totalSgst = sum("sgstAmount");
  const totalIgst = sum("igstAmount");
  const totalTax = totalCgst + totalSgst + totalIgst;

  // Grand total is rounded to the nearest rupee; roundOff keeps the difference.
  const rawGrandTotal = taxableAmount + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    totalIgst: Number(totalIgst.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    roundOff,
    grandTotal,
  };
};

module.exports = { calculateLineItem, calculateTotals };
