import { model, Schema } from "mongoose";

const orderSchema = new Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    orderedProducts: [
      {
        product: {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          costPrice: Number,
          sellingPrice: Number,
          MRP: Number,
          HSN: String,
          CGST: Number,
          SGST: Number,
          unit: {
            type: String,
            default: "pcs",
          },
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        free: {
          type: Number,
          default: 0,
        },
        discount: {
          type: Number,
          default: 0,
        },
        netPrice: Number, // price before GST
        taxAmount: Number, // GST value
        totalAmount: Number, // final item total
      },
    ],
    shop: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: "shop",
      },
      shopName: String,
      ownerName: String,
      address: {
        village: String,
        district: String,
        landmark: String,
        state: String,
        stateCode: String,
        pinCode: String,
      },
      fssai: String,
      gst: String,
      pan: String,
      mobile: String,
      email: String,
    },
    worker: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: "worker",
      },
      name: String,
      email: String,
      mobile: Number,
      address: {
        plotNo: String,
        street: String,
        village: String,
        district: String,
      },
    },
    subTotal: {
      type: Number,
      required: true,
    },
    totalGST: {
      type: Number,
      required: true,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ["CASH", "CREDIT"],
      required: true,
    },
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        method: {
          type: String,
          enum: ["CASH", "UPI", "BANK"],
          default: "CASH",
        },
        date: {
          type: Date,
          default: Date.now,
        },
        reference: {
          type: String,
          default: "",
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
    dueDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "agency",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 🔥 VIRTUAL: TOTAL PAID
orderSchema.virtual("paidAmount").get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});

// 🔥 VIRTUAL: DUE AMOUNT
orderSchema.virtual("dueAmount").get(function () {
  const paid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  return this.grandTotal - paid;
});

// 🔥 VIRTUAL: PAYMENT STATUS
orderSchema.virtual("paymentStatus").get(function () {
  const paid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  const due = this.grandTotal - paid;

  if (due <= 0) return "PAID";
  if (paid === 0) return "UNPAID";
  return "PARTIAL";
});

const order = model("Order", orderSchema);

export default order;
