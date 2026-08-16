import mongoose, { Schema, model } from "mongoose";

const facilitySchema = new Schema(
  {
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Facility ID is required"],
    },
    renterName: {
      type: String,
      required: [true, "Renter name is required"],
      trim: true,
    },
    renterPhone: {
      type: String,
      required: [true, "Renter phone is required"],
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewerNote: {
      type: String,
      trim: true,
      default: null,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    extraCharge: {
      type: Number,
      default: 0,
      min: [0, "Extra charge cannot be negative"],
    },
  },
  { timestamps: true }
);

const facilityModel = mongoose.models.Facility || model("Facility", facilitySchema);

export default facilityModel;
