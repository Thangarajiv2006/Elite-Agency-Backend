import { NextFunction, Request, Response } from "express";
import shop from "../models/shop.model";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../utils/error-handler";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const fssaiRegex = /^\d{14}$/;
const pincodeRegex = /^\d{6}$/;

const createInsensitiveRegex = (value: string) => {
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
};

export const getShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const village = req.query.village
      ? String(req.query.village).trim()
      : undefined;

    const district = req.query.district
      ? String(req.query.district).trim()
      : undefined;

    const search = req.query.search
      ? String(req.query.search).trim()
      : undefined;

    const skip = (page - 1) * limit;

    // 🔥 Dynamic filter
    const filter: any = {
      createdBy: req.user,
    };

    if (district) {
      filter["address.district"] = createInsensitiveRegex(district);
    }

    if (village) {
      filter["address.village"] = createInsensitiveRegex(village);
    }

    if (search) {
      filter["$or"] = [
        { ownerName: createInsensitiveRegex(search) },
        { shopName: createInsensitiveRegex(search) },
        { mobile: search },
      ];
    }

    // ✅ Get villages based on district
    const baseFilter = {
      createdBy: req.user,
      ...(search && {
        $or: [
          { ownerName: createInsensitiveRegex(search) },
          { shopName: createInsensitiveRegex(search) },
          { mobile: search },
        ],
      }),
    };

    const allVillage = await shop.distinct("address.village", {
      ...baseFilter,
      ...(district && { "address.district": createInsensitiveRegex(district) }),
    });

    // ✅ Get districts (no filter OR optional)
    const allDistrict = await shop.distinct("address.district", baseFilter);

    // ✅ Main data
    const shops = await shop.find(filter).skip(skip).limit(limit).lean();

    const totalDoc = await shop.countDocuments();
    const quriedDoc = await shop.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      message: "Data fetched successfully",
      shops: shops.map((s) => ({
        ...s,
        phone: s.mobile,
      })),
      villages: allVillage,
      districts: allDistrict,
      total: totalDoc,
      currentPage: page,
      totalPages: Math.ceil(quriedDoc / limit),
      queriedTotal: quriedDoc,
    });
  } catch (error) {
    next(new DatabaseError());
  }
};

export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { shopName, ownerName, address, phone, email, gst, pan, fssai } =
    req.body;

  if (!shopName || !shopName.trim()) {
    return next(new ValidationError("Shop name is required"));
  }
  if (!ownerName || !ownerName.trim()) {
    return next(new ValidationError("Owner name is required"));
  }
  if (!address || typeof address !== "object") {
    return next(new ValidationError("Address is required"));
  }
  if (!address.village) {
    return next(new ValidationError("Village is required"));
  }
  if (!address.district) {
    return next(new ValidationError("District is required"));
  }
  if (!address.state) {
    return next(new ValidationError("State is required"));
  }
  if (!address.stateCode) {
    return next(new ValidationError("State code is required"));
  }
  if (!address.pinCode || !pincodeRegex.test(address.pinCode)) {
    return next(new ValidationError("Valid pincode is required"));
  }
  if (!phone || !phoneRegex.test(phone)) {
    return next(new ValidationError("Valid phone number is required"));
  }

  if (email && !emailRegex.test(email)) {
    return next(new ValidationError("Valid email is required"));
  }
  if (pan && !panRegex.test(pan)) {
    return next(new ValidationError("Valid PAN number is required"));
  }
  if (gst && !gstRegex.test(gst)) {
    return next(new ValidationError("Valid GSTIN is required"));
  }
  if (fssai && !fssaiRegex.test(fssai)) {
    return next(new ValidationError("Valid FSSAI number is required"));
  }

  const existingShop = await shop.findOne({ mobile: phone });
  if (existingShop) {
    return next(
      new ValidationError("Shop already exists with this mobile number"),
    );
  }

  await shop
    .create({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      address: {
        village: address.village,
        district: address.district,
        landmark: address.landmark || "",
        state: address.state,
        stateCode: address.stateCode,
        pinCode: address.pinCode,
      },
      mobile: phone,
      email: email ? email.toLowerCase() : undefined,
      gst: gst ? gst.toUpperCase() : undefined,
      pan: pan ? pan.toUpperCase() : undefined,
      fssai: fssai || undefined,
      createdBy: req.user,
    })
    .then((createdShop) => {
      res.status(201).json({
        status: "success",
        message: "Shop Created Successfully!",
        shop: {
          _id: createdShop._id,
          shopName: createdShop.shopName,
          ownerName: createdShop.ownerName,
          address: createdShop.address,
          phone: createdShop.mobile,
          email: createdShop.email,
          gst: createdShop.gst,
          pan: createdShop.pan,
          fssai: createdShop.fssai,
        },
      });
    })
    .catch((e) => {
      console.log(e);
      next(new DatabaseError("Failed to create shop"));
    });
};

export const updateShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    _id,
    shopName,
    ownerName,
    address,
    phone: mobile,
    email,
    gst,
    pan,
    fssai,
  } = req.body;

  if (!_id) {
    return next(new ValidationError("Shop ID is required"));
  }

  if (shopName !== undefined && !shopName.trim()) {
    return next(new ValidationError("Shop name is required"));
  }

  if (ownerName !== undefined && !ownerName.trim()) {
    return next(new ValidationError("Owner name is required"));
  }

  if (address !== undefined) {
    if (!address.village) {
      return next(new ValidationError("Village is required"));
    }
    if (!address.district) {
      return next(new ValidationError("District is required"));
    }
    if (!address.state) {
      return next(new ValidationError("State is required"));
    }
    if (!address.stateCode) {
      return next(new ValidationError("State code is required"));
    }
    if (!address.pinCode || !pincodeRegex.test(address.pinCode)) {
      return next(new ValidationError("Valid pincode is required"));
    }
  }

  if (mobile !== undefined && !phoneRegex.test(mobile)) {
    return next(new ValidationError("Valid phone number is required"));
  }

  if (
    email !== undefined &&
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return next(new ValidationError("Valid email is required"));
  }

  try {
    const existingShop = await shop.findOne({ _id, createdBy: req.user });
    if (!existingShop) {
      return next(new NotFoundError("Shop not found"));
    }

    if (mobile && mobile !== existingShop.mobile) {
      const phoneConflict = await shop.findOne({ mobile, _id: { $ne: _id } });
      if (phoneConflict) {
        return next(
          new ValidationError("Shop already exists with this mobile number"),
        );
      }
    }

    const updateData: any = {};
    if (shopName !== undefined) updateData.shopName = shopName.trim();
    if (ownerName !== undefined) updateData.ownerName = ownerName.trim();
    if (mobile !== undefined) updateData.mobile = mobile;
    if (email !== undefined)
      updateData.email = email ? email.toLowerCase() : undefined;
    if (gst !== undefined) updateData.gst = gst ? gst.toUpperCase() : undefined;
    if (pan !== undefined) updateData.pan = pan ? pan.toUpperCase() : undefined;
    if (fssai !== undefined) updateData.fssai = fssai;

    if (address !== undefined) {
      updateData.address = {
        ...(existingShop.address || {}),
        ...address,
      };
    }

    await shop.findByIdAndUpdate(_id, updateData);

    return res.status(200).json({
      status: "success",
      message: "Shop updated successfully!",
    });
  } catch (error) {
    return next(new DatabaseError("Failed to update shop"));
  }
};

export const deleteShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const shopId = req.params.id;
  if (!shopId) {
    return next(new ValidationError("Shop ID is required"));
  }
  try {
    const existingShop = await shop.findOne({
      _id: shopId,
      createdBy: req.user,
    });
    if (!existingShop) {
      return next(new NotFoundError("Shop not found"));
    }

    await shop.findByIdAndDelete(shopId);

    return res.status(200).json({
      status: "success",
      message: "Shop deleted successfully!",
    });
  } catch (error) {
    return next(new DatabaseError("Failed to delete shop"));
  }
};
