import mongoose, { Schema, model, Types } from "mongoose";

const eventSchema = new Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
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
  location: {
    type: String,
    required: [true, "Location is required"],
    trim: true,
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    //
    trim: true,
  },
  image: {
    type: Object,
    required: [true, "Image is required"],
  },
  status: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled"],
    default: "upcoming",
  },
  age: {
    type: String,
    required: [true, "Age target is required"],
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

const eventModel = mongoose.models.Event || model("Event", eventSchema);
export default eventModel;
