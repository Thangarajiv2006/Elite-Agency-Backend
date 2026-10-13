import { Router } from "express";
import { getAttendance, logAttendance } from "../controller/attendance.controller";
import { verifyAuth } from "../middlewares/index";

const router = Router();

router.get("/:workerId", verifyAuth, getAttendance);
router.post("/", verifyAuth, logAttendance);

export default router;
