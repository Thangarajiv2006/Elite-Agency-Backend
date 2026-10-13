import mongoose from "mongoose";
import product from "../models/product.model";
import category from "../models/categories.model";
import categoryStockEntry from "../models/categoryStockEntry.model";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../utils/error-handler";

export const createCategoryStockEntry = async (
  categoryId: string,
  products: { productId: string; quantity: number }[],
  createdBy: string,
) => {
  try {
    // Fetch category
    const cat = await category.findOne({ _id: categoryId, createdBy });
    if (!cat) {
      throw new NotFoundError("Category not found");
    }

    const entryProducts: any[] = [];

    for (const item of products) {
      const { productId, quantity } = item;

      if (quantity <= 0) {
        throw new ValidationError("Quantity must be greater than 0");
      }

      const prod = await product.findOne({ _id: productId, createdBy });
      if (!prod) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }

      // Check if category matches
      if (prod.categoryId.toString() !== categoryId) {
        throw new ValidationError(
          `Product ${prod.name} does not belong to the specified category`,
        );
      }

      const previousStock = prod.stock;
      const updatedStock = previousStock + quantity;

      // Update product stock
      await product.findByIdAndUpdate(productId, { stock: updatedStock });

      // Push snapshot
      entryProducts.push({
        product: {
          name: prod.name,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          MRP: prod.MRP,
          HSN: prod.HSN,
          CGST: prod.CGST,
          SGST: prod.SGST,
          unit: prod.unit,
        },
        quantity,
        previousStock,
        updatedStock,
      });
    }

    // Fetch category name - assuming categoryId is ObjectId, need to fetch name
    // For now, assume categoryId is the name, but actually it's ObjectId
    // The schema has category: { name }, so need to fetch from category model
    // Assuming there's a category model, but not provided. For simplicity, set name to categoryId for now.

    const entry = await categoryStockEntry.create([
      {
        category: { name: cat.name },
        products: entryProducts,
        createdBy,
      },
    ]);

    return entry[0];
  } catch (error) {
    throw error;
  } finally {
  }
};

export const getCategoryStockHistory = async (
  categoryId: string,
  createdBy: string,
  page: number = 1,
  limit: number = 30,
  startDate?: Date,
  endDate?: Date,
) => {
  // Fetch category to get name
  const cat = await category.findOne({ _id: categoryId, createdBy });
  if (!cat) {
    throw new NotFoundError("Category not found");
  }

  const filter: any = {
    createdBy,
    "category.name": cat.name,
  };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const entries = await categoryStockEntry
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await categoryStockEntry.countDocuments(filter);

  return {
    entries,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
  };
};
