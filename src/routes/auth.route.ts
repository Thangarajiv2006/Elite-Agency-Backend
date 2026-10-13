import { Router } from "express";
import {
  createAgency,
  forgotPassword,
  login,
  sendForgotEmailOTP,
  signupRequest,
  updateProfile,
  verifyForgotOTP,
} from "../controller/auth.controller";
import { verifyAuth, verifyOTP } from "../middlewares";

const authRouter = Router();

authRouter.post("/register", signupRequest);
authRouter.post("/verify-otp-sign-up", verifyOTP, createAgency);
authRouter.post("/login", login);
authRouter.put("/update-profile", verifyAuth, updateProfile);
authRouter.post("/forgot-password/sendOTP", sendForgotEmailOTP);
authRouter.post("/forgot-password/verifyOTP", verifyOTP, verifyForgotOTP);
authRouter.put("/forgot-password", verifyOTP, forgotPassword);

export default authRouter;
