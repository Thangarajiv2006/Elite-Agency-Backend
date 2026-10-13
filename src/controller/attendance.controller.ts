import { Request, Response } from "express";
import Attendance from "../models/attendance.model";
import mongoose from "mongoose";

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { month, year } = req.query;
    const agencyId = (req as any).user?._id;

    if (!workerId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Worker ID, month and year are required",
      });
    }

    // Create date range for the month
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const attendance = await Attendance.find({
      workerId,
      agencyId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logAttendance = async (req: Request, res: Response) => {
  try {
    const { workerId, date, status, note } = req.body;
    const agencyId = (req as any).user?._id;

    if (!workerId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Worker ID, date and status are required",
      });
    }

    // Normalize date to midnight UTC
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (normalizedDate > today) {
      return res.status(400).json({
        success: false,
        message: "Cannot log attendance for future dates",
      });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { workerId, agencyId, date: normalizedDate },
      { status, note },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Attendance logged successfully",
      data: attendance,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
