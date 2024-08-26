const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      required: true,
      type: String,
      trim: true,
    },
    MRP: {
      required: true,
      type: Number,
      trim: true,
    },
    netPrice: {
      required: true,
      type: Number,
      trim: true,
    },
    price: {
      required: true,
      type: Number,
      trim: true,
    },
    HSN: {
      required: true,
      type: Number,
      trim: true,
    },
    CGST: {
      required: true,
      type: Number,
      trim: true,
    },
    SGST: {
      required: true,
      type: Number,
      trim: true,
    },
    pic: {
      required: true,
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const product = mongoose.model("product", productSchema);

module.exports = product;
