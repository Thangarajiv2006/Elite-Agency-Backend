import { NextFunction, Request, Response } from "express";
import {
  createCategoryStockEntry,
  getCategoryStockHistory,
} from "../helper/stock.helper";
import { ValidationError } from "../utils/error-handler";

export const createCategoryStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { categoryId, products } = req.body;

  if (!categoryId) {
    return next(new ValidationError("Category ID is required"));
  }
  if (!Array.isArray(products) || products.length === 0) {
    return next(
      new ValidationError("Products array is required and cannot be empty"),
    );
  }

  for (const item of products) {
    if (!item.productId || !item.quantity) {
      return next(
        new ValidationError("Each product must have productId and quantity"),
      );
    }
  }

  try {
    const entry = await createCategoryStockEntry(
      categoryId,
      products,
      req.user,
    );
    res.status(201).json({
      success: true,
      message: "success",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { categoryId } = req.params as { categoryId: string };
  const { page, limit, startDate, endDate } = req.query;

  if (!categoryId) {
    return next(new ValidationError("Category ID is required"));
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 30;
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  try {
    const result = await getCategoryStockHistory(
      categoryId,
      req.user,
      pageNum,
      limitNum,
      start,
      end,
    );
    res.status(200).json({
      success: true,
      message: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
