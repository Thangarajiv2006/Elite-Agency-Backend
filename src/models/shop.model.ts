import { model, Schema } from "mongoose";

const shopSchema = new Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
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
      landmark: {
        type: String,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      stateCode: {
        type: String,
        required: true,
      },
      pinCode: {
        type: String,
        required: true,
      },
    },
    fssai: {
      type: String,
      trim: true,
    },
    gst: {
      type: String,
      trim: true,
      uppercase: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "agency",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const shop = model("shop", shopSchema);

export default shop;
