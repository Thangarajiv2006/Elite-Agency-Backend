const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    AgencyName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      houseNo: {
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
      state: {
        type: String,
        required: true,
        trim: true,
      },
      stateCode: {
        type: Number,
        required: true,
        trim: true,
      },
      pincode: {
        type: Number,
        required: true,
        trim: true,
      },
    },
    FSSAI: {
      type: Number,
      required: true,
      trim: true,
    },
    GSTIN: {
      type: String,
      required: true,
      trim: true,
    },
    PAN: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: Number,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const AgencyData = mongoose.model("Agency", agencySchema);

module.exports = AgencyData;
