const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{10}$/.test(v);
        },
        message: "Phone must be 10 digits",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      enum: ["Sales", "Store", "Admin", "Accounts", "Inventory", "HR", "Management", "Other"],
      default: "Sales",
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
      default: "Staff",
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
      default: Date.now,
    },
    salary: {
      type: Number,
      default: 0,
      min: [0, "Salary cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Unique employeeId per business
employeeSchema.index({ businessId: 1, employeeId: 1 }, { unique: true });
// Unique email per business if provided
employeeSchema.index(
  { businessId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $exists: true, $gt: "" } },
  }
);
employeeSchema.index({ businessId: 1, name: 1 });
employeeSchema.index({ businessId: 1, status: 1 });
employeeSchema.index({ businessId: 1, department: 1 }); // fast dept filter
employeeSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model("Employee", employeeSchema);
