import { NextFunction, Request, Response } from "express";
import { processAIChat } from "../services/ai.service";
import { ValidationError } from "../utils/error-handler";

/**
 * Dynamically generates relevant suggestions based on what tools were invoked
 */
const getDynamicSuggestions = (toolsUsed: string[]): string[] => {
  const suggestions = new Set<string>();

  if (
    toolsUsed.includes("getRevenue") ||
    toolsUsed.includes("compareRevenue")
  ) {
    suggestions.add("Forecast next month's cash flow");
    suggestions.add("Which products are performing best?");
    suggestions.add("Which invoices need attention?");
  }

  if (toolsUsed.includes("getStockSummary")) {
    suggestions.add("Which products are performing best?");
    suggestions.add("Forecast next month's cash flow");
    suggestions.add("Give me a financial summary");
  }

  if (
    toolsUsed.includes("getOutstandingPayments") ||
    toolsUsed.includes("getInvoiceSummary")
  ) {
    suggestions.add("Give me a financial summary");
    suggestions.add("Analyze my revenue");
    suggestions.add("What products should I restock?");
  }

  // Always fill up to 3-4 suggestions
  const defaults = [
    "Analyze my revenue",
    "Which invoices need attention?",
    "What products should I restock?",
    "Forecast next month's cash flow",
  ];

  for (const d of defaults) {
    if (suggestions.size >= 4) break;
    suggestions.add(d);
  }

  return Array.from(suggestions);
};

export const chatHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = `req-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = Date.now();

  try {
    const { message, context = {}, history = [] } = req.body;
    const createdBy = (req as any).user;

    if (!message || typeof message !== "string") {
      throw new ValidationError("Message string is required");
    }

    if (!createdBy) {
      throw new ValidationError("Unauthorized. Active user session required.");
    }

    // Validate context dates
    if (context.startDate && isNaN(Date.parse(context.startDate))) {
      throw new ValidationError("Invalid context.startDate format");
    }
    if (context.endDate && isNaN(Date.parse(context.endDate))) {
      throw new ValidationError("Invalid context.endDate format");
    }

    console.log(
      `[AI-CHAT][${requestId}] Started for user: ${createdBy}. Message: "${message}"`,
    );

    // Call AI orchestration
    const result = await processAIChat(
      message,
      {
        startDate: context.startDate,
        endDate: context.endDate,
      },
      history,
      createdBy,
      requestId,
    );

    const suggestions = getDynamicSuggestions(result.toolsUsed);
    const duration = Date.now() - startTime;

    console.log(
      `[AI-CHAT][${requestId}] Completed successfully in ${duration}ms. Tools: [${result.toolsUsed.join(
        ", ",
      )}]`,
    );

    return res.status(200).json({
      success: true,
      answer: result.answer,
      toolsUsed: result.toolsUsed,
      data: result.data,
      suggestions,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      `[AI-CHAT][${requestId}] Failed in ${duration}ms:`,
      error.message,
    );
    next(error);
  }
};
