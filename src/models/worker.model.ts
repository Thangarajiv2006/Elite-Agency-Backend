import { model, Schema } from "mongoose";

const workerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    mobile: {
      type: Number,
      required: true,
    },
    address: {
      plotNo: {
        type: String,
        required: true,
        trim: true,
      },
      street: {
        type: String,
        required: true,
        trim: true,
      },
      village: {
        type: String,
        required: true,
        trim: true,
      },
      district: {
        type: String,
        required: true,
        trim: true,
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "agency",
    },
  },
  { versionKey: false, timestamps: true },
);

const worker = model("worker", workerSchema);

export default worker;
