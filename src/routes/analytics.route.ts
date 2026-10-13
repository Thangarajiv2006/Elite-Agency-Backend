import { Router } from "express";
import {
  getRevenueAnalyticsHandler,
  getTopProductsHandler,
  getCustomerInsightsHandler,
  getPaymentDistributionHandler,
  getInvoiceStatusHandler,
  getSalesByTimeHandler,
  getRecentInvoicesHandler,
} from "../controller/analytics.controller";

const analyticsRouter = Router();

/**
 * ANALYTICS ROUTES
 * Base: /api/analytics
 */
analyticsRouter.get("/revenue", getRevenueAnalyticsHandler);
analyticsRouter.get("/top-products", getTopProductsHandler);
analyticsRouter.get("/customers", getCustomerInsightsHandler);
analyticsRouter.get("/payments", getPaymentDistributionHandler);
analyticsRouter.get("/status", getInvoiceStatusHandler);
analyticsRouter.get("/sales-time", getSalesByTimeHandler);
analyticsRouter.get("/recent", getRecentInvoicesHandler);

export default analyticsRouter;
