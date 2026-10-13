import { model, Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "agency",
    },
  },
  { timestamps: true, versionKey: false },
);

const category = model("category", categorySchema);

export default category;
