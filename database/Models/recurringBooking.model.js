import mongoose, { Schema, model } from "mongoose";

const recurringBookingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  renterName: {
    type: String,
    required: [true, "Renter name is required"],
    minlength: [10, "Renter name must be at least 10 characters long"],
    maxlength: [25, "Renter name cannot exceed 25 characters"],
    trim: true,
  },
  renterPhone: {
    type: String,
    required: [true, "Renter phone is required"],
    match: [/^[+]?[\d\s\-\(\)]{8,15}$/, "Please provide a valid phone number"],
  },
  renterEmail: {
    type: String,
    required: [true, "Renter email is required"],
    lowercase: true,
    trim: true,
  },
  // Recurring pattern
  recurringType: {
    type: String,
    enum: ["weekly", "monthly"],
    required: true,
  },
  dayOfWeek: {
    type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    min: 0,
    max: 6,
    required: function() {
      return this.recurringType === "weekly";
    },
  },
  dayOfMonth: {
    type: Number, // 1-31 for monthly recurring
    min: 1,
    max: 31,
    required: function() {
      return this.recurringType === "monthly";
    },
  },
  startRentTime: {
    type: String,
    required: [true, "Start time is required"],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"],
  },
  endRentTime: {
    type: String,
    required: [true, "End time is required"],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"],
  },
  durationHours: {
    type: Number,
    required: true,
    min: 0.5,
    max: 24,
  },
  pricePerHour: {
    type: Number,
    default: 70,
    min: 1,
    max: 1000,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  anyComment: {
    type: String,
    maxlength: [500, "Comment cannot exceed 500 characters"],
  },
  // Recurring settings
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Generated bookings tracking
  lastGeneratedDate: {
    type: Date,
    default: null,
  },
  totalBookingsGenerated: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "paused", "cancelled"],
    default: "active",
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
recurringBookingSchema.index({ userId: 1, isActive: 1 });
recurringBookingSchema.index({ recurringType: 1, dayOfWeek: 1 });
recurringBookingSchema.index({ startDate: 1, endDate: 1 });

const RecurringBooking = mongoose.models.RecurringBooking || model("RecurringBooking", recurringBookingSchema);

export default RecurringBooking;

