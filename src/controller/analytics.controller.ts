import { NextFunction, Request, Response } from "express";
import {
  getRevenueAnalytics,
  getTopSellingProducts,
  getCustomerInsights,
  getPaymentDistribution,
  getInvoiceStatusSummary,
  getSalesByHour,
  getRecentInvoices,
} from "../services/analytics.service";
import { ValidationError } from "../utils/error-handler";

const validateDateRange = (startDate?: string, endDate?: string) => {
  if (startDate && isNaN(Date.parse(startDate))) {
    throw new ValidationError("Invalid startDate format");
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    throw new ValidationError("Invalid endDate format");
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new ValidationError("startDate cannot be after endDate");
  }
};

const validateRange = (range?: string) => {
  const allowed = ["daily", "weekly", "monthly", "yearly"];
  if (range && !allowed.includes(range)) {
    throw new ValidationError(
      "range must be daily, weekly, monthly, or yearly",
    );
  }
};

export const getRevenueAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const range = (req.query.range as string) || "daily";
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    validateRange(range);
    validateDateRange(startDate, endDate);

    const data = await getRevenueAnalytics(range, startDate, endDate);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTopProductsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      startDate,
      endDate,
      limit = "10",
    } = req.query as {
      startDate?: string;
      endDate?: string;
      limit?: string;
    };

    validateDateRange(startDate, endDate);

    const limitNumber = parseInt(limit, 10);
    if (isNaN(limitNumber) || limitNumber < 1) {
      throw new ValidationError("limit must be a positive integer");
    }

    const data = await getTopSellingProducts(startDate, endDate, limitNumber);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCustomerInsightsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    validateDateRange(startDate, endDate);

    const data = await getCustomerInsights(startDate, endDate);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getPaymentDistributionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    validateDateRange(startDate, endDate);

    const data = await getPaymentDistribution(startDate, endDate);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    validateDateRange(startDate, endDate);

    const data = await getInvoiceStatusSummary(startDate, endDate);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSalesByTimeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    validateDateRange(startDate, endDate);

    const data = await getSalesByHour(startDate, endDate);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getRecentInvoicesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { limit = "10" } = req.query as { limit?: string };
    const limitNumber = parseInt(limit, 10);
    if (isNaN(limitNumber) || limitNumber < 1) {
      throw new ValidationError("limit must be a positive integer");
    }

    const data = await getRecentInvoices(limitNumber);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
