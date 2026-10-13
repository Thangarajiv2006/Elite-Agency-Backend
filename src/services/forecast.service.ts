import mongoose from "mongoose";
import Order from "../models/order.model";

interface HistoricalMonth {
  month: string; // YYYY-MM
  revenue: number;
}

export interface ForecastResult {
  predictedValue: number;
  historicalPeriod: string;
  method: string;
  confidenceOrDataQuality: "HIGH" | "MEDIUM" | "LOW";
  explanationData: {
    history: HistoricalMonth[];
    formulaUsed: string;
    details: string;
  };
}

/**
 * Programmatic forecasting service using historical monthly revenues.
 */
export const calculateForecast = async (
  createdBy: string,
): Promise<ForecastResult> => {
  // Fetch orders for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const pipeline: any[] = [
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(createdBy),
        invoiceDate: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$invoiceDate" } },
        revenue: { $sum: "$grandTotal" },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await Order.aggregate(pipeline).exec();
  const history: HistoricalMonth[] = results.map((r) => ({
    month: r._id,
    revenue: Math.round(r.revenue * 100) / 100,
  }));

  const N = history.length;

  if (N === 0) {
    return {
      predictedValue: 0,
      historicalPeriod: "No data available",
      method: "None",
      confidenceOrDataQuality: "LOW",
      explanationData: {
        history: [],
        formulaUsed: "N/A",
        details:
          "No historical sales records were found in the database for the last 6 months to construct a forecast.",
      },
    };
  }

  if (N === 1) {
    const val = history[0]!.revenue;
    return {
      predictedValue: val,
      historicalPeriod: `1 month (${history[0]!.month})`,
      method: "Naive Persistence",
      confidenceOrDataQuality: "LOW",
      explanationData: {
        history,
        formulaUsed: "Forecast = Last Month Revenue",
        details:
          "Only one month of historical data is available. The forecast persistently projects the same revenue value forward.",
      },
    };
  }

  if (N === 2) {
    // Weighted Moving Average for 2 months (60% weight on most recent, 40% on previous)
    const val1 = history[0]!.revenue;
    const val2 = history[1]!.revenue;
    const predictedValue = Math.round((val2 * 0.6 + val1 * 0.4) * 100) / 100;

    return {
      predictedValue,
      historicalPeriod: `2 months (${history[0]!.month} to ${history[1]!.month})`,
      method: "Weighted Moving Average (2M)",
      confidenceOrDataQuality: "LOW",
      explanationData: {
        history,
        formulaUsed: "Forecast = (Recent * 0.6) + (Previous * 0.4)",
        details:
          "A 2-month weighted moving average was calculated, prioritizing the most recent month's revenue.",
      },
    };
  }

  // Linear Regression Trend if N >= 3
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < N; i++) {
    const x = i + 1; // 1, 2, ..., N
    const y = history[i]!.revenue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = N * sumXX - sumX * sumX;
  let slope = 0;
  let intercept = 0;

  if (denominator !== 0) {
    slope = (N * sumXY - sumX * sumY) / denominator;
    intercept = (sumY - slope * sumX) / N;
  } else {
    intercept = sumY / N;
  }

  // Predict for next period (N + 1)
  const nextX = N + 1;
  let predictedValue = slope * nextX + intercept;
  if (predictedValue < 0) predictedValue = 0; // Revenue cannot be negative

  predictedValue = Math.round(predictedValue * 100) / 100;

  const confidenceOrDataQuality = N >= 5 ? "HIGH" : "MEDIUM";
  const formulaUsed = `y = ${slope.toFixed(2)} * x + ${intercept.toFixed(2)}`;

  return {
    predictedValue,
    historicalPeriod: `${N} months (${history[0]!.month} to ${history[N - 1]!.month})`,
    method: "Linear Regression Trend Line",
    confidenceOrDataQuality,
    explanationData: {
      history,
      formulaUsed,
      details: `Calculated using linear regression over ${N} data points. The trend line indicates a monthly change rate of ₹${slope.toFixed(2)} in revenue.`,
    },
  };
};
