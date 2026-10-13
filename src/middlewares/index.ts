import { NextFunction, Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import { AuthenticationError, ValidationError } from "../utils/error-handler";

declare global {
  namespace Express {
    interface Request {
      user?: any; // Define the user property type as needed
    }
  }
}

export const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]!;
    const data = jsonwebtoken.verify(
      token,
      process.env.JWT_AUTH_SECRET!,
    ) as any;

    req.user = data.user;
    next();
  } catch (e) {
    return next(new AuthenticationError("Token Expired"));
  }
};

export const verifyOTP = (req: Request, res: Response, next: NextFunction) => {
  const { token, otp, email } = req.body;
  try {
    const data = jsonwebtoken.verify(token, process.env.JWT_OTP_SECRET!) as {
      email: string;
      otp: string;
    };
    console.log(data);
    if (data.otp !== otp || data.email !== email) {
      return next(new ValidationError("Invalid OTP"));
    }
    next();
  } catch (e) {
    return next(new ValidationError("OTP Expired or Invalid"));
  }
};
