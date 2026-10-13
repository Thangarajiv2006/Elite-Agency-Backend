import { NextFunction, Request, Response } from "express";
import category from "../models/categories.model";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../utils/error-handler";

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await category
    .find({ createdBy: req.user })
    .then((data) =>
      res.status(200).json({
        status: "success",
        message: "Categories data are fetched successfully",
        categories: data.map((c) => ({
          _id: c._id,
          name: c.name,
        })),
      }),
    )
    .catch(() => next(new DatabaseError()));
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return next(new ValidationError("Category name is required"));
  }

  const existingCategory = await category.findOne({
    name: name.trim(),
    createdBy: req.user,
  });
  if (existingCategory) {
    return next(new ValidationError("Category already exists"));
  }

  await category
    .create({
      name: name.trim(),
      createdBy: req.user,
    })
    .then((data) => {
      return res.status(201).json({
        status: "success",
        message: "Category Created Successfully!",
        category: {
          _id: data._id,
          name: data.name,
        },
      });
    })
    .catch(() => next(new DatabaseError()));
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  if (!id) {
    return next(new ValidationError("Category ID is required"));
  }

  try {
    // Check if category exists and belongs to the user
    const existingCategory = await category.findOne({
      _id: id,
      createdBy: req.user,
    });
    if (!existingCategory) {
      return next(new NotFoundError("Category not found"));
    }

    await category.findByIdAndDelete(id);

    return res.status(200).json({
      status: "success",
      message: "Category deleted successfully!",
    });
  } catch (error) {
    return next(new DatabaseError());
  }
};
