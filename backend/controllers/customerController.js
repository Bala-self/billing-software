const Customer = require("../models/Customer");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get all customers with search, filter & pagination
 * @route   GET /api/customers
 * @access  Private (customers.view)
 */
exports.getCustomers = asyncHandler(async (req, res) => {
  const { search, state, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId, isActive: true };

  if (search) {
    if (typeof search === 'string' && search.length > 100) {
      throw new ApiError(400, "Search too long, max 100 characters");
    }
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
      { gstin: { $regex: safe, $options: "i" } },
      { "billingAddress.city": { $regex: safe, $options: "i" } },
      { "billingAddress.state": { $regex: safe, $options: "i" } },
    ];
  }

  if (state) {
    query["billingAddress.state"] = state;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum),
    Customer.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        customers,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Customers retrieved successfully."
    )
  );
});

/**
 * @desc    Get single customer by ID
 * @route   GET /api/customers/:id
 * @access  Private (customers.view)
 */
exports.getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!customer) throw new ApiError(404, "Customer not found.");

  res.status(200).json(new ApiResponse(200, customer, "Customer retrieved."));
});

/**
 * @desc    Create new customer
 * @route   POST /api/customers
 * @access  Private (customers.create)
 */
exports.createCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    gstin,
    pan,
    billingAddress,
    shippingAddress,
    creditLimit,
    openingBalance,
  } = req.body;

  if (!name || !billingAddress || !billingAddress.state) {
    throw new ApiError(400, "Customer name and billing state are required.");
  }

  // Phone duplicate check (except walk-in 0000000000)
  if (phone && phone !== "0000000000") {
    const exists = await Customer.findOne({ businessId: req.businessId, phone: phone.trim(), isActive: true });
    if (exists) throw new ApiError(400, `Customer with phone ${phone} already exists`);
  }

  const initialBalance = Number(openingBalance) || 0;

  const customer = await Customer.create({
    businessId: req.businessId,
    name,
    phone: phone || "",
    email: email || "",
    gstin: gstin ? gstin.toUpperCase() : "",
    pan: pan ? pan.toUpperCase() : "",
    billingAddress,
    shippingAddress: shippingAddress || billingAddress,
    creditLimit: Number(creditLimit) || 0,
    openingBalance: initialBalance,
    outstandingBalance: initialBalance, // Starts with opening balance
  });

  res.status(201).json(new ApiResponse(201, customer, "Customer created successfully."));
});

/**
 * @desc    Update customer
 * @route   PUT /api/customers/:id
 * @access  Private (customers.edit)
 */
exports.updateCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    gstin,
    pan,
    billingAddress,
    shippingAddress,
    creditLimit,
    openingBalance,
  } = req.body;

  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!customer) throw new ApiError(404, "Customer not found.");

  // Only update fields the customer form can edit.
  // businessId, isActive and the calculated outstandingBalance are never
  // taken from the client.
  const updatable = {
    name, phone, email,
    gstin: gstin ? gstin.toUpperCase() : gstin,
    pan: pan ? pan.toUpperCase() : pan,
    billingAddress, shippingAddress, creditLimit, openingBalance,
  };
  for (const field of Object.keys(updatable)) {
    if (updatable[field] !== undefined) customer[field] = updatable[field];
  }

  await customer.save();

  res.status(200).json(new ApiResponse(200, customer, "Customer updated successfully."));
});

/**
 * @desc    Delete customer (Soft delete)
 * @route   DELETE /api/customers/:id
 * @access  Private (customers.delete)
 */
exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    { isActive: false },
    { new: true }
  );

  if (!customer) throw new ApiError(404, "Customer not found.");

  res.status(200).json(new ApiResponse(200, null, "Customer deleted successfully."));
});
