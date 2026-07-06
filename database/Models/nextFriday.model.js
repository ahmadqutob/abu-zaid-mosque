import mongoose, { Schema, model, Types } from "mongoose";

const nextFridaySchema = new Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
  },
  image: {
    type: Object,
    required: [true, "Image is required"],
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

const nextFridayModel = mongoose.models.NextFriday || model("NextFriday", nextFridaySchema);
export default nextFridayModel;
