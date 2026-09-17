/**
 * Simple Validation Helpers - For 1 year MERN dev
 * Easy to understand, no complex libraries
 */

// Escape regex special chars to prevent ReDoS
// User input like ".*+" could cause heavy regex, escape it
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Validate search string: max 100 chars, trim, escape regex
const validateSearch = (search) => {
  if (!search) return null;
  if (typeof search !== 'string') return null;
  const trimmed = search.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 100) {
    throw new Error("Search too long, max 100 characters");
  }
  return escapeRegex(trimmed);
};

// Validate quantity: must be positive, max 10000, integer
const validateQuantity = (qty) => {
  const num = Number(qty);
  if (isNaN(num)) throw new Error("Quantity must be a number");
  if (num <= 0) throw new Error("Quantity must be greater than 0");
  if (num > 10000) throw new Error("Quantity too large, max 10000");
  if (!Number.isInteger(num) && num < 1) throw new Error("Quantity must be integer for this product");
  return num;
};

// Validate phone: 10 digits
const validatePhone = (phone) => {
  if (!phone) return "";
  const cleaned = String(phone).trim();
  if (cleaned === "0000000000") return cleaned; // allow walk-in
  if (!/^[0-9]{10}$/.test(cleaned)) {
    throw new Error("Phone must be exactly 10 digits");
  }
  return cleaned;
};

// Validate price: must be >=0, max 10 crore
const validatePrice = (price) => {
  const num = Number(price);
  if (isNaN(num)) throw new Error("Price must be a number");
  if (num < 0) throw new Error("Price cannot be negative");
  if (num > 100000000) throw new Error("Price too large, max 10 crore");
  return num;
};

// Validate stock: must be >=0
const validateStock = (stock) => {
  const num = Number(stock);
  if (isNaN(num)) return 0;
  if (num < 0) throw new Error("Stock cannot be negative");
  if (num > 1000000) throw new Error("Stock too large, max 1 million");
  return Math.floor(num);
};

module.exports = {
  escapeRegex,
  validateSearch,
  validateQuantity,
  validatePhone,
  validatePrice,
  validateStock,
};
