import { model, Schema } from "mongoose";

const attendanceSchema = new Schema(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "worker",
      required: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "agency",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"],
      default: "PRESENT",
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { versionKey: false, timestamps: true },
);

// Ensure a worker only has one attendance entry per day
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });

const attendance = model("attendance", attendanceSchema);

export default attendance;
