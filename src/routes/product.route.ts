import { Router } from "express";
import { verifyAuth } from "../middlewares";
import {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
} from "../controller/product.controller";

const productRouter = Router();

productRouter.get("/", verifyAuth, getProduct);
productRouter.post("/", verifyAuth, createProduct);
productRouter.put("/", verifyAuth, updateProduct);
productRouter.delete("/:id", verifyAuth, deleteProduct);

export default productRouter;
