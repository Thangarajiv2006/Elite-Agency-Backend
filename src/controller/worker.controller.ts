import { NextFunction, Request, Response } from "express";
import worker from "../models/worker.model";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../utils/error-handler";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;

export const getWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await worker
    .find({ createdBy: req.user })
    .then((data) =>
      res.status(200).json({
        status: "success",
        message: "Workers data are fetched successfully",
        worker: data.map((w) => ({
          _id: w._id,
          name: w.name,
          phone: w.mobile,
          email: w.email,
          address: w.address,
        })),
      }),
    )
    .catch(() => next(new DatabaseError()));
};

export const createWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, phone, address } = req.body;

  if (!name) {
    return next(new ValidationError("Name is required"));
  }
  if (email) {
    if (!emailRegex.test(email)) {
      return next(new ValidationError("Valid email is required"));
    }
  }
  if (!phone || !phoneRegex.test(phone)) {
    return next(new ValidationError("Valid phone number is required"));
  }
  if (!address.plotNo) {
    return next(new ValidationError("Plot number is required"));
  }
  if (!address.street) {
    return next(new ValidationError("Street is required"));
  }
  if (!address.village) {
    return next(new ValidationError("Village is required"));
  }
  if (!address.district) {
    return next(new ValidationError("District is required"));
  }

  const existingWorker = await worker.findOne({ mobile: phone });
  if (existingWorker !== null) {
    return next(new ValidationError("Worker Aldready exist with this mobile"));
  }

  await worker
    .create({
      name,
      email,
      mobile: phone,
      address,
      createdBy: req.user,
    })
    .then((data) => {
      return res.status(201).json({
        status: "success",
        message: "Worker Created Successfully!",
        worker: {
          _id: data._id,
          name: data.name,
          phone: data.mobile,
          email: data.email,
          address: data.address,
        },
      });
    })
    .catch(() => next(new DatabaseError()));
};

export const updateWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, phone, address, _id } = req.body;
  console.log(req.body);

  if (!_id) {
    return next(new ValidationError("Worker ID is required"));
  }
  if (!name) {
    return next(new ValidationError("Name is required"));
  }
  if (email) {
    if (!emailRegex.test(email)) {
      return next(new ValidationError("Valid email is required"));
    }
  }
  if (!phone || !phoneRegex.test(phone)) {
    return next(new ValidationError("Valid phone number is required"));
  }
  if (!address.plotNo) {
    return next(new ValidationError("Plot number is required"));
  }
  if (!address.street) {
    return next(new ValidationError("Street is required"));
  }
  if (!address.village) {
    return next(new ValidationError("Village is required"));
  }
  if (!address.district) {
    return next(new ValidationError("District is required"));
  }

  try {
    // Check if worker exists and belongs to the user
    const existingWorker = await worker.findOne({
      _id: _id,
      createdBy: req.user,
    });
    if (!existingWorker) {
      return next(new NotFoundError("Worker not found"));
    }

    // Check for duplicate phone if phone is being updated
    if (phone && phone !== existingWorker.mobile.toString()) {
      const phoneExists = await worker.findOne({
        mobile: phone,
        _id: { $ne: _id },
      });
      if (phoneExists) {
        return next(
          new ValidationError("Worker already exists with this mobile"),
        );
      }
    }

    // Prepare update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.mobile = phone;
    if (address !== undefined)
      updateData.address = { ...existingWorker.address, ...address };

    await worker.findByIdAndUpdate(_id, updateData).then(() => {
      return res.status(200).json({
        status: "success",
        message: "Worker updated successfully!",
      });
    });
  } catch (error) {
    return next(new DatabaseError());
  }
};

export const deleteWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  if (!id) {
    return next(new ValidationError("Worker ID is required"));
  }

  try {
    // Check if worker exists and belongs to the user
    const existingWorker = await worker.findOne({
      _id: id,
      createdBy: req.user,
    });
    if (!existingWorker) {
      return next(new NotFoundError("Worker not found"));
    }

    await worker.findByIdAndDelete(id);

    return res.status(200).json({
      status: "success",
      message: "Worker deleted successfully!",
    });
  } catch (error) {
    return next(new DatabaseError());
  }
};
