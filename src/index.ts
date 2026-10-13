import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import path from "path";
import cors from "cors";
import { errorMiddleware } from "./middlewares/errorHandler";

const app = express();
app.use(cors());

const portValue = process.env.PORT;
const PORT = portValue ? Number(portValue) : 5000;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("Invalid PORT configuration");
}
app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING!)
  .then(() => console.log("Database connected successfully"))
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });

import authRouter from "./routes/auth.route";
import workerRouter from "./routes/worker.route";
import categoryRouter from "./routes/category.route";
import shopRouter from "./routes/shop.route";
import productRouter from "./routes/product.route";
import stockRouter from "./routes/stock.route";
import orderRouter from "./routes/order.route";
import analyticsRouter from "./routes/analytics.route";
import attendanceRouter from "./routes/attendance.route";
import aiRouter from "./routes/ai.route";

//routes
app.use("/api/auth", authRouter);
app.use("/api/worker", workerRouter);
app.use("/api/category", categoryRouter);
app.use("/api/shop", shopRouter);
app.use("/api/product", productRouter);
app.use("/api/stock", stockRouter);
app.use("/api/orders", orderRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/ai", aiRouter);
app.use(errorMiddleware);

app.use(express.static(path.join(__dirname, "./dist")));

app.get("/*path", (req, res) => {
  res.sendFile(path.join(__dirname, "./dist/index.html"));
});
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.on("error", console.error);
