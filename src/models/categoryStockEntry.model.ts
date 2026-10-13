import { model, Schema } from "mongoose";

const categoryStockSchema = new Schema(
  {
    // 🔥 CATEGORY SNAPSHOT
    category: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },

    // 🔥 PRODUCTS SNAPSHOT ARRAY
    products: [
      {
        // 🔥 PRODUCT SNAPSHOT
        product: {
          name: {
            type: String,
            required: true,
            trim: true,
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

          unit: {
            type: String,
            default: "pcs",
          },
        },

        // 🔥 STOCK CHANGE DATA
        quantity: {
          type: Number,
          required: true,
        },

        previousStock: {
          type: Number,
          required: true,
        },

        updatedStock: {
          type: Number,
          required: true,
        },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "agency",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const categoryStockEntry = model("categoryStockEntry", categoryStockSchema);

export default categoryStockEntry;
