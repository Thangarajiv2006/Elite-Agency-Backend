import mongoose from "mongoose";
import Order from "../models/order.model";

export interface OutstandingInvoiceInfo {
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date | null;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  daysOverdue: number;
  shop: {
    _id: string;
    shopName: string;
    ownerName: string;
    mobile?: string;
  };
  priority: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
}

/**
 * Calculates a deterministic priority risk score and detailed reasons
 * for outstanding invoices based on amount, days overdue, and customer payment history.
 */
export const calculatePriorityForInvoices = async (
  outstandingOrders: any[],
  createdBy: string,
): Promise<OutstandingInvoiceInfo[]> => {
  const now = new Date();

  // Fetch shop payment history for all shops involved
  const shopIds = Array.from(
    new Set(
      outstandingOrders
        .map((order) => order.shop?._id?.toString())
        .filter(Boolean),
    ),
  ) as string[];

  // Fetch all historic orders for these shops to analyze their payment behavior
  const historicOrders = await Order.find({
    "shop._id": { $in: shopIds.map((id) => new mongoose.Types.ObjectId(id)) },
    createdBy: new mongoose.Types.ObjectId(createdBy),
  }).lean();

  // Group historic orders by shopId
  const ordersByShop: Record<string, any[]> = {};
  historicOrders.forEach((order) => {
    const sId = order.shop?._id?.toString();
    if (sId) {
      if (!ordersByShop[sId]) {
        ordersByShop[sId] = [];
      }
      ordersByShop[sId].push(order);
    }
  });

  const results: OutstandingInvoiceInfo[] = [];

  for (const order of outstandingOrders) {
    const paidAmount = order.payments.reduce(
      (sum: number, p: any) => sum + p.amount,
      0,
    );
    const dueAmount = order.grandTotal - paidAmount;

    // Days overdue
    let daysOverdue = 0;
    if (order.dueDate) {
      const due = new Date(order.dueDate);
      if (now > due) {
        const diffTime = now.getTime() - due.getTime();
        daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    const shopIdStr = order.shop?._id?.toString() || "";
    const shopOrders = ordersByShop[shopIdStr] || [];

    // Analyze customer behavior
    let latePaymentsCount = 0;
    let otherOverdueCount = 0;

    shopOrders.forEach((o) => {
      if (o._id.toString() === order._id.toString()) return; // skip current invoice

      const oPaid = o.payments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0,
      );
      const oDue = o.grandTotal - oPaid;

      // Overdue check
      if (oDue > 0 && o.dueDate && new Date(o.dueDate) < now) {
        otherOverdueCount++;
      }

      // Late payment check (paid after due date)
      if (o.dueDate) {
        const dueDateObj = new Date(o.dueDate);
        const lastPaymentDate = o.payments.reduce(
          (latest: Date | null, p: any) => {
            if (!latest) return new Date(p.date);
            const pDate = new Date(p.date);
            return pDate > latest ? pDate : latest;
          },
          null as Date | null,
        );

        // If fully paid, but last payment was after due date
        if (oDue <= 0 && lastPaymentDate && lastPaymentDate > dueDateObj) {
          latePaymentsCount++;
        }
      }
    });

    // Deterministic priority and reasons
    const reasons: string[] = [];
    let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";

    reasons.push(`Outstanding amount is ₹${dueAmount.toLocaleString()}`);

    if (daysOverdue > 0) {
      reasons.push(`Invoice is ${daysOverdue} days overdue`);
    } else {
      reasons.push("Invoice is not yet overdue");
    }

    if (otherOverdueCount > 0) {
      reasons.push(
        `Customer has ${otherOverdueCount} other overdue invoice(s)`,
      );
    }

    if (latePaymentsCount > 0) {
      reasons.push(
        `Customer has paid late ${latePaymentsCount} time(s) in the past`,
      );
    }

    // Risk logic
    if (daysOverdue > 30) {
      priority = "HIGH";
      reasons.push("Critical: Overdue by more than 30 days");
    } else if (dueAmount > 50000 && daysOverdue > 14) {
      priority = "HIGH";
      reasons.push("Critical: Large amount overdue for over 14 days");
    } else if (
      daysOverdue > 7 &&
      (otherOverdueCount > 1 || latePaymentsCount > 1)
    ) {
      priority = "HIGH";
      reasons.push("Critical: Customer has poor payment track record");
    } else if (daysOverdue > 0) {
      priority = "MEDIUM";
      reasons.push("Warning: Invoice is past due");
    } else if (dueAmount > 20000) {
      priority = "MEDIUM";
      reasons.push("Warning: High outstanding amount");
    } else if (otherOverdueCount > 0 || latePaymentsCount > 0) {
      priority = "MEDIUM";
      reasons.push("Warning: Customer has past late payments or other dues");
    }

    results.push({
      invoiceNo: order.invoiceNo,
      invoiceDate: order.invoiceDate,
      dueDate: order.dueDate || null,
      grandTotal: order.grandTotal,
      paidAmount,
      dueAmount,
      daysOverdue,
      shop: {
        _id: shopIdStr,
        shopName: order.shop?.shopName || "Unknown Shop",
        ownerName: order.shop?.ownerName || "Unknown Owner",
        mobile: order.shop?.mobile,
      },
      priority,
      reasons,
    });
  }

  // Sort by priority (HIGH -> MEDIUM -> LOW) and then by dueAmount desc
  const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return results.sort((a, b) => {
    const weightA = priorityWeight[a.priority];
    const weightB = priorityWeight[b.priority];
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    return b.dueAmount - a.dueAmount;
  });
};
