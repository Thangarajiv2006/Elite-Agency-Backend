import { Router } from "express";
import { verifyAuth } from "../middlewares";
import {
  createCategoryStock,
  getCategoryStock,
} from "../controller/stock.controller";

const stockRouter = Router();

stockRouter.post("/category", verifyAuth, createCategoryStock);
stockRouter.get("/category/:categoryId", verifyAuth, getCategoryStock);

export default stockRouter;
