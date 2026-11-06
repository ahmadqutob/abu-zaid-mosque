import mongoose, { Schema, model } from "mongoose";

const facilityScheduleLockSchema = new Schema(
  {
    facilityId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    revision: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: false }
);

const FacilityScheduleLock =
  mongoose.models.FacilityScheduleLock ||
  model("FacilityScheduleLock", facilityScheduleLockSchema);

export default FacilityScheduleLock;
