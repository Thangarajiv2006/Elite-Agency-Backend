import { Router } from "express";
import { verifyAuth } from "../middlewares";
import {
  createWorker,
  deleteWorker,
  getWorker,
  updateWorker,
} from "../controller/worker.controller";

const workerRouter = Router();

workerRouter.get("/", verifyAuth, getWorker);
workerRouter.post("/", verifyAuth, createWorker);
workerRouter.put("/", verifyAuth, updateWorker);
workerRouter.delete("/:id", verifyAuth, deleteWorker);

export default workerRouter;
