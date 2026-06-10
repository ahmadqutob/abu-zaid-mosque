import { Schema, Types } from "mongoose";
import mongoose from "mongoose";

// Event hall booking for Abuzaid Mosque.
// May be created by a logged-in user OR by an anonymous visitor (customer).
const bookingSchema = new mongoose.Schema({

    // Optional: set only if the requester is a logged-in user
    userId: { type: Types.ObjectId, ref: "User", default: null },

    renterName: { type: String, required: true, trim: true },
    renterPhone: { type: String, required: true, trim: true },
    renterEmail: { type: String, trim: true, lowercase: true },

  // event info
  eventType: {
    type: String,
    enum: ["wedding", "lecture", "conference", "funeral", "social", "other"],
    default: "other",
  },
  attendeesCount: { type: Number, min: 1, default: 1 },

  // date info
  dateOfRent: { type: Date, required: true },
  startRentTime: { type: String, required: true }, // e.g., "17:00"
  endRentTime: { type: String, required: true },   // e.g., "19:00"
  durationHours: { type: Number, required: true, min: 0.5 },
  // payments
  pricePerHour: { type: Number, default: 70 },
  totalPrice:    { type: Number, required: true },
  status: { type: String, enum: ["confirmed", "pending", "cancelled"], default: "pending" },
  // user comment / extra requests
  anyComment: { type: String, trim: true },

}, { timestamps: true });


bookingSchema.index(
  {   dateOfRent: 1, startRentTime: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
);

export default mongoose.model("Booking", bookingSchema);

