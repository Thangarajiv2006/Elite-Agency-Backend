import { Router } from "express";
import { verifyAuth } from "../middlewares";
import { chatHandler } from "../controller/ai.controller";

const aiRouter = Router();

/**
 * AI COPILOT ROUTE
 * Base: /api/ai
 */
aiRouter.post("/chat", verifyAuth, chatHandler);

export default aiRouter;
