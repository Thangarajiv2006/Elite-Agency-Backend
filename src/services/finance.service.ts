import mongoose from "mongoose";
import Order from "../models/order.model";
import Shop from "../models/shop.model";
import Product from "../models/product.model";
import { calculatePriorityForInvoices } from "./priority.service";

// Helper to parse date consistently
const parseDate = (value?: string, endOfDay = false): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

// 1. getRevenue
export const getRevenue = async (
  startDate: string,
  endDate: string,
  createdBy: string,
) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);

  const match: any = { createdBy: new mongoose.Types.ObjectId(createdBy) };
  if (start || end) {
    match.invoiceDate = {};
    if (start) match.invoiceDate.$gte = start;
    if (end) match.invoiceDate.$lte = end;
  }

  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
        revenue: { $sum: "$grandTotal" },
      },
    },
    { $sort: { _id: 1 as const } },
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
  return result[0] ?? { totalRevenue: 0, data: [] };
};

// 2. compareRevenue
export const compareRevenue = async (
  startDate: string,
  endDate: string,
  createdBy: string,
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays);
  const prevEnd = new Date(end);
  prevEnd.setDate(prevEnd.getDate() - diffDays);

  const prevStartStr = prevStart.toISOString().split("T")[0]!;
  const prevEndStr = prevEnd.toISOString().split("T")[0]!;

  const currentRev = await getRevenue(startDate, endDate, createdBy);
  const previousRev = await getRevenue(prevStartStr, prevEndStr, createdBy);

  const currentTotal = currentRev.totalRevenue;
  const previousTotal = previousRev.totalRevenue;

  let percentageChange = 0;
  if (previousTotal > 0) {
    percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
  } else if (currentTotal > 0) {
    percentageChange = 100;
  }

  return {
    currentPeriod: { startDate, endDate, totalRevenue: currentTotal },
    previousPeriod: {
      startDate: prevStartStr,
      endDate: prevEndStr,
      totalRevenue: previousTotal,
    },
    percentageChange: Math.round(percentageChange * 100) / 100,
  };
};

// 3. getInvoiceSummary
export const getInvoiceSummary = async (
  startDate: string,
  endDate: string,
  createdBy: string,
) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);

  const match: any = { createdBy: new mongoose.Types.ObjectId(createdBy) };
  if (start || end) {
    match.invoiceDate = {};
    if (start) match.invoiceDate.$gte = start;
    if (end) match.invoiceDate.$lte = end;
  }

  const pipeline: any[] = [
    { $match: match },
    {
      $project: {
        grandTotal: 1,
        paidAmount: { $sum: "$payments.amount" },
        status: {
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
        },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$grandTotal" },
        totalPaid: { $sum: "$paidAmount" },
      },
    },
  ];

  const result = await Order.aggregate(pipeline).exec();

  const summary = result.reduce(
    (acc: any, item: any) => {
      acc[item._id] = {
        count: item.count,
        totalAmount: Math.round(item.totalAmount * 100) / 100,
        totalPaid: Math.round(item.totalPaid * 100) / 100,
        totalDue: Math.round((item.totalAmount - item.totalPaid) * 100) / 100,
      };
      acc.totalCount += item.count;
      acc.totalAmount += item.totalAmount;
      acc.totalPaid += item.totalPaid;
      return acc;
    },
    {
      PAID: { count: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 },
      PARTIAL: { count: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 },
      UNPAID: { count: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 },
      totalCount: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
    },
  );

  summary.totalDue =
    Math.round((summary.totalAmount - summary.totalPaid) * 100) / 100;
  summary.totalAmount = Math.round(summary.totalAmount * 100) / 100;
  summary.totalPaid = Math.round(summary.totalPaid * 100) / 100;

  return summary;
};

// 4. getOutstandingPayments
export const getOutstandingPayments = async (
  startDate: string,
  endDate: string,
  createdBy: string,
) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);

  const match: any = { createdBy: new mongoose.Types.ObjectId(createdBy) };
  if (start || end) {
    match.invoiceDate = {};
    if (start) match.invoiceDate.$gte = start;
    if (end) match.invoiceDate.$lte = end;
  }

  // Find all unpaid or partial orders in the date range
  const outstandingOrders = await Order.find({
    ...match,
    $expr: {
      $lt: [{ $sum: "$payments.amount" }, "$grandTotal"],
    },
  }).lean();

  return await calculatePriorityForInvoices(outstandingOrders, createdBy);
};

// 5. getTopProducts
export const getTopProducts = async (
  startDate: string,
  endDate: string,
  limit: number,
  createdBy: string,
) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);

  const match: any = { createdBy: new mongoose.Types.ObjectId(createdBy) };
  if (start || end) {
    match.invoiceDate = {};
    if (start) match.invoiceDate.$gte = start;
    if (end) match.invoiceDate.$lte = end;
  }

  const pipeline: any[] = [
    { $match: match },
    { $unwind: "$orderedProducts" },
    {
      $group: {
        _id: "$orderedProducts.product.name",
        totalQuantity: { $sum: "$orderedProducts.quantity" },
        totalRevenue: { $sum: "$orderedProducts.totalAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        productName: "$_id",
        totalQuantity: 1,
        totalRevenue: { $round: ["$totalRevenue", 2] },
      },
    },
    { $sort: { totalQuantity: -1 as const } },
    { $limit: limit },
  ];

  return await Order.aggregate(pipeline).exec();
};

// 6. getStockSummary
export const getStockSummary = async (createdBy: string) => {
  const match = { createdBy: new mongoose.Types.ObjectId(createdBy) };

  const totalProducts = await Product.countDocuments(match).exec();
  const outOfStock = await Product.countDocuments({
    ...match,
    stock: 0,
  }).exec();
  const lowStock = await Product.countDocuments({
    ...match,
    stock: { $gt: 0, $lte: 10 },
  }).exec();

  const lowStockDetails = await Product.find({ ...match, stock: { $lte: 10 } })
    .select("name stock unit sellingPrice")
    .sort({ stock: 1 })
    .limit(10)
    .lean();

  return {
    totalProducts,
    outOfStock,
    lowStock,
    details: lowStockDetails.map((p: any) => ({
      name: p.name,
      stock: p.stock,
      unit: p.unit || "pcs",
      price: p.sellingPrice,
      status: p.stock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
    })),
  };
};

// 7. getCustomerInsights
export const getCustomerInsights = async (
  startDate: string,
  endDate: string,
  createdBy: string,
) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  const createdByObj = new mongoose.Types.ObjectId(createdBy);

  const totalCustomers = await Shop.countDocuments({
    createdBy: createdByObj,
  }).exec();

  const newCustomerFilter: any = { createdBy: createdByObj };
  if (start || end) {
    newCustomerFilter.createdAt = {};
    if (start) newCustomerFilter.createdAt.$gte = start;
    if (end) newCustomerFilter.createdAt.$lte = end;
  }
  const newCustomers = await Shop.countDocuments(newCustomerFilter).exec();

  const match: any = { createdBy: createdByObj };
  if (start || end) {
    match.invoiceDate = {};
    if (start) match.invoiceDate.$gte = start;
    if (end) match.invoiceDate.$lte = end;
  }

  const repeatPipeline = [
    { $match: match },
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

  return {
    totalCustomers,
    newCustomers,
    repeatCustomers,
  };
};

// 8. getFinancialSummary
export const getFinancialSummary = async (
  startDate: string,
  endDate: string,
  createdBy: string,
) => {
  const [revenue, invoiceSummary, topProducts, stockSummary, customerInsights] =
    await Promise.all([
      getRevenue(startDate, endDate, createdBy),
      getInvoiceSummary(startDate, endDate, createdBy),
      getTopProducts(startDate, endDate, 5, createdBy),
      getStockSummary(createdBy),
      getCustomerInsights(startDate, endDate, createdBy),
    ]);

  return {
    startDate,
    endDate,
    revenue: {
      totalRevenue: revenue.totalRevenue,
    },
    invoices: invoiceSummary,
    topProducts,
    stock: {
      totalProducts: stockSummary.totalProducts,
      outOfStock: stockSummary.outOfStock,
      lowStock: stockSummary.lowStock,
    },
    customers: customerInsights,
  };
};
