import Order from "../models/order.model";
import Shop from "../models/shop.model";
import { ValidationError } from "../utils/error-handler";

interface DateRange {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

interface CacheRecord<T> {
  expiry: number;
  value: T;
}

const cache: Record<string, CacheRecord<any>> = {};
const CACHE_TTL_MS = 30 * 1000;

const getCacheKey = (key: string, params: Record<string, any>) => {
  return `${key}:${JSON.stringify(params)}`;
};

const getCached = <T>(
  key: string,
  params: Record<string, any>,
): T | undefined => {
  const cacheKey = getCacheKey(key, params);
  const record = cache[cacheKey];
  if (!record) return undefined;
  if (Date.now() > record.expiry) {
    delete cache[cacheKey];
    return undefined;
  }
  return record.value as T;
};

const setCache = <T>(key: string, params: Record<string, any>, value: T) => {
  const cacheKey = getCacheKey(key, params);
  cache[cacheKey] = {
    value,
    expiry: Date.now() + CACHE_TTL_MS,
  };
};

const parseDate = (value?: string, endOfDay = false): Date | undefined => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid date: ${value}`);
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const buildDateMatch = ({ startDate, endDate }: DateRange) => {
  const filter: any = {};
  if (startDate || endDate) {
    filter.invoiceDate = {};
    if (startDate) filter.invoiceDate.$gte = startDate;
    if (endDate) filter.invoiceDate.$lte = endDate;
  }
  return filter;
};

const buildDateGroupId = (range: string) => {
  switch (range) {
    case "daily":
      return {
        $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" },
      };
    case "weekly":
      return {
        year: { $year: "$invoiceDate" },
        week: { $isoWeek: "$invoiceDate" },
      };
    case "monthly":
      return {
        $dateToString: { format: "%Y-%m", date: "$invoiceDate" },
      };
    case "yearly":
      return {
        $dateToString: { format: "%Y", date: "$invoiceDate" },
      };
    default:
      throw new ValidationError(
        "range must be one of daily, weekly, monthly, yearly",
      );
  }
};

export const getRevenueAnalytics = async (
  range: string,
  startDate?: string,
  endDate?: string,
) => {
  const cacheParams = { range, startDate, endDate };
  const cached = getCached("revenue", cacheParams);
  if (cached) return cached;

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const match = buildDateMatch({ startDate: start, endDate: end });

  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: buildDateGroupId(range),
        revenue: { $sum: "$grandTotal" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$revenue" },
        data: {
          $push: {
            period: "$_id",
            revenue: "$revenue",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        data: 1,
      },
    },
  ];

  const result = await Order.aggregate(pipeline).exec();
  const response = result[0] ?? { totalRevenue: 0, data: [] };
  setCache("revenue", cacheParams, response);
  return response;
};

export const getTopSellingProducts = async (
  startDate?: string,
  endDate?: string,
  limit = 10,
) => {
  const cacheParams = { startDate, endDate, limit };
  const cached = getCached("topProducts", cacheParams);
  if (cached) return cached;

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const match = buildDateMatch({ startDate: start, endDate: end });

  const pipeline: any[] = [
    { $match: match },
    { $unwind: "$orderedProducts" },
    {
      $group: {
        _id: "$orderedProducts.product.name",
        totalQuantity: { $sum: "$orderedProducts.quantity" },
      },
    },
    {
      $project: {
        _id: 0,
        productName: "$_id",
        totalQuantity: 1,
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
  ];

  const result = await Order.aggregate(pipeline).exec();
  setCache("topProducts", cacheParams, result);
  return result;
};

export const getCustomerInsights = async (
  startDate?: string,
  endDate?: string,
) => {
  const cacheParams = { startDate, endDate };
  const cached = getCached("customerInsights", cacheParams);
  if (cached) return cached;

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const dateMatch = buildDateMatch({ startDate: start, endDate: end });

  const totalCustomers = await Shop.countDocuments().exec();

  const newCustomerFilter: any = {};
  if (start || end) {
    newCustomerFilter.createdAt = {};
    if (start) newCustomerFilter.createdAt.$gte = start;
    if (end) newCustomerFilter.createdAt.$lte = end;
  }

  const newCustomers = await Shop.countDocuments(newCustomerFilter).exec();

  const repeatPipeline = [
    { $match: dateMatch },
    {
      $group: {
        _id: "$shop._id",
        orderCount: { $sum: 1 },
      },
    },
    { $match: { orderCount: { $gt: 1 } } },
    { $count: "repeatCustomers" },
  ];

  const repeatResult = await Order.aggregate(repeatPipeline).exec();
  const repeatCustomers = repeatResult[0]?.repeatCustomers ?? 0;

  const response = { totalCustomers, newCustomers, repeatCustomers };
  setCache("customerInsights", cacheParams, response);
  return response;
};

export const getPaymentDistribution = async (
  startDate?: string,
  endDate?: string,
) => {
  const cacheParams = { startDate, endDate };
  const cached = getCached("paymentDistribution", cacheParams);
  if (cached) return cached;

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const match = buildDateMatch({ startDate: start, endDate: end });

  const pipeline: any[] = [
    { $match: match },
    { $unwind: "$payments" },
    {
      $group: {
        _id: "$payments.method",
        amount: { $sum: "$payments.amount" },
      },
    },
    {
      $project: {
        _id: 0,
        method: "$_id",
        amount: 1,
      },
    },
  ];

  const result = await Order.aggregate(pipeline).exec();
  const distribution = result.reduce(
    (acc: Record<string, number>, item: { method: string; amount: number }) => {
      acc[item.method] = item.amount;
      return acc;
    },
    { CASH: 0, UPI: 0, BANK: 0 },
  );

  setCache("paymentDistribution", cacheParams, distribution);
  return distribution;
};

const computePaymentStatus = () => ({
  $switch: {
    branches: [
      {
        case: { $lte: ["$grandTotal", { $sum: "$payments.amount" }] },
        then: "PAID",
      },
      {
        case: { $eq: [{ $sum: "$payments.amount" }, 0] },
        then: "UNPAID",
      },
    ],
    default: "PARTIAL",
  },
});

export const getInvoiceStatusSummary = async (
  startDate?: string,
  endDate?: string,
) => {
  const cacheParams = { startDate, endDate };
  const cached = getCached("invoiceStatus", cacheParams);
  if (cached) return cached;

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const match = buildDateMatch({ startDate: start, endDate: end });

  const pipeline: any[] = [
    { $match: match },
    {
      $project: {
        status: computePaymentStatus(),
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
  ];

  const result = await Order.aggregate(pipeline).exec();
  const summary = result.reduce(
    (acc: Record<string, number>, item: { status: string; count: number }) => {
      acc[item.status] = item.count;
      return acc;
    },
    { PAID: 0, PARTIAL: 0, UNPAID: 0 },
  );

  setCache("invoiceStatus", cacheParams, summary);
  return summary;
};

export const getSalesByHour = async (startDate?: string, endDate?: string) => {
  const cacheParams = { startDate, endDate };
  const cached = getCached("salesByHour", cacheParams);
  if (cached) return cached;

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const match = buildDateMatch({ startDate: start, endDate: end });

  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: { $hour: "$invoiceDate" },
        totalSales: { $sum: "$grandTotal" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        hour: "$_id",
        totalSales: 1,
      },
    },
  ];

  const result = await Order.aggregate(pipeline).exec();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    totalSales: 0,
  }));

  result.forEach((item: { hour: number; totalSales: number }) => {
    hourly[item.hour] = item;
  });

  setCache("salesByHour", cacheParams, hourly);
  return hourly;
};

export const getRecentInvoices = async (limit = 10) => {
  const cacheParams = { limit };
  const cached = getCached("recentInvoices", cacheParams);
  if (cached) return cached;

  const pipeline: any[] = [
    { $sort: { invoiceDate: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        invoiceId: "$invoiceNo",
        customerName: "$shop.shopName",
        totalAmount: "$grandTotal",
        status: computePaymentStatus(),
        createdAt: "$invoiceDate",
      },
    },
  ];

  const result = await Order.aggregate(pipeline).exec();
  setCache("recentInvoices", cacheParams, result);
  return result;
};
