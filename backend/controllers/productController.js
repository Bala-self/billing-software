/**
 * Product Controller - Optimized for Performance
 * For 1 year MERN dev: simple, fast
 * 
 * Optimizations from guide:
 * 1. MongoDB indexes on name, barcode, sku (in model)
 * 2. Don't return unnecessary fields - select only needed for billing
 * 3. Pagination - limit 20, not 1000s
 * 4. Fast barcode lookup - indexed
 * 5. Small API responses
 */

const Product = require("../models/Product");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Helper: generate SKU if not provided
const generateSku = () => "SKU-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

/**
 * GET /api/products - List with search, pagination, optimized
 * For billing POS: returns only needed fields, limit 20
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, brand, status, page = 1, limit = 20 } = req.query; // limit 20 default, not 50

  const query = { businessId: req.businessId, isActive: true };

  // Validation: search max 100 chars, escape regex to prevent ReDoS
  let safeSearch = null;
  if (search) {
    if (typeof search !== 'string' || search.length > 100) {
      throw new ApiError(400, "Search too long, max 100 characters");
    }
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    safeSearch = escaped;
    query.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { sku: { $regex: safeSearch, $options: "i" } },
      { barcode: { $regex: safeSearch, $options: "i" } },
      { hsnCode: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (status) query.status = status;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50); // max 50, prevents huge responses
  const skip = (pageNum - 1) * limitNum;

  // Performance: select only needed fields for list, not all
  // For billing, we need: name, sku, barcode, sellingPrice, stock, taxRate, category, brand
  const [products, total] = await Promise.all([
    Product.find(query)
      .select("name sku barcode sellingPrice purchasePrice stock taxRate hsnCode category brand unit status") // small response
      .populate("category", "name")
      .populate("brand", "name")
      .populate("unit", "name shortCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(), // lean = faster, returns plain JS object not Mongoose doc
    Product.countDocuments(query),
  ]);

  res.status(200).json(new ApiResponse(200, {
    products,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
  }, "Products list"));
});

/**
 * GET /api/products/:id - Single product
 */
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, businessId: req.businessId })
    .populate("category", "name")
    .populate("brand", "name")
    .populate("unit", "name shortCode");

  if (!product) throw new ApiError(404, "Product not found");
  res.status(200).json(new ApiResponse(200, product, "Product found"));
});

/**
 * GET /api/products/barcode/:code - Fast barcode lookup for POS
 * VERY IMPORTANT for billing performance - uses indexed barcode field
 */
exports.getProductByBarcode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const product = await Product.findOne({
    businessId: req.businessId,
    barcode: code,
    isActive: true,
  }).select("name sku barcode sellingPrice stock taxRate hsnCode").lean();

  if (!product) throw new ApiError(404, `No product with barcode ${code}`);
  res.status(200).json(new ApiResponse(200, product, "Product found by barcode"));
});

/**
 * POST /api/products - Create
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, sku, barcode, category, brand, unit, hsnCode, purchasePrice, sellingPrice, mrp, taxRate, stock, minStockAlert } = req.body;

  if (!name || sellingPrice === undefined) throw new ApiError(400, "Name and selling price required");

  const finalSku = sku?.trim() ? sku.trim().toUpperCase() : generateSku();

  const product = await Product.create({
    businessId: req.businessId,
    name: name.trim(),
    sku: finalSku,
    barcode: barcode || undefined,
    category: category || undefined,
    brand: brand || undefined,
    unit: unit || undefined,
    hsnCode: hsnCode || "",
    purchasePrice: Number(purchasePrice) || 0,
    sellingPrice: Number(sellingPrice),
    mrp: Number(mrp) || Number(sellingPrice),
    taxRate: taxRate !== undefined ? Number(taxRate) : 18,
    stock: Number(stock) || 0,
    minStockAlert: Number(minStockAlert) || 5,
  });

  res.status(201).json(new ApiResponse(201, product, "Product created"));
});

/**
 * PUT /api/products/:id - Update
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, businessId: req.businessId });
  if (!product) throw new ApiError(404, "Product not found");

  // Only update allowed fields
  const allowed = ["name", "sku", "barcode", "category", "brand", "unit", "hsnCode", "purchasePrice", "sellingPrice", "mrp", "taxRate", "stock", "minStockAlert", "description"];
  for (const field of allowed) {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  }

  await product.save();
  res.status(200).json(new ApiResponse(200, product, "Product updated"));
});

/**
 * DELETE /api/products/:id - Soft delete
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    { isActive: false },
    { new: true }
  );
  if (!product) throw new ApiError(404, "Product not found");
  res.status(200).json(new ApiResponse(200, null, "Product deleted"));
});

/**
 * GET /api/products/alerts/low-stock - Low stock for dashboard
 * Uses index on status field
 */
exports.getLowStockAlerts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    businessId: req.businessId,
    isActive: true,
    $or: [{ status: "Low Stock" }, { status: "Out of Stock" }],
  })
    .select("name sku stock minStockAlert status sellingPrice")
    .sort({ stock: 1 })
    .limit(20) // only 20 alerts, not all
    .lean();

  res.status(200).json(new ApiResponse(200, products, "Low stock alerts"));
});
