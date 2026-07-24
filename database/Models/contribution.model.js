import mongoose, { Schema, model, Types } from "mongoose";

const contributionSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  image: {
    type: Object,
    required: false, // Optional image
  },
  condition: {
    type: String,
    required: [true, "Condition is required"],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
  },
  location: {
    type: String,
    required: [true, "Location is required"],
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  softDelete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

const contributionModel = mongoose.models.Contribution || model("Contribution", contributionSchema);
export default contributionModel;
