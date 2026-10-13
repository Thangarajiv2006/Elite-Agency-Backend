import { Router } from "express";
import { verifyAuth } from "../middlewares";
import {
  createShop,
  deleteShop,
  getShop,
  updateShop,
} from "../controller/shop.controller";

const shopRouter = Router();

shopRouter.get("/", verifyAuth, getShop);
shopRouter.post("/", verifyAuth, createShop);
shopRouter.put("/", verifyAuth, updateShop);
shopRouter.delete("/:id", verifyAuth, deleteShop);

export default shopRouter;
