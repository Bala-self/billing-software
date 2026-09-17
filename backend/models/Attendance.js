const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee reference is required"],
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      // Store date at midnight for consistent querying
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Leave"],
      default: "Present",
      required: true,
    },
    workingHours: {
      type: Number, // in minutes
      default: 0,
    },
    workingHoursFormatted: {
      type: String, // e.g. "9h 03m"
      default: "",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isManual: {
      type: Boolean,
      default: false, // true if admin manually created/edited
    },
  },
  { timestamps: true }
);

// CRITICAL RULE: Employee + Date = Unique (one attendance per day)
// This prevents duplicate attendance for same employee on same date
attendanceSchema.index({ businessId: 1, employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ businessId: 1, date: 1 });
attendanceSchema.index({ businessId: 1, employeeId: 1 });
attendanceSchema.index({ businessId: 1, status: 1 });

// Helper to calculate working hours
attendanceSchema.methods.calculateWorkingHours = function () {
  if (!this.checkIn || !this.checkOut) {
    this.workingHours = 0;
    this.workingHoursFormatted = "";
    return;
  }

  const diffMs = this.checkOut - this.checkIn;
  if (diffMs <= 0) {
    this.workingHours = 0;
    this.workingHoursFormatted = "";
    return;
  }

  const minutes = Math.floor(diffMs / 60000);
  this.workingHours = minutes;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  this.workingHoursFormatted = `${hours}h ${mins.toString().padStart(2, "0")}m`;
};

// Auto-calculate working hours before save
attendanceSchema.pre("save", function (next) {
  // Normalize date to midnight for uniqueness
  if (this.date) {
    const d = new Date(this.date);
    d.setHours(0, 0, 0, 0);
    this.date = d;
  }
  this.calculateWorkingHours();
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
