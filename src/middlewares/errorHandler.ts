import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/error-handler";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    console.log(
      `AppError: ${req.method} ${req.path} - ${err.statusCode} ${err.message} - `,
    );
    return res.json({
      status: "error",
      message: err.message,
      statusCode: err.statusCode,
      ...(err.details && { details: err.details }),
    });
  }
  console.log("unhandled error: ", err);
  return res
    .status(500)
    .json({ error: "Something went wrong, please try again later." });
};
