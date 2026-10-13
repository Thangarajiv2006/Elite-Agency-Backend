import { model, Schema } from "mongoose";

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    MRP: {
      type: Number,
      min: 0,
    },

    HSN: {
      type: String,
      required: true,
      trim: true,
    },

    CGST: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    SGST: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    unit: {
      type: String,
      default: "pcs",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "agency",
      required: true,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 🔥 Virtual: Net Price (with GST)
productSchema.virtual("netPrice").get(function () {
  const totalGST = this.CGST + this.SGST;
  return this.sellingPrice / (1 + totalGST / 100);
});

// 🔥 Virtual: Profit
productSchema.virtual("profit").get(function () {
  return this.sellingPrice - this.costPrice;
});

// 🔍 Index
productSchema.index({ name: 1, categoryId: 1 });

const product = model("product", productSchema);

export default product;
