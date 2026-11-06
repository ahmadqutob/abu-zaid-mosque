import mongoose, { Schema, model, Types } from "mongoose";
import { isFriday } from "../../src/Modules/nextFriday/nextFriday.dates.js";

const nextFridaySchema = new Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    minlength: 3,
    maxlength: 100,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: 3,
    maxlength: 100,
  },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  date: {
    type: Date,
    required: [true, "Date is required"],
    validate: { validator: isFriday, message: "Date must fall on a Friday in Asia/Hebron" },
  },
  image: {
    type: Object,
    default: null,
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

nextFridaySchema.index({ softDelete: 1, date: 1 });

const nextFridayModel = mongoose.models.NextFriday || model("NextFriday", nextFridaySchema);
export default nextFridayModel;
