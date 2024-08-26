const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderedProducts: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        free: {
          type: Number,
          required: true,
        },
        quentity: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          required: true,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Agency",
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shops",
    },
    pdf: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const order = mongoose.model("order", orderSchema);

module.exports = order;
