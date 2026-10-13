import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
  createOrder,
  addPaymentToOrder,
  getOrders,
  getOrderById,
  getOrderPaymentLedger,
} from "../helper/order.helper";
import { ValidationError } from "../utils/error-handler";

/**
 * CREATE ORDER
 * POST /api/orders
 */
export const createOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderedProducts, shopId, paymentMode, initialPayment, workerId } =
      req.body;
    const createdBy =
      (req as any).user ?? (req as any).user?.id ?? (req as any).user?._id;

    // Validate required fields
    if (
      !orderedProducts ||
      !Array.isArray(orderedProducts) ||
      orderedProducts.length === 0
    ) {
      return next(
        new ValidationError(
          "orderedProducts array is required and must not be empty",
        ),
      );
    }

    if (!shopId) {
      return next(new ValidationError("shopId is required"));
    }

    if (!paymentMode || !["CASH", "CREDIT"].includes(paymentMode)) {
      return next(new ValidationError("paymentMode must be CASH or CREDIT"));
    }

    // Validate workerId if provided
    if (workerId && !mongoose.Types.ObjectId.isValid(workerId)) {
      return next(new ValidationError("Invalid workerId format"));
    }

    // Validate products in array
    for (const item of orderedProducts) {
      if (!item.productId) {
        return next(
          new ValidationError("productId is required for each product"),
        );
      }
      if (!item.quantity || item.quantity <= 0) {
        return next(new ValidationError("quantity must be greater than 0"));
      }
    }

    // Validate initial payment if provided
    if (initialPayment) {
      if (initialPayment.amount === undefined || initialPayment.amount <= 0) {
        return next(
          new ValidationError("initialPayment amount must be greater than 0"),
        );
      }
      if (
        initialPayment.method &&
        !["CASH", "UPI", "BANK"].includes(initialPayment.method)
      ) {
        return next(
          new ValidationError(
            "initialPayment method must be CASH, UPI, or BANK",
          ),
        );
      }
    }

    const order = await createOrder(
      orderedProducts,
      shopId,
      paymentMode,
      createdBy,
      initialPayment,
      workerId,
    );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADD PAYMENT TO ORDER
 * PATCH /api/orders/:id/payment
 */
export const addPaymentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const { amount, method, reference, note } = req.body;
    const createdBy =
      (req as any).user ?? (req as any).user?.id ?? (req as any).user?._id;

    // Validate amount
    if (amount === undefined || typeof amount !== "number" || amount <= 0) {
      return next(new ValidationError("amount must be a positive number"));
    }

    // Validate method
    if (method && !["CASH", "UPI", "BANK"].includes(method)) {
      return next(new ValidationError("method must be CASH, UPI, or BANK"));
    }

    const order = await addPaymentToOrder(
      id,
      amount,
      method || "CASH",
      reference,
      note,
      createdBy,
    );

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ALL ORDERS
 * GET /api/orders
 * Query params: page, limit, startDate, endDate, paymentStatus, shopId
 */
export const getOrdersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const createdBy =
      (req as any).user ?? (req as any).user?.id ?? (req as any).user?._id;
    const {
      page = "1",
      limit = "10",
      startDate,
      endDate,
      paymentStatus,
      shopId,
      workerId,
      search,
    } = req.query;

    // Validate pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;

    if (pageNum < 1 || limitNum < 1) {
      return next(
        new ValidationError("page and limit must be positive numbers"),
      );
    }

    // Validate payment status if provided
    if (
      paymentStatus &&
      !["PAID", "PARTIAL", "UNPAID"].includes(paymentStatus as string)
    ) {
      return next(
        new ValidationError("paymentStatus must be PAID, PARTIAL, or UNPAID"),
      );
    }

    // Validate workerId if provided
    if (workerId && !mongoose.Types.ObjectId.isValid(workerId as string)) {
      return next(new ValidationError("Invalid workerId format"));
    }

    // Parse dates if provided
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;

    if (startDate) {
      startDateObj = new Date(startDate as string);
      if (isNaN(startDateObj.getTime())) {
        return next(new ValidationError("Invalid startDate format"));
      }
    }

    if (endDate) {
      endDateObj = new Date(endDate as string);
      if (isNaN(endDateObj.getTime())) {
        return next(new ValidationError("Invalid endDate format"));
      }
    }

    const result = await getOrders({
      page: pageNum,
      limit: limitNum,
      ...(startDateObj && { startDate: startDateObj }),
      ...(endDateObj && { endDate: endDateObj }),
      ...(paymentStatus && {
        paymentStatus: paymentStatus as "PAID" | "PARTIAL" | "UNPAID",
      }),
      ...(shopId && { shopId: shopId as string }),
      ...(workerId && { workerId: workerId as string }),
      ...(search && { search: search as string }),
      createdBy,
    });

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: result.data,
      pagination: result.pagination,
      totals: result.totals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET SINGLE ORDER
 * GET /api/orders/:id
 */
export const getOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const createdBy =
      (req as any).user ?? (req as any).user?.id ?? (req as any).user?._id;

    const order = await getOrderById(id, createdBy);

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ORDER PAYMENT LEDGER
 * GET /api/orders/:id/ledger
 */
export const getOrderLedgerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const createdBy =
      (req as any).user ?? (req as any).user?.id ?? (req as any).user?._id;

    const ledger = await getOrderPaymentLedger(id, createdBy);

    res.status(200).json({
      success: true,
      message: "Order payment ledger retrieved successfully",
      data: ledger,
    });
  } catch (error) {
    next(error);
  }
};
