import { Router } from "express";
import { verifyAuth } from "../middlewares";
import {
  createOrderHandler,
  addPaymentHandler,
  getOrdersHandler,
  getOrderHandler,
  getOrderLedgerHandler,
} from "../controller/order.controller";

const orderRouter = Router();

/**
 * ORDER ROUTES
 * Base: /api/orders
 */

// GET all orders with filters and pagination
orderRouter.get("/", verifyAuth, getOrdersHandler);

// GET single order by ID
orderRouter.get("/:id", verifyAuth, getOrderHandler);

// GET order payment ledger
orderRouter.get("/:id/ledger", verifyAuth, getOrderLedgerHandler);

// CREATE new order
orderRouter.post("/", verifyAuth, createOrderHandler);

// ADD payment to order
orderRouter.patch("/:id/payment", verifyAuth, addPaymentHandler);

export default orderRouter;
