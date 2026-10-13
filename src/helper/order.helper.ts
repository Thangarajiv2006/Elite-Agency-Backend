import mongoose from "mongoose";
import Order from "../models/order.model";
import Product from "../models/product.model";
import Shop from "../models/shop.model";
import Worker from "../models/worker.model";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../utils/error-handler";

/**
 * Generate unique invoice number in format INV-YYYYMMDD-XXXX
 */
export const generateInvoiceNo = async (): Promise<string> => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    // Count orders created today
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const count = await Order.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    const sequenceNo = String(count + 1).padStart(4, "0");
    return `INV-${dateStr}-${sequenceNo}`;
  } catch (error) {
    throw new DatabaseError("Failed to generate invoice number");
  }
};

/**
 * Create product snapshot from current product data
 */
const createProductSnapshot = (product: any) => {
  return {
    _id: product._id,
    name: product.name,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    MRP: product.MRP,
    HSN: product.HSN,
    CGST: product.CGST,
    SGST: product.SGST,
    unit: product.unit,
    stock: product.stock,
  };
};

/**
 * Calculate item total with GST
 * Formula:
 * - netPrice = sellingPrice (before tax)
 * - taxAmount = netPrice * (CGST + SGST) / 100
 * - totalAmount = netPrice + taxAmount
 */
interface OrderProduct {
  productId: string;
  quantity: number;
  discount?: number;
  free?: number;
}

interface CalculatedItem {
  product: any;
  quantity: number;
  free: number;
  discount: number;
  netPrice: number;
  taxAmount: number;
  totalAmount: number;
}

const calculateItemTotal = (
  product: any,
  quantity: number,
  discount: number = 0,
  free: number = 0,
): CalculatedItem => {
  // Net price = selling price per unit * quantity (free items are not charged)
  const basePrice = product.sellingPrice * quantity;

  // Apply percentage discount
  const netPrice = basePrice - (basePrice * discount) / 100;

  // Calculate GST
  const totalGSTPercent = product.CGST + product.SGST;
  const taxAmount = (netPrice * totalGSTPercent) / 100;

  // Total item amount
  const totalAmount = netPrice + taxAmount;

  return {
    product,
    quantity,
    free: free || 0,
    discount: discount || 0,
    netPrice: Math.round(netPrice * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
};

/**
 * Create a new order with products, shop details, worker details, and payment
 */
export const createOrder = async (
  orderedProducts: OrderProduct[],
  shopId: string,
  paymentMode: "CASH" | "CREDIT",
  createdBy: string,
  initialPayment?: {
    amount: number;
    method?: string;
    reference?: string;
    note?: string;
  },
  workerId?: string,
) => {
  try {
    // Validate products array
    if (!orderedProducts || orderedProducts.length === 0) {
      throw new ValidationError("At least one product is required");
    }

    // Fetch shop data
    const shop = await Shop.findOne({
      _id: shopId,
      createdBy,
    }).lean();

    if (!shop) {
      throw new NotFoundError("Shop not found");
    }

    // Create shop snapshot
    const shopSnapshot: any = {
      _id: shop._id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      address: shop.address ?? null,
      gst: shop.gst ?? null,
      fssai: shop.fssai ?? null,
      pan: shop.pan ?? null,
      mobile: shop.mobile ?? null,
      email: shop.email ?? null,
    };

    // Fetch and create worker snapshot if workerId provided
    let workerSnapshot: any = null;
    if (workerId) {
      const worker = await Worker.findOne({
        _id: workerId,
        createdBy,
      }).lean();

      if (!worker) {
        throw new NotFoundError("Worker not found");
      }

      workerSnapshot = {
        _id: worker._id,
        name: worker.name,
        email: worker.email ?? null,
        mobile: worker.mobile,
        address: worker.address ?? null,
      };
    }

    // Process products and calculate amounts
    let subTotal = 0;
    let totalGST = 0;
    const calculatedProducts: CalculatedItem[] = [];

    const productIds = orderedProducts.map((item) => item.productId);
    const uniqueProductIds = Array.from(new Set(productIds));
    const products = await Product.find({
      _id: { $in: uniqueProductIds },
      createdBy,
    }).lean();

    if (products.length !== uniqueProductIds.length) {
      const foundIds = new Set(
        products.map((product) => product._id.toString()),
      );
      const missing = uniqueProductIds.filter(
        (productId) => !foundIds.has(productId),
      );
      throw new NotFoundError(`Product(s) not found: ${missing.join(", ")}`);
    }

    const totalRequiredPerProduct: Record<string, number> = {};
    for (const item of orderedProducts) {
      const requiredQuantity = item.quantity + (item.free || 0);
      if (requiredQuantity <= 0) {
        throw new ValidationError(
          `Invalid requested quantity for product ${item.productId}`,
        );
      }
      totalRequiredPerProduct[item.productId] =
        (totalRequiredPerProduct[item.productId] || 0) + requiredQuantity;
    }

    const productMap: Record<string, any> = products.reduce(
      (map: Record<string, any>, product: any) => {
        map[product._id.toString()] = product;
        return map;
      },
      {},
    );

    for (const [productId, totalQuantity] of Object.entries(
      totalRequiredPerProduct,
    )) {
      const product = productMap[productId];
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }
      if (product.stock < totalQuantity) {
        throw new ValidationError(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, required: ${totalQuantity}`,
        );
      }
    }

    const stockAdjustments: Record<string, number> = {
      ...totalRequiredPerProduct,
    };

    for (const item of orderedProducts) {
      const product = productMap[item.productId];
      const productSnapshot = createProductSnapshot(product);
      const calculated = calculateItemTotal(
        productSnapshot,
        item.quantity,
        item.discount,
        item.free,
      );

      calculatedProducts.push(calculated);
      subTotal += calculated.netPrice;
      totalGST += calculated.taxAmount;
    }

    // Calculate grand total
    const grandTotal = subTotal + totalGST;

    // Round off calculation (optional - rounds to nearest rupee)
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalGrandTotal = grandTotal + roundOff;

    // Generate invoice number
    const invoiceNo = await generateInvoiceNo();

    // Initialize payments array
    const payments: any[] = [];

    // If CASH payment, add full payment
    if (paymentMode === "CASH") {
      payments.push({
        amount: finalGrandTotal,
        method: "CASH",
        date: new Date(),
        reference: "",
        note: "Cash payment on order creation",
      });
    } else if (initialPayment && initialPayment.amount > 0) {
      // If CREDIT with initial payment
      if (initialPayment.amount > finalGrandTotal && finalGrandTotal > 0) {
        throw new ValidationError("Payment amount cannot exceed grand total");
      }

      payments.push({
        amount: initialPayment.amount,
        method: initialPayment.method || "CASH",
        date: new Date(),
        reference: initialPayment.reference || "",
        note: initialPayment.note || "Initial payment",
      });
    }

    // Create order
    const order = await Order.create({
      invoiceNo,
      invoiceDate: new Date(),
      orderedProducts: calculatedProducts,
      shop: shopSnapshot,
      worker: workerSnapshot,
      subTotal: Math.round(subTotal * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      grandTotal: Math.round(finalGrandTotal * 100) / 100,
      roundOff: Math.round(roundOff * 100) / 100,
      paymentMode,
      payments,
      dueDate:
        paymentMode === "CREDIT"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    // Deduct stock for ordered products
    await Promise.all(
      Object.entries(stockAdjustments).map(([productId, decreaseBy]) =>
        Product.findByIdAndUpdate(productId, {
          $inc: { stock: -decreaseBy },
        }),
      ),
    );

    return order.toObject({ virtuals: true });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to create order");
  }
};

/**
 * Add payment to existing order
 */
export const addPaymentToOrder = async (
  orderId: string,
  amount: number,
  method: "CASH" | "UPI" | "BANK" = "CASH",
  reference?: string,
  note?: string,
  createdBy?: string,
) => {
  try {
    // Validate amount
    if (amount <= 0) {
      throw new ValidationError("Payment amount must be greater than 0");
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Check if createdBy user is authorized (optional security check)
    if (createdBy && order.createdBy.toString() !== createdBy) {
      throw new ValidationError("Not authorized to add payment to this order");
    }

    // Calculate current paid amount
    const paidAmount = order.payments.reduce(
      (sum: number, payment: any) => sum + payment.amount,
      0,
    );

    // Calculate due amount
    const dueAmount = order.grandTotal - paidAmount;

    // Validate payment amount
    if (amount > dueAmount) {
      throw new ValidationError(
        `Payment amount (${amount}) cannot exceed due amount (${dueAmount})`,
      );
    }

    // Add payment to array
    const newPayment = {
      amount,
      method,
      date: new Date(),
      reference: reference || "",
      note: note || "",
    };

    order.payments.push(newPayment);
    await order.save();

    return order.toObject({ virtuals: true });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to add payment");
  }
};

/**
 * Get all orders with pagination and filters
 */
interface GetOrdersOptions {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  paymentStatus?: "PAID" | "PARTIAL" | "UNPAID";
  shopId?: string;
  workerId?: string;
  search?: string;
  createdBy: string;
}

export const getOrders = async (options: GetOrdersOptions) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      paymentStatus,
      shopId,
      workerId,
      search,
      createdBy,
    } = options;

    // Build filter
    const filter: any = { createdBy };

    // Date filter
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.invoiceDate.$gte = start;

        // If only start date is selected, filter for that entire day
        if (!endDate) {
          const end = new Date(startDate);
          end.setHours(23, 59, 59, 999);
          filter.invoiceDate.$lte = end;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.invoiceDate.$lte = end;
      }
    }

    // Shop filter
    if (shopId) {
      filter["shop._id"] = new mongoose.Types.ObjectId(shopId);
    }

    // Worker filter
    if (workerId) {
      filter["worker._id"] = new mongoose.Types.ObjectId(workerId);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { "shop.shopName": { $regex: search, $options: "i" } },
        { "shop.ownerName": { $regex: search, $options: "i" } },
        { "worker.name": { $regex: search, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search,
              options: "i",
            },
          },
        },
      ];
    }

    // Payment status filter (using $expr for derived aggregation logic)
    if (paymentStatus) {
      if (paymentStatus === "UNPAID") {
        filter.$expr = { $eq: [{ $sum: "$payments.amount" }, 0] };
      } else if (paymentStatus === "PAID") {
        filter.$expr = { $gte: [{ $sum: "$payments.amount" }, "$grandTotal"] };
      } else if (paymentStatus === "PARTIAL") {
        filter.$expr = {
          $and: [
            { $gt: [{ $sum: "$payments.amount" }, 0] },
            { $lt: [{ $sum: "$payments.amount" }, "$grandTotal"] },
          ],
        };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch orders
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Order.countDocuments(filter);

    // Get aggregated totals for the entire filtered set
    const aggregateTotals = await Order.aggregate([
      { $match: { ...filter, createdBy: new mongoose.Types.ObjectId(createdBy) } },
      {
        $group: {
          _id: null,
          totalGrandTotal: { $sum: "$grandTotal" },
          totalPaidAmount: { $sum: { $sum: "$payments.amount" } },
        },
      },
    ]);

    const totals = aggregateTotals.length > 0 ? {
      totalGrandTotal: aggregateTotals[0].totalGrandTotal,
      totalPaidAmount: aggregateTotals[0].totalPaidAmount,
      totalDueAmount: aggregateTotals[0].totalGrandTotal - aggregateTotals[0].totalPaidAmount
    } : {
      totalGrandTotal: 0,
      totalPaidAmount: 0,
      totalDueAmount: 0
    };

    // Compute virtuals for response
    const ordersWithVirtuals = orders.map((order: any) => {
      const paidAmount = order.payments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0,
      );
      const dueAmount = order.grandTotal - paidAmount;
      let status = "UNPAID";
      if (dueAmount <= 0) status = "PAID";
      else if (paidAmount > 0) status = "PARTIAL";

      return {
        ...order,
        paidAmount,
        dueAmount,
        paymentStatus: status,
      };
    });

    return {
      data: ordersWithVirtuals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      totals
    };
  } catch (error) {
    throw new DatabaseError("Failed to fetch orders");
  }
};

/**
 * Get single order by ID
 */
export const getOrderById = async (orderId: string, createdBy?: string) => {
  try {
    const filter: any = { _id: orderId };
    if (createdBy) {
      filter.createdBy = new mongoose.Types.ObjectId(createdBy);
    }

    const order = await Order.findOne(filter).lean();
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Compute virtuals
    const paidAmount = order.payments.reduce(
      (sum: number, p: any) => sum + p.amount,
      0,
    );
    const dueAmount = order.grandTotal - paidAmount;
    let status = "UNPAID";
    if (dueAmount <= 0) status = "PAID";
    else if (paidAmount > 0) status = "PARTIAL";

    return {
      ...order,
      paidAmount,
      dueAmount,
      paymentStatus: status,
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch order");
  }
};

/**
 * Get order ledger (payment history)
 */
export const getOrderPaymentLedger = async (
  orderId: string,
  createdBy?: string,
) => {
  try {
    const order = await getOrderById(orderId, createdBy);

    return {
      invoiceNo: order.invoiceNo,
      grandTotal: order.grandTotal,
      payments: order.payments,
      paidAmount: order.payments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0,
      ),
      dueAmount:
        order.grandTotal -
        order.payments.reduce((sum: number, p: any) => sum + p.amount, 0),
      paymentStatus: order.paymentStatus,
    };
  } catch (error) {
    throw error;
  }
};
