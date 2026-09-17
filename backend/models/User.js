const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLE_PERMISSIONS } = require("../constants/permissions");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never returned in query results by default
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "User must belong to a Business"],
      index: true,
    },
    role: {
      type: String,
      enum: ["Super Admin", "Admin", "Manager", "Cashier", "Inventory Staff", "Accountant", "Viewer"],
      default: "Cashier",
    },
    customPermissions: {
      type: [String],
      default: [],
    },
    phone: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create the JWT that the frontend stores and sends back as "Authorization: Bearer <token>"
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      businessId: this.businessId,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// All permissions the user effectively has: role defaults + custom additions
userSchema.methods.getEffectivePermissions = function () {
  const rolePermissions = ROLE_PERMISSIONS[this.role] || [];
  return Array.from(new Set([...rolePermissions, ...(this.customPermissions || [])]));
};

module.exports = mongoose.model("User", userSchema);
