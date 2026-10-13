import * as financeService from "./finance.service";
import * as forecastService from "./forecast.service";

interface ChatMessage {
  role: "user" | "model" | "function";
  parts: any[];
}

const TOOLS_DECLARATION = [
  {
    functionDeclarations: [
      {
        name: "getRevenue",
        description:
          "Retrieve total revenue and a breakdown for a specified date range.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "compareRevenue",
        description:
          "Compare revenue of the specified period against the previous equivalent period. Calculates percentage growth/decline.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "getInvoiceSummary",
        description:
          "Get summaries of paid, unpaid, and partially paid invoices for a date range.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "getOutstandingPayments",
        description:
          "Fetch outstanding unpaid or partial invoices requiring attention, along with risk priority (HIGH/MEDIUM/LOW) and reasons.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "getTopProducts",
        description:
          "Retrieve top-selling products by quantity and revenue during a date range.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
            limit: {
              type: "INTEGER",
              description:
                "Maximum number of products to return (default is 10)",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "getStockSummary",
        description:
          "Retrieve current product inventory overview (total, low stock, out of stock, list of products to restock). Does not require date range.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "getCustomerInsights",
        description:
          "Get customer analytics (total, new, and repeat customers) for a date range.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "getFinancialSummary",
        description:
          "Retrieve a consolidated summary of revenue, invoices, top products, stock level, and customers.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "STRING", description: "End date (YYYY-MM-DD)" },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "getForecast",
        description:
          "Forecast next month's cash flow/revenue based on historical sales data using explainable models.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `You are "Elite AI", the intelligent Finance Controller for Elite Agency.
Your primary role is to help the business owner understand their financial, invoice, and operational data.

RULES:
1. You MUST rely EXCLUSIVELY on the data retrieved from your backend tools. Never invent, guess, or hallucinate revenue, invoice counts, outstanding amounts, stock quantities, customer information, percentages, or any other numbers.
2. ALWAYS use the user's provided date range context (e.g. from the dashboard) as the default arguments for tool calls, unless they specify a different period.
3. Be transparent about your sources. At the end of your response, output a bulleted list of tools used, formatted like:
   Sources used:
   * [Source Name]
4. Do NOT fabricate missing database fields. If data is unavailable, explain this limitation.
5. You are strictly a READ-ONLY assistant. You cannot modify, delete, or create invoices, orders, stock, or customer profiles.
6. Present financial metrics beautifully. Use Currency symbol (₹) for money, percentage changes, bold text, and clean formatting where possible.
7. Keep responses concise. Focus on key insights. Provide actionable takeaways (e.g., pointing out a high-risk overdue invoice or low-stock items).`;

/**
 * Executes a specific tool by name with validated arguments
 */
const executeTool = async (
  name: string,
  args: any,
  createdBy: string,
  requestId: string,
): Promise<any> => {
  const startTime = Date.now();
  console.log(
    `[AI-CHAT][${requestId}] Invoking tool: ${name} with args:`,
    JSON.stringify(args),
  );

  let result: any;
  try {
    switch (name) {
      case "getRevenue":
        result = await financeService.getRevenue(
          args.startDate,
          args.endDate,
          createdBy,
        );
        break;
      case "compareRevenue":
        result = await financeService.compareRevenue(
          args.startDate,
          args.endDate,
          createdBy,
        );
        break;
      case "getInvoiceSummary":
        result = await financeService.getInvoiceSummary(
          args.startDate,
          args.endDate,
          createdBy,
        );
        break;
      case "getOutstandingPayments":
        result = await financeService.getOutstandingPayments(
          args.startDate,
          args.endDate,
          createdBy,
        );
        break;
      case "getTopProducts":
        result = await financeService.getTopProducts(
          args.startDate,
          args.endDate,
          args.limit || 10,
          createdBy,
        );
        break;
      case "getStockSummary":
        result = await financeService.getStockSummary(createdBy);
        break;
      case "getCustomerInsights":
        result = await financeService.getCustomerInsights(
          args.startDate,
          args.endDate,
          createdBy,
        );
        break;
      case "getFinancialSummary":
        result = await financeService.getFinancialSummary(
          args.startDate,
          args.endDate,
          createdBy,
        );
        break;
      case "getForecast":
        result = await forecastService.calculateForecast(createdBy);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[AI-CHAT][${requestId}] Tool: ${name} completed successfully in ${duration}ms`,
    );
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      `[AI-CHAT][${requestId}] Tool: ${name} failed in ${duration}ms:`,
      error.message,
    );
    throw error;
  }
};

/**
 * Handles chat interaction with Gemini, managing tool calls automatically.
 */
export const processAIChat = async (
  userMessage: string,
  context: { startDate?: string; endDate?: string },
  history: ChatMessage[],
  createdBy: string,
  requestId: string,
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Please add it to your .env file.",
    );
  }

  // Build model contents history
  // If the user's message needs a date context, append it as system advice in prompt or ground context
  const groundPrompt = `User message: "${userMessage}"
Default date context from dashboard: ${context.startDate || "N/A"} to ${context.endDate || "N/A"}. Use this date range for your queries unless specified otherwise.`;

  const contents: any[] = [];

  // Add past history mapping roles properly to gemini format
  for (const h of history) {
    contents.push({
      role:
        h.role === "user"
          ? "user"
          : h.role === "function"
            ? "function"
            : "model",
      parts: h.parts,
    });
  }

  // Push new user turn
  contents.push({
    role: "user",
    parts: [{ text: groundPrompt }],
  });

  const toolsUsed: string[] = [];
  const rawData: Record<string, any> = {};
  let turns = 0;
  const maxTurns = 5;

  while (turns < maxTurns) {
    turns++;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      tools: TOOLS_DECLARATION,
      generationConfig: {
        temperature: 0.1, // Low temperature for high deterministic grounding
      },
    };

    const startTime = Date.now();
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const latency = Date.now() - startTime;
    console.log(
      `[AI-CHAT][${requestId}] Gemini API request completed in ${latency}ms`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API Error (status ${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as any;
    const candidate = data.candidates?.[0];
    const message = candidate?.content;

    if (!message) {
      throw new Error("Invalid response received from Gemini API");
    }

    const parts = message.parts || [];
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      // No function calls, this is the final answer!
      const answer = parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join("\n");
      return {
        answer,
        toolsUsed: Array.from(new Set(toolsUsed)),
        data: rawData,
      };
    }

    // Process parallel function calls
    const toolResultParts: any[] = [];
    const modelParts: any[] = [];

    for (const part of parts) {
      if (part.functionCall) {
        const { name, args } = part.functionCall;
        toolsUsed.push(name);
        modelParts.push(part);

        try {
          const result = await executeTool(name, args, createdBy, requestId);
          rawData[name] = result;

          toolResultParts.push({
            functionResponse: {
              name,
              response: {
                content: result,
              },
            },
          });
        } catch (err: any) {
          toolResultParts.push({
            functionResponse: {
              name,
              response: {
                content: { error: err.message || "Failed to execute tool" },
              },
            },
          });
        }
      } else {
        modelParts.push(part);
      }
    }

    // Append model's output turn
    contents.push({
      role: "model",
      parts: modelParts,
    });

    // Append function's response turn
    contents.push({
      role: "function",
      parts: toolResultParts,
    });
  }

  throw new Error(
    "AI reached maximum function call iterations without producing an answer",
  );
};
