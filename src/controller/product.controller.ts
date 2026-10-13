import { NextFunction, Request, Response } from "express";
import product from "../models/product.model";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../utils/error-handler";

const createInsensitiveRegex = (value: string) => {
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    name,
    costPrice,
    sellingPrice,
    MRP,
    HSN,
    CGST,
    SGST,
    stock,
    unit,
    categoryId,
  } = req.body;

  if (!name || !name.trim()) {
    return next(new ValidationError("Product name is required"));
  }
  if (costPrice === undefined || costPrice < 0) {
    return next(new ValidationError("Valid cost price is required"));
  }
  if (sellingPrice === undefined || sellingPrice < 0) {
    return next(new ValidationError("Valid selling price is required"));
  }
  if (!HSN || !HSN.trim()) {
    return next(new ValidationError("HSN is required"));
  }
  if (CGST === undefined || CGST < 0 || CGST > 100) {
    return next(new ValidationError("Valid CGST (0-100) is required"));
  }
  if (SGST === undefined || SGST < 0 || SGST > 100) {
    return next(new ValidationError("Valid SGST (0-100) is required"));
  }
  if (!categoryId) {
    return next(new ValidationError("Category ID is required"));
  }

  try {
    const newProduct = await product.create({
      name: name.trim(),
      costPrice,
      sellingPrice,
      MRP: MRP || undefined,
      HSN: HSN.trim(),
      CGST,
      SGST,
      stock: stock !== undefined ? stock : 0,
      unit: unit || "pcs",
      createdBy: req.user,
      categoryId,
    });

    res.status(201).json({
      status: "success",
      message: "Product created successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.log(error);
    next(new DatabaseError("Failed to create product"));
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const search = req.query.search
      ? String(req.query.search).trim()
      : undefined;

    const categoryId = req.query.categoryId
      ? String(req.query.categoryId).trim()
      : undefined;

    const stockBelow = req.query.stockBelow
      ? Number(req.query.stockBelow)
      : undefined;

    const skip = (page - 1) * limit;

    // 🔥 Dynamic filter
    const filter: any = {
      createdBy: req.user,
    };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (stockBelow !== undefined && !isNaN(stockBelow)) {
      filter.stock = { $lt: stockBelow };
    }

    if (search) {
      filter["$or"] = [
        { name: createInsensitiveRegex(search) },
        { HSN: createInsensitiveRegex(search) },
      ];
    }

    // ✅ Main data
    const products = await product
      .find(filter)
      .populate("categoryId", "name")
      .skip(skip)
      .limit(limit)
      .lean();

    // Count total products in category (without search filter)
    const categoryFilter: any = { createdBy: req.user };
    if (categoryId) {
      categoryFilter.categoryId = categoryId;
    }
    const totalDoc = await product.countDocuments(categoryFilter);
    const queriedDoc = await product.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      message: "Products fetched successfully",
      products,
      total: totalDoc,
      currentPage: page,
      totalPages: Math.ceil(queriedDoc / limit),
      queriedTotal: queriedDoc,
    });
  } catch (error) {
    next(new DatabaseError());
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    _id,
    name,
    costPrice,
    sellingPrice,
    MRP,
    HSN,
    CGST,
    SGST,
    unit,
    categoryId,
  } = req.body;

  if (!_id) {
    return next(new ValidationError("Product ID is required"));
  }

  if (name !== undefined && !name.trim()) {
    return next(new ValidationError("Product name is required"));
  }
  if (costPrice !== undefined && costPrice < 0) {
    return next(new ValidationError("Valid cost price is required"));
  }
  if (sellingPrice !== undefined && sellingPrice < 0) {
    return next(new ValidationError("Valid selling price is required"));
  }
  if (HSN !== undefined && !HSN.trim()) {
    return next(new ValidationError("HSN is required"));
  }
  if (CGST !== undefined && (CGST < 0 || CGST > 100)) {
    return next(new ValidationError("Valid CGST (0-100) is required"));
  }
  if (SGST !== undefined && (SGST < 0 || SGST > 100)) {
    return next(new ValidationError("Valid SGST (0-100) is required"));
  }

  try {
    const existingProduct = await product.findOne({ _id, createdBy: req.user });
    if (!existingProduct) {
      return next(new NotFoundError("Product not found"));
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
    if (MRP !== undefined) updateData.MRP = MRP;
    if (HSN !== undefined) updateData.HSN = HSN.trim();
    if (CGST !== undefined) updateData.CGST = CGST;
    if (SGST !== undefined) updateData.SGST = SGST;
    if (unit !== undefined) updateData.unit = unit;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    await product.findByIdAndUpdate(_id, updateData);

    return res.status(200).json({
      status: "success",
      message: "Product updated successfully!",
    });
  } catch (error) {
    return next(new DatabaseError("Failed to update product"));
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  if (!id) {
    return next(new ValidationError("Product ID is required"));
  }

  try {
    const deletedProduct = await product.findOneAndDelete({
      _id: id,
      createdBy: req.user,
    });
    if (!deletedProduct) {
      return next(new NotFoundError("Product not found"));
    }

    return res.status(200).json({
      status: "success",
      message: "Product deleted successfully!",
    });
  } catch (error) {
    return next(new DatabaseError("Failed to delete product"));
  }
};
