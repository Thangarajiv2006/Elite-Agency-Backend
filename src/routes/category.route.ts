import { Router } from "express";
import { verifyAuth } from "../middlewares";
import {
  createCategory,
  getCategories,
  deleteCategory,
} from "../controller/category.controller";

const categoryRouter = Router();

categoryRouter.get("/", verifyAuth, getCategories);
categoryRouter.post("/", verifyAuth, createCategory);
categoryRouter.delete("/:id", verifyAuth, deleteCategory);

export default categoryRouter;
