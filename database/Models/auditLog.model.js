import mongoose, { Schema, model } from "mongoose";

const auditLogSchema = new Schema({
  action: {
    type: String,
    enum: ["DELETE_USER", "DELETE_TEACHER", "DELETE_STUDENT", "UPDATE_USER", "CREATE_USER"],
    required: true,
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  performedByRole: {
    type: String,
    required: true,
  },
  targetUser: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  targetUserRole: {
    type: String,
    required: true,
  },
  targetUserEmail: {
    type: String,
    required: true,
  },
  targetUserName: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ipAddress: {
    type: String,
    default: null,
  },
});

export default model("auditLog", auditLogSchema);
